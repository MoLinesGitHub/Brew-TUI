import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { StatCard } from '../components/common/stat-card.js';
import { Loading } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';

export function DashboardView() {
  const { formulae, casks, outdated, services, config, loading, fetchAll } = useBrewStore();

  useEffect(() => { fetchAll(); }, []);

  if (loading.installed) return <Loading message="Fetching Homebrew data..." />;

  const runningServices = services.filter((s) => s.status === 'started').length;
  const errorServices = services.filter((s) => s.status === 'error').length;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="green">{'\u{1F4CA}'} Overview</Text>

      <Box gap={1} flexWrap="wrap">
        <StatCard label="Formulae" value={formulae.length} color="cyan" />
        <StatCard label="Casks" value={casks.length} color="magenta" />
        <StatCard
          label="Outdated"
          value={outdated.formulae.length + outdated.casks.length}
          color={outdated.formulae.length + outdated.casks.length > 0 ? 'yellow' : 'green'}
        />
        <StatCard
          label="Services"
          value={`${runningServices}/${services.length}`}
          color={errorServices > 0 ? 'red' : 'green'}
        />
      </Box>

      {config && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="white">{'\u2139\uFE0F'}  System Info</Text>
          <Box paddingLeft={2} flexDirection="column">
            <Text><Text color="gray">Homebrew:</Text> {config.HOMEBREW_VERSION}</Text>
            <Text><Text color="gray">Prefix:</Text>   {config.HOMEBREW_PREFIX}</Text>
            <Text><Text color="gray">Updated:</Text>  {config.coreUpdated}</Text>
          </Box>
        </Box>
      )}

      {outdated.formulae.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="yellow">{'\u{1F4E6}'} Outdated Packages</Text>
          <Box paddingLeft={2} flexDirection="column">
            {outdated.formulae.slice(0, 10).map((pkg) => (
              <Box key={pkg.name} gap={1}>
                <Text color="white">{pkg.name}</Text>
                <Text color="red">{pkg.installed_versions[0]}</Text>
                <Text color="gray">{'\u2192'}</Text>
                <Text color="green">{pkg.current_version}</Text>
              </Box>
            ))}
            {outdated.formulae.length > 10 && (
              <Text color="gray" italic>...and {outdated.formulae.length - 10} more</Text>
            )}
          </Box>
        </Box>
      )}

      {errorServices > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">{'\u26A0\uFE0F'}  Service Errors</Text>
          <Box paddingLeft={2} flexDirection="column">
            {services.filter((s) => s.status === 'error').map((s) => (
              <Box key={s.name} gap={1}>
                <StatusBadge label="error" variant="error" />
                <Text>{s.name}</Text>
                {s.exit_code != null && <Text color="gray">(exit {s.exit_code})</Text>}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
