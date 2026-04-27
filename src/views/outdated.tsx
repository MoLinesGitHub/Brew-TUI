import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { pinPackage, unpinPackage, getUpgradeImpact } from '../lib/brew-api.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ResultBanner } from '../components/common/result-banner.js';
import { SectionHeader } from '../components/common/section-header.js';
import { VersionArrow } from '../components/common/version-arrow.js';
import { SelectableRow } from '../components/common/selectable-row.js';
import { COLORS } from '../utils/colors.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t } from '../i18n/index.js';
import { useDebounce } from '../hooks/use-debounce.js';
import type { UpgradeImpact } from '../lib/impact/types.js';

function ImpactPanel({ impact }: { impact: UpgradeImpact }) {
  const riskColor =
    impact.risk === 'high' ? COLORS.error
    : impact.risk === 'medium' ? COLORS.warning
    : COLORS.success;

  const riskLabel =
    impact.risk === 'high' ? t('impact_high')
    : impact.risk === 'medium' ? t('impact_medium')
    : t('impact_low');

  const riskIcon =
    impact.risk === 'high' ? '\u26A0'
    : impact.risk === 'medium' ? '~'
    : '\u2713';

  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor={riskColor} paddingX={2} paddingY={0}>
      <Box>
        <Text bold color={riskColor}>{riskIcon} {riskLabel}</Text>
        {impact.reverseDeps.length > 0 && (
          <Text color={COLORS.textSecondary}> \u2014 {t('impact_affects', { count: impact.reverseDeps.length })}</Text>
        )}
      </Box>
      {impact.riskReasons.length > 0 && (
        <Text color={COLORS.textSecondary}>{impact.riskReasons.join(' \u00B7 ')}</Text>
      )}
      {impact.reverseDeps.length > 0 && impact.reverseDeps.length <= 5 && (
        <Text color={COLORS.muted} dimColor>
          {t('impact_usedBy', { packages: impact.reverseDeps.join(', ') })}
        </Text>
      )}
    </Box>
  );
}

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
  const [impact, setImpact] = useState<UpgradeImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => { fetchOutdated(); }, []);

  useEffect(() => {
    if (!stream.isRunning && !stream.error && stream.lines.length > 0 && !hasRefreshed.current) {
      hasRefreshed.current = true;
      void fetchOutdated();
    }
  }, [stream.isRunning, stream.error]);

  // Enrich packages with type so formula/cask distinction is available
  const allOutdated = [
    ...outdated.formulae.map((p) => ({ ...p, type: 'formula' as const })),
    ...outdated.casks.map((p) => ({ ...p, type: 'cask' as const })),
  ];

  const debouncedCursor = useDebounce(cursor, 150);

  useEffect(() => {
    const pkg = allOutdated[debouncedCursor];
    if (!pkg || stream.isRunning) {
      setImpact(null);
      return;
    }
    setImpactLoading(true);
    void getUpgradeImpact(
      pkg.name,
      pkg.installed_versions[0] ?? '',
      pkg.current_version,
      pkg.type,
    )
      .then(setImpact)
      .catch(() => setImpact(null))
      .finally(() => setImpactLoading(false));
  // allOutdated changes identity every render — using debouncedCursor + stream.isRunning is sufficient
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCursor, stream.isRunning]);

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
      // ARQ-008: Use brew-api functions instead of direct execBrew
      const pkg = allOutdated[cursor];
      void (pkg.pinned ? unpinPackage(pkg.name) : pinPackage(pkg.name)).then(() => void fetchOutdated());
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
          <Text color={COLORS.textSecondary}>esc:{t('hint_cancel')}</Text>
        )}
        {!stream.isRunning && (
          <Box flexDirection="column" marginTop={1}>
            <Box borderStyle="round" borderColor={stream.error ? COLORS.error : COLORS.success} paddingX={2} paddingY={0}>
              <Text color={stream.error ? COLORS.error : COLORS.success} bold>
                {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('outdated_upgradeComplete')}`}
              </Text>
              <Text color={COLORS.muted}> {t('outdated_pressRefresh')}</Text>
            </Box>
            <Text color={COLORS.textSecondary}>r:{t('hint_refresh')} esc:{t('hint_clear')}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // SCR-012: Build package list for upgrade-all confirmation
  const upgradeAllMessage = confirmAction?.type === 'all'
    ? `${t('outdated_confirmAll', { count: allOutdated.length })}\n${t('outdated_upgradeAllList', { list: allOutdated.map(p => p.name).join(', ') })}`
    : '';

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F4E6}'} title={t('outdated_title', { count: allOutdated.length })} gradient={GRADIENTS.fire} />

      {confirmAction && (
        <Box marginY={1}>
          <ConfirmDialog
            message={
              confirmAction.type === 'all'
                ? upgradeAllMessage
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
          <ResultBanner status="success" message={`\u2714 ${t('outdated_upToDate')}`} />
        </Box>
      )}

      {allOutdated.length > 0 && !confirmAction && (
        <Box flexDirection="column" marginTop={1}>
          {start > 0 && (
            <Text color={COLORS.textSecondary} dimColor>  {t('scroll_moreAbove', { count: start })}</Text>
          )}
          {visible.map((pkg, i) => {
            const idx = start + i;
            const isCurrent = idx === cursor;
            return (
              <SelectableRow key={pkg.name} isCurrent={isCurrent}>
                <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? COLORS.text : COLORS.muted}>
                  {pkg.name}
                </Text>
                <VersionArrow current={pkg.installed_versions[0] ?? ''} latest={pkg.current_version} />
                {pkg.pinned && <StatusBadge label={t('outdated_pinned')} variant="info" />}
              </SelectableRow>
            );
          })}
          {start + MAX_VISIBLE_ROWS < allOutdated.length && (
            <Text color={COLORS.textSecondary} dimColor>  {t('scroll_moreBelow', { count: allOutdated.length - start - MAX_VISIBLE_ROWS })}</Text>
          )}

          <Box marginTop={1}>
            <Text color={COLORS.text} bold>
              {cursor + 1}/{allOutdated.length}
            </Text>
          </Box>

          {impact && !stream.isRunning && !confirmAction && (
            <ImpactPanel impact={impact} />
          )}
          {impactLoading && !stream.isRunning && !confirmAction && (
            <Box marginTop={1}>
              <Text color={COLORS.textSecondary}>{t('impact_analyzing')}</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color={COLORS.textSecondary}>{t('impact_hint')}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
