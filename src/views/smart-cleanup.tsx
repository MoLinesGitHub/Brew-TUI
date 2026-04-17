import React, { useEffect, useState } from 'react';
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
  const stream = useBrewStream();

  useEffect(() => { analyze(); }, []);

  const candidates = summary?.candidates ?? [];

  useInput((input, key) => {
    if (confirmClean || stream.isRunning) return;

    if (input === 'r') { void analyze(); return; }
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
        {!stream.isRunning && (
          <Box borderStyle="round" borderColor={stream.error ? '#EF4444' : '#22C55E'} paddingX={2} paddingY={0}>
            <Text color={stream.error ? '#EF4444' : '#22C55E'} bold>
              {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('cleanup_complete')}`}
            </Text>
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
              const names = Array.from(selected);
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
