import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { Loading } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import type { BrewService } from '../lib/types.js';

const STATUS_VARIANTS = {
  started: 'success',
  stopped: 'muted',
  error: 'error',
  none: 'muted',
} as const;

export function ServicesView() {
  const { services, loading, fetchServices, serviceAction } = useBrewStore();
  const [cursor, setCursor] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  useInput((input, key) => {
    if (actionInProgress) return;

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, services.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (input === 'r') {
      fetchServices();
    }

    const svc = services[cursor];
    if (!svc) return;

    const doAction = async (action: 'start' | 'stop' | 'restart') => {
      setActionInProgress(true);
      await serviceAction(svc.name, action);
      setActionInProgress(false);
    };

    if (input === 's') doAction('start');
    else if (input === 'S') doAction('stop');
    else if (input === 'R') doAction('restart');
  });

  if (loading.services) return <Loading message="Loading services..." />;

  if (services.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>{'\u2699\uFE0F'}  Homebrew Services</Text>
        <Text color="gray" italic>No services found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{'\u2699\uFE0F'}  Homebrew Services ({services.length})</Text>

      <Box flexDirection="column" marginTop={1}>
        <Box gap={1} marginBottom={1}>
          <Text bold color="gray">{'  '}Name</Text>
          <Text bold color="gray">{'          '}Status</Text>
          <Text bold color="gray">{'  '}User</Text>
        </Box>

        {services.map((svc, i) => {
          const isCurrent = i === cursor;
          return (
            <Box key={svc.name} gap={1}>
              <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
              <Text bold={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                {svc.name.padEnd(20)}
              </Text>
              <StatusBadge label={svc.status} variant={STATUS_VARIANTS[svc.status]} />
              <Text color="gray">{svc.user ?? '-'}</Text>
              {svc.exit_code != null && svc.exit_code !== 0 && (
                <Text color="red">(exit {svc.exit_code})</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {actionInProgress && <Text color="cyan">Processing...</Text>}

      <Box marginTop={1}>
        <Text color="gray">
          {cursor + 1}/{services.length} {'\u2502'} s:start S:stop R:restart r:refresh
        </Text>
      </Box>
    </Box>
  );
}
