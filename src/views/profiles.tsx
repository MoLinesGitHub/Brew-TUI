import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useProfileStore } from '../stores/profile-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading } from '../components/common/loading.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ProgressLog } from '../components/common/progress-log.js';
import * as manager from '../lib/profiles/profile-manager.js';

type Mode = 'list' | 'detail' | 'create-name' | 'create-desc' | 'importing';

export function ProfilesView() {
  const { profileNames, selectedProfile, loading, fetchProfiles, loadProfile, exportCurrent, deleteProfile } = useProfileStore();
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importLines, setImportLines] = useState<string[]>([]);
  const [importRunning, setImportRunning] = useState(false);

  useEffect(() => { fetchProfiles(); }, []);

  useInput((input, key) => {
    if (mode !== 'list' || confirmDelete) return;

    if (input === 'n') { setMode('create-name'); return; }
    if (input === 'd' && profileNames[cursor]) { setConfirmDelete(true); return; }
    if (key.return && profileNames[cursor]) {
      loadProfile(profileNames[cursor]);
      setMode('detail');
      return;
    }
    if (input === 'i' && profileNames[cursor]) {
      startImport(profileNames[cursor]);
      return;
    }

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, profileNames.length - 1));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
  });

  useInput((_input, key) => {
    if (mode === 'detail' && key.escape) {
      setMode('list');
    }
  });

  const startImport = async (name: string) => {
    setMode('importing');
    setImportLines([]);
    setImportRunning(true);
    try {
      const profile = await manager.loadProfile(name);
      for await (const line of manager.importProfile(profile)) {
        setImportLines((prev) => [...prev.slice(-99), line]);
      }
    } catch (err) {
      setImportLines((prev) => [...prev, `Error: ${err instanceof Error ? err.message : err}`]);
    } finally {
      setImportRunning(false);
    }
  };

  if (loading) return <Loading message="Loading profiles..." />;

  if (mode === 'importing') {
    return (
      <Box flexDirection="column">
        <ProgressLog lines={importLines} isRunning={importRunning} title="Importing profile..." />
        {!importRunning && (
          <Box marginTop={1}>
            <Text color="green" bold>{'\u2714'} Import complete. Press any key.</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (mode === 'create-name') {
    return (
      <Box flexDirection="column">
        <Text bold>Create Profile — Name:</Text>
        <TextInput
          placeholder="e.g. work, personal, project-x"
          onSubmit={(val) => { setNewName(val); setMode('create-desc'); }}
        />
      </Box>
    );
  }

  if (mode === 'create-desc') {
    return (
      <Box flexDirection="column">
        <Text bold>Create Profile "{newName}" — Description:</Text>
        <TextInput
          placeholder="Brief description of this setup"
          onSubmit={async (val) => {
            setNewDesc(val);
            await exportCurrent(newName, val);
            setMode('list');
            setNewName('');
            setNewDesc('');
          }}
        />
      </Box>
    );
  }

  if (mode === 'detail' && selectedProfile) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">{selectedProfile.name}</Text>
        <Text color="gray">{selectedProfile.description}</Text>
        <Text color="gray">Created: {new Date(selectedProfile.createdAt).toLocaleDateString()}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text bold>Formulae ({selectedProfile.formulae.length})</Text>
          <Box paddingLeft={2} flexDirection="column">
            {selectedProfile.formulae.slice(0, 30).map((f) => (
              <Text key={f} color="gray">{f}</Text>
            ))}
            {selectedProfile.formulae.length > 30 && (
              <Text color="gray" italic>...and {selectedProfile.formulae.length - 30} more</Text>
            )}
          </Box>
          <Text bold>Casks ({selectedProfile.casks.length})</Text>
          <Box paddingLeft={2} flexDirection="column">
            {selectedProfile.casks.map((c) => (
              <Text key={c} color="gray">{c}</Text>
            ))}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">esc:back i:import this profile</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{'\u{1F4C1}'} Package Profiles ({profileNames.length})</Text>

      {confirmDelete && profileNames[cursor] && (
        <Box marginY={1}>
          <ConfirmDialog
            message={`Delete profile "${profileNames[cursor]}"?`}
            onConfirm={() => { deleteProfile(profileNames[cursor]); setConfirmDelete(false); }}
            onCancel={() => setConfirmDelete(false)}
          />
        </Box>
      )}

      {profileNames.length === 0 && !confirmDelete && (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray" italic>No profiles saved yet.</Text>
          <Text color="gray">Press <Text color="cyan" bold>n</Text> to export your current setup as a profile.</Text>
        </Box>
      )}

      {profileNames.length > 0 && !confirmDelete && (
        <Box flexDirection="column" marginTop={1}>
          {profileNames.map((name, i) => {
            const isCurrent = i === cursor;
            return (
              <Box key={name} gap={1}>
                <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
                <Text bold={isCurrent}>{name}</Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="gray">{cursor + 1}/{profileNames.length} {'\u2502'} n:new enter:details i:import d:delete</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
