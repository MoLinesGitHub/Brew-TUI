import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useCleanupStore } from '../stores/cleanup-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading } from '../components/common/loading.js';
import { ErrorMessage } from '../components/common/loading.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { StatCard } from '../components/common/stat-card.js';

export function SmartCleanupView() {
  const { summary, selected, loading, error, analyze, toggleSelect, selectAll, deselectAll } = useCleanupStore();
  const [cursor, setCursor] = useState(0);
  const [confirmClean, setConfirmClean] = useState(false);
  const stream = useBrewStream();

  useEffect(() => { analyze(); }, []);

  const candidates = summary?.candidates ?? [];

  useInput((input, key) => {
    if (confirmClean || stream.isRunning) return;

    if (input === 'r') { analyze(); return; }
    if (key.return && candidates[cursor]) {
      toggleSelect(candidates[cursor].name);
      return;
    }
    if (input === 'a') { selectAll(); return; }
    if (input === 'c' && selected.size > 0) { setConfirmClean(true); return; }

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, candidates.length - 1));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
  });

  if (loading) return <Loading message="Analyzing packages... (checking disk usage)" />;
  if (error) return <ErrorMessage message={error} />;

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog lines={stream.lines} isRunning={stream.isRunning} title="Cleaning up..." />
        {!stream.isRunning && (
          <Text color="green" bold>{'\u2714'} Cleanup complete! Press r to re-analyze.</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{'\u{1F9F9}'} Smart Cleanup</Text>

      {summary && (
        <Box gap={1} marginY={1}>
          <StatCard label="Orphans" value={candidates.length} color={candidates.length > 0 ? 'yellow' : 'green'} />
          <StatCard label="Reclaimable" value={summary.totalReclaimableFormatted} color="cyan" />
          <StatCard label="Selected" value={selected.size} color={selected.size > 0 ? 'green' : 'gray'} />
        </Box>
      )}

      {confirmClean && (
        <Box marginY={1}>
          <ConfirmDialog
            message={`Uninstall ${selected.size} packages?`}
            onConfirm={() => {
              setConfirmClean(false);
              const names = Array.from(selected);
              stream.run(['uninstall', ...names]);
            }}
            onCancel={() => setConfirmClean(false)}
          />
        </Box>
      )}

      {candidates.length === 0 && !confirmClean && (
        <Text color="green" bold>{'\u2714'} No orphaned packages found. Your system is clean!</Text>
      )}

      {candidates.length > 0 && !confirmClean && (
        <Box flexDirection="column">
          {candidates.map((c, i) => {
            const isCurrent = i === cursor;
            const isSelected = selected.has(c.name);
            return (
              <Box key={c.name} gap={1}>
                <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
                <Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '\u2611' : '\u2610'}</Text>
                <Text bold={isCurrent} color={isCurrent ? 'white' : 'gray'}>{c.name}</Text>
                <Text color="yellow">{c.diskUsageFormatted}</Text>
                <Text color="gray">[{c.reason}]</Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text color="gray">
              {cursor + 1}/{candidates.length} {'\u2502'} enter:toggle a:all c:clean r:refresh
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
