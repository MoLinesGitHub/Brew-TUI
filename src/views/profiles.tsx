import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useProfileStore } from '../stores/profile-store.js';
import { Loading } from '../components/common/loading.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { SectionHeader } from '../components/common/section-header.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t } from '../i18n/index.js';
import { useModalStore } from '../stores/modal-store.js';
import * as manager from '../lib/profiles/profile-manager.js';

type Mode = 'list' | 'detail' | 'create-name' | 'create-desc' | 'importing';

export function ProfilesView() {
  const { profileNames, selectedProfile, loading, loadError, fetchProfiles, loadProfile, exportCurrent, deleteProfile } = useProfileStore();
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importLines, setImportLines] = useState<string[]>([]);
  const [importRunning, setImportRunning] = useState(false);
  const { openModal, closeModal } = useModalStore();
  // Holds the active import generator so it can be cancelled on unmount,
  // which terminates the underlying brew child process via streamBrew's finally block.
  const importGenRef = useRef<AsyncGenerator<string> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { fetchProfiles(); }, []);

  // Cancel any in-flight import when this view unmounts.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      importGenRef.current?.return(undefined);
      importGenRef.current = null;
    };
  }, []);

  // Suppress global keys while in any sub-panel so Escape/q/numbers don't
  // navigate away while the user is typing a name, typing a description,
  // viewing detail, or watching an import stream.
  useEffect(() => {
    if (mode === 'detail' || mode === 'create-name' || mode === 'create-desc' || mode === 'importing') {
      openModal();
      return () => { closeModal(); };
    }
    return undefined;
  }, [mode]);

  useInput((input, key) => {
    if (mode !== 'list' || confirmDelete) return;

    if (input === 'n') { setMode('create-name'); return; }
    if (input === 'd' && profileNames[cursor]) { setConfirmDelete(true); return; }
    if (key.return && profileNames[cursor]) {
      void loadProfile(profileNames[cursor]);
      setMode('detail');
      return;
    }
    if (input === 'i' && profileNames[cursor]) {
      void startImport(profileNames[cursor]);
      return;
    }

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, Math.max(0, profileNames.length - 1)));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
  });

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      setMode('list');
    }
  }, { isActive: mode === 'detail' });

  const startImport = async (name: string) => {
    setMode('importing');
    setImportLines([]);
    setImportRunning(true);
    try {
      const profile = await manager.loadProfile(name);
      const gen = manager.importProfile(profile);
      importGenRef.current = gen;
      for await (const line of gen) {
        if (!mountedRef.current) break;
        setImportLines((prev) => [...prev.slice(-99), line]);
      }
    } catch (err) {
      if (mountedRef.current) {
        setImportLines((prev) => [...prev, `${t('error_prefix')}${err instanceof Error ? err.message : err}`]);
      }
    } finally {
      importGenRef.current = null;
      if (mountedRef.current) {
        setImportRunning(false);
      }
    }
  };

  if (loading) return <Loading message={t('loading_profiles')} />;

  if (mode === 'importing') {
    return (
      <Box flexDirection="column">
        <ProgressLog lines={importLines} isRunning={importRunning} title={t('profiles_importTitle')} />
        {!importRunning && (
          <Box marginTop={1}>
            <Box borderStyle="round" borderColor="#22C55E" paddingX={2} paddingY={0}>
              <Text color="#22C55E" bold>{'\u2714'} {t('profiles_importComplete')}</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  if (mode === 'create-name') {
    return (
      <Box flexDirection="column">
        <Text bold>{t('profiles_createName')}</Text>
        <TextInput
          placeholder={t('profiles_namePlaceholder')}
          onSubmit={(val) => { setNewName(val); setMode('create-desc'); }}
        />
      </Box>
    );
  }

  if (mode === 'create-desc') {
    return (
      <Box flexDirection="column">
        <Text bold>{t('profiles_createDesc', { name: newName })}</Text>
        {loadError && <Text color="#EF4444">{t('error_prefix')}{loadError}</Text>}
        <TextInput
          placeholder={t('profiles_descPlaceholder')}
          onSubmit={async (val) => {
            try {
              await exportCurrent(newName, val);
            } finally {
              setMode('list');
              setNewName('');
            }
          }}
        />
      </Box>
    );
  }

  if (mode === 'detail' && selectedProfile) {
    return (
      <Box flexDirection="column">
        <Text bold color="#FFD700">{selectedProfile.name}</Text>
        <Text color="#9CA3AF">{selectedProfile.description}</Text>
        <Text color="#9CA3AF">{t('profiles_created', { date: new Date(selectedProfile.createdAt).toLocaleDateString() })}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text bold>{t('profiles_formulaeCount', { count: selectedProfile.formulae.length })}</Text>
          <Box paddingLeft={2} flexDirection="column">
            {selectedProfile.formulae.slice(0, 30).map((f) => (
              <Text key={f} color="#9CA3AF">{f}</Text>
            ))}
            {selectedProfile.formulae.length > 30 && (
              <Text color="#6B7280" italic>{t('common_andMore', { count: selectedProfile.formulae.length - 30 })}</Text>
            )}
          </Box>
          <Text bold>{t('profiles_casksCount', { count: selectedProfile.casks.length })}</Text>
          <Box paddingLeft={2} flexDirection="column">
            {selectedProfile.casks.map((c) => (
              <Text key={c} color="#9CA3AF">{c}</Text>
            ))}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="#6B7280">esc:{t('hint_back')} i:{t('hint_importProfile')}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F4C1}'} title={t('profiles_title', { count: profileNames.length })} gradient={GRADIENTS.gold} />

      {confirmDelete && profileNames[cursor] && (
        <Box marginY={1}>
          <ConfirmDialog
            message={t('profiles_confirmDelete', { name: profileNames[cursor] })}
            onConfirm={() => { void deleteProfile(profileNames[cursor]); setConfirmDelete(false); }}
            onCancel={() => setConfirmDelete(false)}
          />
        </Box>
      )}

      {profileNames.length === 0 && !confirmDelete && (
        <Box marginTop={1} borderStyle="round" borderColor="#6B7280" paddingX={2} paddingY={0}>
          <Box flexDirection="column">
            <Text color="#6B7280" italic>{t('profiles_noProfiles')}</Text>
            <Text color="#9CA3AF">{t('profiles_press')} <Text color="#FFD700" bold>n</Text> {t('profiles_exportHint')}</Text>
          </Box>
        </Box>
      )}

      {profileNames.length > 0 && !confirmDelete && (
        <Box flexDirection="column" marginTop={1}>
          {profileNames.map((name, i) => {
            const isCurrent = i === cursor;
            return (
              <Box key={name} gap={1}>
                <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
                <Text bold={isCurrent} inverse={isCurrent}>{name}</Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="#F9FAFB" bold>{cursor + 1}/{profileNames.length}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
