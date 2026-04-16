import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading } from '../components/common/loading.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';

export function OutdatedView() {
  const { outdated, loading, fetchOutdated } = useBrewStore();
  const stream = useBrewStream();
  const [cursor, setCursor] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{ type: 'single' | 'all'; name?: string } | null>(null);

  useEffect(() => { fetchOutdated(); }, []);

  const allOutdated = [...outdated.formulae, ...outdated.casks];

  useInput((input, key) => {
    if (confirmAction || stream.isRunning) return;

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, allOutdated.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (key.return && allOutdated[cursor]) {
      setConfirmAction({ type: 'single', name: allOutdated[cursor].name });
    } else if (input === 'A' && allOutdated.length > 0) {
      setConfirmAction({ type: 'all' });
    } else if (input === 'r') {
      fetchOutdated();
    }
  });

  if (loading.outdated) return <Loading message="Checking for outdated packages..." />;

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog
          lines={stream.lines}
          isRunning={stream.isRunning}
          title="Upgrading..."
        />
        {!stream.isRunning && (
          <Box marginTop={1}>
            <Text color={stream.error ? 'red' : 'green'} bold>
              {stream.error ? `\u2718 ${stream.error}` : '\u2714 Upgrade complete!'}
            </Text>
            <Text color="gray"> (press r to refresh)</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">{'\u{1F4E6}'} Outdated Packages ({allOutdated.length})</Text>

      {confirmAction && (
        <Box marginY={1}>
          <ConfirmDialog
            message={
              confirmAction.type === 'all'
                ? `Upgrade all ${allOutdated.length} packages?`
                : `Upgrade ${confirmAction.name}?`
            }
            onConfirm={() => {
              if (confirmAction.type === 'all') {
                stream.run(['upgrade']);
              } else if (confirmAction.name) {
                stream.run(['upgrade', confirmAction.name]);
              }
              setConfirmAction(null);
            }}
            onCancel={() => setConfirmAction(null)}
          />
        </Box>
      )}

      {allOutdated.length === 0 && !confirmAction && (
        <Box marginTop={1}>
          <Text color="green" bold>{'\u2714'} Everything is up to date!</Text>
        </Box>
      )}

      {allOutdated.length > 0 && !confirmAction && (
        <Box flexDirection="column" marginTop={1}>
          {allOutdated.map((pkg, i) => {
            const isCurrent = i === cursor;
            return (
              <Box key={pkg.name} gap={1}>
                <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
                <Text bold={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                  {pkg.name}
                </Text>
                <Text color="red">{pkg.installed_versions[0]}</Text>
                <Text color="gray">{'\u2192'}</Text>
                <Text color="green">{pkg.current_version}</Text>
                {pkg.pinned && <Text color="cyan">[pinned]</Text>}
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color="gray">
              {cursor + 1}/{allOutdated.length} {'\u2502'} enter:upgrade A:upgrade-all r:refresh
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
