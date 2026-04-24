import React, { useEffect, useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { StatCard } from '../components/common/stat-card.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { SectionHeader } from '../components/common/section-header.js';
import { VersionArrow } from '../components/common/version-arrow.js';
import { COLORS } from '../utils/colors.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t } from '../i18n/index.js';
import { formatRelativeTime } from '../utils/format.js';

export function DashboardView() {
  const { formulae, casks, outdated, services, config, loading, errors, lastFetchedAt, fetchAll } = useBrewStore();
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;

  useEffect(() => { fetchAll(); }, []);

  const errorServiceList = useMemo(
    () => services.filter((s) => s.status === 'error'),
    [services]
  );
  const runningServices = useMemo(
    () => services.filter((s) => s.status === 'started').length,
    [services]
  );
  const errorServices = errorServiceList.length;
  const partialErrors = [
    errors.outdated ? { label: t('dashboard_outdated'), message: errors.outdated } : null,
    errors.services ? { label: t('dashboard_services'), message: errors.services } : null,
    errors.config ? { label: t('dashboard_systemInfo'), message: errors.config } : null,
  ].filter((item): item is { label: string; message: string } => item !== null);
  const outdatedValue = loading.outdated
    ? '...'
    : errors.outdated
      ? t('dashboard_statError')
      : outdated.formulae.length + outdated.casks.length;
  const servicesValue = loading.services
    ? '...'
    : errors.services
      ? t('dashboard_statError')
      : `${runningServices}/${services.length}`;

  // ARQ-004: Last updated timestamp
  const lastUpdated = lastFetchedAt.installed
    ? formatRelativeTime(lastFetchedAt.installed / 1000)
    : null;

  if (loading.installed) return <Loading message={t('loading_fetchingBrew')} />;
  if (errors.installed) return <ErrorMessage message={errors.installed} />;

  // SCR-018: Responsive layout
  const isNarrow = columns < 60;

  return (
    <Box flexDirection="column" gap={2}>
      <SectionHeader emoji={'\u{1F4CA}'} title={t('dashboard_overview')} gradient={GRADIENTS.gold} />

      <Box gap={1} flexWrap="wrap" flexDirection={isNarrow ? 'column' : 'row'}>
        <StatCard label={t('dashboard_formulae')} value={formulae.length} color={COLORS.info} />
        <StatCard label={t('dashboard_casks')} value={casks.length} color={COLORS.purple} />
        <StatCard
          label={t('dashboard_outdated')}
          value={outdatedValue}
          color={typeof outdatedValue === 'number' && outdatedValue > 0 ? COLORS.warning : (errors.outdated ? COLORS.error : COLORS.success)}
        />
        <StatCard
          label={t('dashboard_services')}
          value={servicesValue}
          color={errors.services || errorServices > 0 ? COLORS.error : COLORS.success}
        />
      </Box>

      {/* ARQ-004: Show last updated */}
      {lastUpdated && (
        <Text color={COLORS.muted}>{t('dashboard_lastUpdated', { time: lastUpdated })}</Text>
      )}

      {partialErrors.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor={COLORS.warning} paddingX={2} paddingY={0}>
          <Text color={COLORS.warning} bold>{t('dashboard_partialData')}</Text>
          {partialErrors.map((item) => (
            <Text key={item.label} color={COLORS.muted}>
              {item.label}: {item.message}
            </Text>
          ))}
        </Box>
      )}

      {config && !errors.config && (
        <Box flexDirection="column">
          <SectionHeader emoji={'\u2139\uFE0F'} title={t('dashboard_systemInfo')} gradient={[COLORS.text, COLORS.muted]} />
          <Box borderStyle="round" borderColor={COLORS.blue} paddingX={2} paddingY={0} flexDirection="column" marginTop={1}>
            <Text><Text color={COLORS.muted}>{t('dashboard_homebrew')}</Text> {config.HOMEBREW_VERSION}</Text>
            <Text><Text color={COLORS.muted}>{t('dashboard_prefix')}</Text>   {config.HOMEBREW_PREFIX}</Text>
            <Text><Text color={COLORS.muted}>{t('dashboard_updated')}</Text>  {config.coreUpdated}</Text>
          </Box>
        </Box>
      )}

      {!errors.outdated && outdated.formulae.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <SectionHeader emoji={'\u{1F4E6}'} title={t('dashboard_outdatedPackages')} gradient={GRADIENTS.fire} />
          <Box paddingLeft={2} flexDirection="column">
            {outdated.formulae.slice(0, 10).map((pkg) => (
              <Box key={pkg.name} gap={1}>
                <Text color={COLORS.text}>{pkg.name}</Text>
                <VersionArrow current={pkg.installed_versions[0] ?? ''} latest={pkg.current_version} />
              </Box>
            ))}
            {outdated.formulae.length > 10 && (
              <Text color={COLORS.textSecondary} italic>{t('common_andMore', { count: outdated.formulae.length - 10 })}</Text>
            )}
          </Box>
        </Box>
      )}

      {!errors.services && errorServices > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <SectionHeader emoji={'\u26A0\uFE0F'} title={t('dashboard_serviceErrors')} color={COLORS.error} />
          <Box paddingLeft={2} flexDirection="column">
            {errorServiceList.map((s) => (
              <Box key={s.name} gap={1}>
                <StatusBadge label={t('badge_error')} variant="error" />
                <Text>{s.name}</Text>
                {s.exit_code != null && <Text color={COLORS.muted}>{t('common_exit', { code: s.exit_code })}</Text>}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
