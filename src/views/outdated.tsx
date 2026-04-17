import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { t } from '../i18n/index.js';

export function OutdatedView() {
  const { outdated, loading, errors, fetchOutdated } = useBrewStore();
  const stream = useBrewStream();
  const [cursor, setCursor] = useState(0);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'single'; name: string }
    | { type: 'all' }
    | null
  >(null);

  useEffect(() => { fetchOutdated(); }, []);

  const allOutdated = [...outdated.formulae, ...outdated.casks];

  useInput((input, key) => {
    if (confirmAction || stream.isRunning) return;

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(0, allOutdated.length - 1)));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (key.return && allOutdated[cursor]) {
      setConfirmAction({ type: 'single', name: allOutdated[cursor].name });
    } else if (input === 'A' && allOutdated.length > 0) {
      setConfirmAction({ type: 'all' });
    } else if (input === 'r') {
      void fetchOutdated();
    }
  });

  if (loading.outdated) return <Loading message={t('loading_outdated')} />;
  if (errors.outdated) return <ErrorMessage message={errors.outdated} />;

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog
          lines={stream.lines}
          isRunning={stream.isRunning}
          title={t('outdated_upgrading')}
        />
        {!stream.isRunning && (
          <Box marginTop={1}>
            <Text color={stream.error ? 'redBright' : 'greenBright'} bold>
              {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('outdated_upgradeComplete')}`}
            </Text>
            <Text color="gray"> {t('outdated_pressRefresh')}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">{'\u{1F4E6}'} {t('outdated_title', { count: allOutdated.length })}</Text>

      {confirmAction && (
        <Box marginY={1}>
          <ConfirmDialog
            message={
              confirmAction.type === 'all'
                ? t('outdated_confirmAll', { count: allOutdated.length })
                : t('outdated_confirmSingle', { name: confirmAction.type === 'single' ? confirmAction.name : '' })
            }
            onConfirm={() => {
              if (confirmAction.type === 'all') {
                void stream.run(['upgrade']);
              } else if (confirmAction.name) {
                void stream.run(['upgrade', confirmAction.name]);
              }
              setConfirmAction(null);
            }}
            onCancel={() => setConfirmAction(null)}
          />
        </Box>
      )}

      {allOutdated.length === 0 && !confirmAction && (
        <Box marginTop={1}>
          <Text color="greenBright" bold>{'\u2714'} {t('outdated_upToDate')}</Text>
        </Box>
      )}

      {allOutdated.length > 0 && !confirmAction && (
        <Box flexDirection="column" marginTop={1}>
          {allOutdated.map((pkg, i) => {
            const isCurrent = i === cursor;
            return (
              <Box key={pkg.name} gap={1}>
                <Text color={isCurrent ? 'greenBright' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
                <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                  {pkg.name}
                </Text>
                <Text color="redBright">{pkg.installed_versions[0] ?? ''}</Text>
                <Text color="gray">{'\u2192'}</Text>
                <Text color="cyanBright">{pkg.current_version}</Text>
                {pkg.pinned && <StatusBadge label={t('outdated_pinned')} variant="info" />}
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color="white" bold>
              {cursor + 1}/{allOutdated.length}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
