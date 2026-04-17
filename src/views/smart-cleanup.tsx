import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useCleanupStore } from '../stores/cleanup-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { StatCard } from '../components/common/stat-card.js';
import { SectionHeader } from '../components/common/section-header.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t } from '../i18n/index.js';

export function SmartCleanupView() {
  const { summary, selected, loading, error, analyze, toggleSelect, selectAll } = useCleanupStore();
  const [cursor, setCursor] = useState(0);
  const [confirmClean, setConfirmClean] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const stream = useBrewStream();
  const hasRefreshed = useRef(false);

  useEffect(() => { analyze(); }, []);

  useEffect(() => {
    if (!stream.isRunning && !stream.error && stream.lines.length > 0 && !hasRefreshed.current) {
      hasRefreshed.current = true;
      void analyze();
    }
  }, [stream.isRunning, stream.error]);

  const candidates = summary?.candidates ?? [];

  const isDependencyError = stream.error != null &&
    stream.lines.some((l) => l.includes('Refusing to uninstall') || l.includes('required by'));

  useInput((input, key) => {
    if (stream.isRunning) {
      if (key.escape) stream.cancel();
      return;
    }
    if (confirmClean || confirmForce) return;

    // After a dependency error, offer F to force
    if (input === 'F' && isDependencyError && failedNames.length > 0) {
      setConfirmForce(true);
      return;
    }

    if (input === 'r') { stream.clear(); setFailedNames([]); void analyze(); return; }
    if (key.return && candidates[cursor]) {
      toggleSelect(candidates[cursor].name);
      return;
    }
    if (input === 'a') { selectAll(); return; }
    if (input === 'c' && selected.size > 0) { setConfirmClean(true); return; }

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, Math.max(0, candidates.length - 1)));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
  });

  if (loading) return <Loading message={t('loading_cleanup')} />;
  if (error) return <ErrorMessage message={error} />;

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog lines={stream.lines} isRunning={stream.isRunning} title={t('cleanup_cleaning')} />
        {stream.isRunning && (
          <Text color="#6B7280">esc:{t('hint_cancel')}</Text>
        )}

        {!stream.isRunning && !stream.error && (
          <Box borderStyle="round" borderColor="#22C55E" paddingX={2} paddingY={0}>
            <Text color="#22C55E" bold>{'\u2714'} {t('cleanup_complete')}</Text>
          </Box>
        )}

        {!stream.isRunning && stream.error && (
          <Box flexDirection="column" gap={1}>
            <Box borderStyle="round" borderColor="#EF4444" paddingX={2} paddingY={0}>
              <Text color="#EF4444" bold>{'\u2718'} {t('cleanup_depError')}</Text>
            </Box>
            {isDependencyError && failedNames.length > 0 && (
              <Text color="#F59E0B">
                F:{t('hint_force')} r:{t('hint_refresh')}
              </Text>
            )}
          </Box>
        )}

        {confirmForce && (
          <Box marginY={1}>
            <ConfirmDialog
              message={t('cleanup_confirmForce', { count: failedNames.length })}
              onConfirm={() => {
                setConfirmForce(false);
                hasRefreshed.current = false;
                stream.clear();
                void stream.run(['uninstall', '--ignore-dependencies', ...failedNames]);
              }}
              onCancel={() => setConfirmForce(false)}
            />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F9F9}'} title={t('cleanup_title')} gradient={GRADIENTS.emerald} />

      {summary && (
        <Box gap={1} marginY={1}>
          <StatCard label={t('cleanup_orphans')} value={candidates.length} color={candidates.length > 0 ? '#F59E0B' : '#22C55E'} />
          <StatCard label={t('cleanup_reclaimable')} value={summary.totalReclaimableFormatted} color="#38BDF8" />
          <StatCard label={t('cleanup_selected')} value={selected.size} color={selected.size > 0 ? '#22C55E' : '#6B7280'} />
        </Box>
      )}

      {confirmClean && (
        <Box marginY={1}>
          <ConfirmDialog
            message={t('cleanup_confirmUninstall', { count: selected.size })}
            onConfirm={() => {
              setConfirmClean(false);
              hasRefreshed.current = false;
              const names = Array.from(selected);
              setFailedNames(names);
              void stream.run(['uninstall', ...names]);
            }}
            onCancel={() => setConfirmClean(false)}
          />
        </Box>
      )}

      {candidates.length === 0 && !confirmClean && (
        <Box borderStyle="round" borderColor="#22C55E" paddingX={2} paddingY={0}>
          <Text color="#22C55E" bold>{'\u2714'} {t('cleanup_systemClean')}</Text>
        </Box>
      )}

      {candidates.length > 0 && !confirmClean && (
        <Box flexDirection="column">
          {candidates.map((c, i) => {
            const isCurrent = i === cursor;
            const isSelected = selected.has(c.name);
            return (
              <Box key={c.name} gap={1}>
                <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
                <Text color={isSelected ? '#22C55E' : '#9CA3AF'}>{isSelected ? '\u2611' : '\u2610'}</Text>
                <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? '#F9FAFB' : '#9CA3AF'}>{c.name}</Text>
                <Text color="#F59E0B">{c.diskUsageFormatted}</Text>
                <Text color="#6B7280">[{c.reason}]</Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="#F9FAFB" bold>
              {cursor + 1}/{candidates.length}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
