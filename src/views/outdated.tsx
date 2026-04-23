import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { execBrew } from '../lib/brew-cli.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { SectionHeader } from '../components/common/section-header.js';
import { VersionArrow } from '../components/common/version-arrow.js';
import { GRADIENTS } from '../utils/gradient.js';
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
  const hasRefreshed = useRef(false);

  useEffect(() => { fetchOutdated(); }, []);

  useEffect(() => {
    if (!stream.isRunning && !stream.error && stream.lines.length > 0 && !hasRefreshed.current) {
      hasRefreshed.current = true;
      void fetchOutdated();
    }
  }, [stream.isRunning, stream.error]);

  const allOutdated = [...outdated.formulae, ...outdated.casks];

  useInput((input, key) => {
    if (stream.isRunning) {
      if (key.escape) stream.cancel();
      return;
    }
    if (stream.lines.length > 0) {
      if (key.escape) {
        stream.clear();
        return;
      }
      if (input === 'r') {
        stream.clear();
        void fetchOutdated();
      }
      return;
    }
    if (confirmAction) return;

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(0, allOutdated.length - 1)));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (key.return && allOutdated[cursor]) {
      setConfirmAction({ type: 'single', name: allOutdated[cursor].name });
    } else if (input === 'A' && allOutdated.length > 0) {
      setConfirmAction({ type: 'all' });
    } else if (input === 'p' && allOutdated[cursor]) {
      const pkg = allOutdated[cursor];
      void execBrew([pkg.pinned ? 'unpin' : 'pin', pkg.name]).then(() => void fetchOutdated());
      return;
    } else if (input === 'r') {
      void fetchOutdated();
    }
  });

  const { stdout } = useStdout();
  const MAX_VISIBLE_ROWS = Math.max(5, (stdout?.rows ?? 24) - 8);
  const start = Math.max(0, cursor - Math.floor(MAX_VISIBLE_ROWS / 2));
  const visible = allOutdated.slice(start, start + MAX_VISIBLE_ROWS);

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
        {stream.isRunning && (
          <Text color="#6B7280">esc:{t('hint_cancel')}</Text>
        )}
        {!stream.isRunning && (
          <Box flexDirection="column" marginTop={1}>
            <Box borderStyle="round" borderColor={stream.error ? '#EF4444' : '#22C55E'} paddingX={2} paddingY={0}>
              <Text color={stream.error ? '#EF4444' : '#22C55E'} bold>
                {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('outdated_upgradeComplete')}`}
              </Text>
              <Text color="#9CA3AF"> {t('outdated_pressRefresh')}</Text>
            </Box>
            <Text color="#6B7280">r:{t('hint_refresh')} esc:{t('hint_clear')}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F4E6}'} title={t('outdated_title', { count: allOutdated.length })} gradient={GRADIENTS.fire} />

      {confirmAction && (
        <Box marginY={1}>
          <ConfirmDialog
            message={
              confirmAction.type === 'all'
                ? t('outdated_confirmAll', { count: allOutdated.length })
                : t('outdated_confirmSingle', { name: confirmAction.type === 'single' ? confirmAction.name : '' })
            }
            onConfirm={() => {
              hasRefreshed.current = false;
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
          <Box borderStyle="round" borderColor="#22C55E" paddingX={2} paddingY={0}>
            <Text color="#22C55E" bold>{'\u2714'} {t('outdated_upToDate')}</Text>
          </Box>
        </Box>
      )}

      {allOutdated.length > 0 && !confirmAction && (
        <Box flexDirection="column" marginTop={1}>
          {start > 0 && (
            <Text color="#6B7280" dimColor>  {t('scroll_moreAbove', { count: start })}</Text>
          )}
          {visible.map((pkg, i) => {
            const idx = start + i;
            const isCurrent = idx === cursor;
            return (
              <Box key={pkg.name} gap={1}>
                <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
                <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? '#F9FAFB' : '#9CA3AF'}>
                  {pkg.name}
                </Text>
                <VersionArrow current={pkg.installed_versions[0] ?? ''} latest={pkg.current_version} />
                {pkg.pinned && <StatusBadge label={t('outdated_pinned')} variant="info" />}
              </Box>
            );
          })}
          {start + MAX_VISIBLE_ROWS < allOutdated.length && (
            <Text color="#6B7280" dimColor>  {t('scroll_moreBelow', { count: allOutdated.length - start - MAX_VISIBLE_ROWS })}</Text>
          )}

          <Box marginTop={1}>
            <Text color="#F9FAFB" bold>
              {cursor + 1}/{allOutdated.length}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
