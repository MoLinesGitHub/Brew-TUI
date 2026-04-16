import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useNavigationStore } from '../stores/navigation-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { formatRelativeTime } from '../utils/format.js';
import * as api from '../lib/brew-api.js';
import type { Formula } from '../lib/types.js';

export function PackageInfoView() {
  const packageName = useNavigationStore((s) => s.selectedPackage);
  const goBack = useNavigationStore((s) => s.goBack);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const stream = useBrewStream();

  useEffect(() => {
    if (!packageName) return;
    setLoading(true);
    api.getFormulaInfo(packageName)
      .then((f) => { setFormula(f); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [packageName]);

  useInput((input, key) => {
    if (confirmAction || stream.isRunning) return;

    if (key.escape) { goBack(); return; }

    if (!formula) return;

    const isInstalled = formula.installed.length > 0;
    if (input === 'i' && !isInstalled) {
      setConfirmAction('install');
    } else if (input === 'u' && isInstalled) {
      setConfirmAction('uninstall');
    } else if (input === 'U' && isInstalled && formula.outdated) {
      setConfirmAction('upgrade');
    }
  });

  if (!packageName) {
    return <Text color="gray" italic>No package selected. Go to Installed and press Enter on a package.</Text>;
  }

  if (loading) return <Loading message={`Loading ${packageName}...`} />;
  if (error) return <ErrorMessage message={error} />;
  if (!formula) return <ErrorMessage message="Package not found" />;

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog lines={stream.lines} isRunning={stream.isRunning} title={`${confirmAction}ing ${formula.name}...`} />
        {!stream.isRunning && (
          <Text color={stream.error ? 'red' : 'green'} bold>
            {stream.error ? `\u2718 ${stream.error}` : `\u2714 Done!`}
          </Text>
        )}
      </Box>
    );
  }

  const installed = formula.installed[0];
  const isInstalled = formula.installed.length > 0;

  return (
    <Box flexDirection="column">
      {confirmAction && (
        <ConfirmDialog
          message={`${confirmAction} ${formula.name}?`}
          onConfirm={() => {
            const action = confirmAction;
            setConfirmAction(null);
            if (action === 'install') stream.run(['install', formula.name]);
            else if (action === 'uninstall') stream.run(['uninstall', formula.name]);
            else if (action === 'upgrade') stream.run(['upgrade', formula.name]);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <Box gap={2} marginBottom={1}>
        <Text bold color="cyan">{formula.name}</Text>
        <Text color="green">{installed?.version ?? formula.versions.stable}</Text>
        {isInstalled && <StatusBadge label="installed" variant="success" />}
        {formula.outdated && <StatusBadge label="outdated" variant="warning" />}
        {formula.pinned && <StatusBadge label="pinned" variant="info" />}
        {formula.keg_only && <StatusBadge label="keg-only" variant="muted" />}
        {formula.deprecated && <StatusBadge label="deprecated" variant="error" />}
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text>{formula.desc}</Text>

        <Box flexDirection="column">
          <Text bold color="white">Details</Text>
          <Box paddingLeft={2} flexDirection="column">
            <Text><Text color="gray">Homepage:</Text> {formula.homepage}</Text>
            <Text><Text color="gray">License:</Text>  {formula.license}</Text>
            <Text><Text color="gray">Tap:</Text>      {formula.tap}</Text>
            <Text><Text color="gray">Stable:</Text>   {formula.versions.stable}</Text>
            {installed && (
              <>
                <Text><Text color="gray">Installed:</Text> {installed.version} ({formatRelativeTime(installed.time)})</Text>
                <Text><Text color="gray">Bottle:</Text>    {installed.poured_from_bottle ? 'yes' : 'no'}</Text>
                <Text><Text color="gray">On request:</Text> {installed.installed_on_request ? 'yes' : 'no (dependency)'}</Text>
              </>
            )}
          </Box>
        </Box>

        {formula.dependencies.length > 0 && (
          <Box flexDirection="column">
            <Text bold color="white">Dependencies ({formula.dependencies.length})</Text>
            <Box paddingLeft={2} flexWrap="wrap" columnGap={2}>
              {formula.dependencies.map((dep) => (
                <Text key={dep} color="gray">{dep}</Text>
              ))}
            </Box>
          </Box>
        )}

        {formula.caveats && (
          <Box flexDirection="column">
            <Text bold color="yellow">Caveats</Text>
            <Box paddingLeft={2}>
              <Text color="yellow">{formula.caveats}</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          {isInstalled ? 'u:uninstall' : 'i:install'}
          {isInstalled && formula.outdated ? ' U:upgrade' : ''}
          {' esc:back'}
        </Text>
      </Box>
    </Box>
  );
}
