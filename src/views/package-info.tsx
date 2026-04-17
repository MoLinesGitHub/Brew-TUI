import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useNavigationStore } from '../stores/navigation-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { formatRelativeTime } from '../utils/format.js';
import { t } from '../i18n/index.js';
import type { TranslationKey } from '../i18n/en.js';
import * as api from '../lib/brew-api.js';
import type { Formula } from '../lib/types.js';

const ACTION_PROGRESS_KEYS: Record<string, TranslationKey> = {
  install: 'pkgInfo_installing',
  uninstall: 'pkgInfo_uninstalling',
  upgrade: 'pkgInfo_upgrading',
};

const ACTION_CONFIRM_KEYS: Record<string, TranslationKey> = {
  install: 'pkgInfo_confirmInstall',
  uninstall: 'pkgInfo_confirmUninstall',
  upgrade: 'pkgInfo_confirmUpgrade',
};

export function PackageInfoView() {
  const packageName = useNavigationStore((s) => s.selectedPackage);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const activeActionRef = useRef<string>('install');
  const mountedRef = useRef(true);
  const stream = useBrewStream();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!packageName) return;
    setLoading(true);
    api.getFormulaInfo(packageName)
      .then((f) => { if (mountedRef.current) { setFormula(f); setLoading(false); } })
      .catch((err) => { if (mountedRef.current) { setError(err.message); setLoading(false); } });
  }, [packageName]);

  useInput((input, _key) => {
    if (confirmAction || stream.isRunning) return;

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
    return <Text color="gray" italic>{t('pkgInfo_noPackage')}</Text>;
  }

  if (loading) return <Loading message={t('loading_package', { name: packageName })} />;
  if (error) return <ErrorMessage message={error} />;
  if (!formula) return <ErrorMessage message={t('pkgInfo_notFound')} />;

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog lines={stream.lines} isRunning={stream.isRunning} title={t(ACTION_PROGRESS_KEYS[activeActionRef.current] ?? ACTION_PROGRESS_KEYS['install']!, { name: formula.name })} />
        {!stream.isRunning && (
          <Text color={stream.error ? 'redBright' : 'greenBright'} bold>
            {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('pkgInfo_done')}`}
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
          message={t(ACTION_CONFIRM_KEYS[confirmAction], { name: formula.name })}
          onConfirm={() => {
            const action = confirmAction;
            activeActionRef.current = action ?? 'install';
            setConfirmAction(null);
            if (action === 'install') void stream.run(['install', formula.name]);
            else if (action === 'uninstall') void stream.run(['uninstall', formula.name]);
            else if (action === 'upgrade') void stream.run(['upgrade', formula.name]);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <Box gap={2} marginBottom={1}>
        <Text bold color="yellowBright">{formula.name}</Text>
        <Text color="cyanBright">{installed?.version ?? formula.versions.stable}</Text>
        {isInstalled && <StatusBadge label={t('badge_installed')} variant="success" />}
        {formula.outdated && <StatusBadge label={t('badge_outdated')} variant="warning" />}
        {formula.pinned && <StatusBadge label={t('badge_pinned')} variant="info" />}
        {formula.keg_only && <StatusBadge label={t('badge_kegOnly')} variant="muted" />}
        {formula.deprecated && <StatusBadge label={t('badge_deprecated')} variant="error" />}
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text>{formula.desc}</Text>

        <Box flexDirection="column">
          <Text bold color="white">{t('pkgInfo_details')}</Text>
          <Box paddingLeft={2} flexDirection="column">
            <Text><Text color="gray">{t('pkgInfo_homepage')}</Text> {formula.homepage}</Text>
            <Text><Text color="gray">{t('pkgInfo_license')}</Text>  {formula.license}</Text>
            <Text><Text color="gray">{t('pkgInfo_tap')}</Text>      {formula.tap}</Text>
            <Text><Text color="gray">{t('pkgInfo_stable')}</Text>   {formula.versions.stable}</Text>
            {installed && (
              <>
                <Text><Text color="gray">{t('pkgInfo_installed')}</Text> {installed.version} ({formatRelativeTime(installed.time)})</Text>
                <Text><Text color="gray">{t('pkgInfo_bottle')}</Text>    {installed.poured_from_bottle ? t('common_yes') : t('common_no')}</Text>
                <Text><Text color="gray">{t('pkgInfo_onRequest')}</Text> {installed.installed_on_request ? t('common_yes') : t('pkgInfo_noDependency')}</Text>
              </>
            )}
          </Box>
        </Box>

        {formula.dependencies.length > 0 && (
          <Box flexDirection="column">
            <Text bold color="white">{t('pkgInfo_dependencies', { count: formula.dependencies.length })}</Text>
            <Box paddingLeft={2} flexWrap="wrap" columnGap={2}>
              {formula.dependencies.map((dep) => (
                <Text key={dep} color="gray">{dep}</Text>
              ))}
            </Box>
          </Box>
        )}

        {formula.caveats && (
          <Box flexDirection="column">
            <Text bold color="yellow">{t('pkgInfo_caveats')}</Text>
            <Box paddingLeft={2}>
              <Text color="yellow">{formula.caveats}</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          {isInstalled ? `u:${t('hint_uninstall')}` : `i:${t('hint_install')}`}
          {isInstalled && formula.outdated ? ` U:${t('hint_upgrade')}` : ''}
          {` esc:${t('hint_back')}`}
        </Text>
      </Box>
    </Box>
  );
}
