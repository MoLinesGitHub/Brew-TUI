import React, { useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { StatCard } from '../components/common/stat-card.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { t } from '../i18n/index.js';

export function DashboardView() {
  const { formulae, casks, outdated, services, config, loading, errors, fetchAll } = useBrewStore();

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

  if (loading.installed) return <Loading message={t('loading_fetchingBrew')} />;
  if (errors.installed) return <ErrorMessage message={errors.installed} />;

  return (
    <Box flexDirection="column" gap={2}>
      <Text bold color="yellowBright">{'\u{1F4CA}'} {t('dashboard_overview')}</Text>

      <Box gap={1} flexWrap="wrap">
        <StatCard label={t('dashboard_formulae')} value={formulae.length} color="cyanBright" />
        <StatCard label={t('dashboard_casks')} value={casks.length} color="magentaBright" />
        <StatCard
          label={t('dashboard_outdated')}
          value={outdated.formulae.length + outdated.casks.length}
          color={outdated.formulae.length + outdated.casks.length > 0 ? 'yellow' : 'greenBright'}
        />
        <StatCard
          label={t('dashboard_services')}
          value={`${runningServices}/${services.length}`}
          color={errorServices > 0 ? 'redBright' : 'greenBright'}
        />
      </Box>

      {config && (
        <Box flexDirection="column">
          <Text bold color="white">{'\u2139\uFE0F'}  {t('dashboard_systemInfo')}</Text>
          <Box borderStyle="round" borderColor="blueBright" paddingX={2} paddingY={0} flexDirection="column" marginTop={1}>
            <Text><Text color="gray">{t('dashboard_homebrew')}</Text> {config.HOMEBREW_VERSION}</Text>
            <Text><Text color="gray">{t('dashboard_prefix')}</Text>   {config.HOMEBREW_PREFIX}</Text>
            <Text><Text color="gray">{t('dashboard_updated')}</Text>  {config.coreUpdated}</Text>
          </Box>
        </Box>
      )}

      {outdated.formulae.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="yellow">{'\u{1F4E6}'} {t('dashboard_outdatedPackages')}</Text>
          <Box paddingLeft={2} flexDirection="column">
            {outdated.formulae.slice(0, 10).map((pkg) => (
              <Box key={pkg.name} gap={1}>
                <Text color="white">{pkg.name}</Text>
                <Text color="redBright">{pkg.installed_versions[0] ?? ''}</Text>
                <Text color="gray">{'\u2192'}</Text>
                <Text color="cyanBright">{pkg.current_version}</Text>
              </Box>
            ))}
            {outdated.formulae.length > 10 && (
              <Text color="gray" italic>{t('common_andMore', { count: outdated.formulae.length - 10 })}</Text>
            )}
          </Box>
        </Box>
      )}

      {errorServices > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="redBright">{'\u26A0\uFE0F'}  {t('dashboard_serviceErrors')}</Text>
          <Box paddingLeft={2} flexDirection="column">
            {errorServiceList.map((s) => (
              <Box key={s.name} gap={1}>
                <StatusBadge label={t('badge_error')} variant="error" />
                <Text>{s.name}</Text>
                {s.exit_code != null && <Text color="gray">{t('common_exit', { code: s.exit_code })}</Text>}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
