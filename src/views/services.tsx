import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { t } from '../i18n/index.js';
const STATUS_VARIANTS = {
  started: 'success',
  stopped: 'muted',
  error: 'error',
  none: 'muted',
} as const;

export function ServicesView() {
  const { services, loading, errors, fetchServices, serviceAction } = useBrewStore();
  const [cursor, setCursor] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  useInput((input, key) => {
    if (actionInProgress) return;

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(0, services.length - 1)));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (input === 'r') {
      void fetchServices();
    }

    const svc = services[cursor];
    if (!svc) return;

    const doAction = (action: 'start' | 'stop' | 'restart') => {
      setActionInProgress(true);
      void serviceAction(svc.name, action).finally(() => {
        setActionInProgress(false);
      });
    };

    if (input === 's') doAction('start');
    else if (input === 'S') doAction('stop');
    else if (input === 'R') doAction('restart');
  });

  if (loading.services) return <Loading message={t('loading_services')} />;
  if (errors.services) return <ErrorMessage message={errors.services} />;

  if (services.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>{'\u2699\uFE0F'}  {t('services_title')}</Text>
        <Text color="gray" italic>{t('services_noServices')}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{'\u2699\uFE0F'}  {t('services_titleCount', { count: services.length })}</Text>

      <Box flexDirection="column" marginTop={1}>
        <Box gap={1} borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false} borderColor="gray" paddingBottom={0}>
          <Text bold color="white">{'  '}{t('services_name').padEnd(22)}</Text>
          <Text bold color="white">{t('services_status').padEnd(12)}</Text>
          <Text bold color="white">{t('services_user')}</Text>
        </Box>

        {services.map((svc, i) => {
          const isCurrent = i === cursor;
          return (
            <Box key={svc.name} gap={1}>
              <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
              <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                {svc.name.padEnd(20)}
              </Text>
              <StatusBadge label={svc.status} variant={STATUS_VARIANTS[svc.status]} />
              <Text color="gray">{svc.user ?? '-'}</Text>
              {svc.exit_code != null && svc.exit_code !== 0 && (
                <Text color="red">{t('common_exit', { code: svc.exit_code })}</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {actionInProgress && <Text color="cyan">{t('services_processing')}</Text>}

      <Box marginTop={1}>
        <Text color="white" bold>
          {cursor + 1}/{services.length}
        </Text>
      </Box>
    </Box>
  );
}
