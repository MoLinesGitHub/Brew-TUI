import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useLicenseStore } from '../stores/license-store.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { Loading } from '../components/common/loading.js';
import { SectionHeader } from '../components/common/section-header.js';
import { COLORS } from '../utils/colors.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t } from '../i18n/index.js';
import { formatDate } from '../utils/format.js';

export function AccountView() {
  const { status, license, deactivate, degradation } = useLicenseStore();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  useInput((input) => {
    if (confirmDeactivate || deactivating) return;

    if (input === 'd' && status === 'pro') {
      setConfirmDeactivate(true);
    }
  });

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 4) + '-****-****-' + key.slice(-4);
  };

  if (status === 'validating') {
    return <Loading message={t('account_loading')} />;
  }

  return (
    <Box flexDirection="column">
      <SectionHeader emoji={'\u{1F464}'} title={t('account_title')} gradient={GRADIENTS.gold} />

      {confirmDeactivate && (
        <Box marginY={1}>
          <ConfirmDialog
            message={t('account_confirmDeactivate')}
            onConfirm={async () => {
              setConfirmDeactivate(false);
              setDeactivating(true);
              setDeactivateError(null);
              try {
                await deactivate();
              } catch (err) {
                // SCR-007: Display deactivation errors
                setDeactivateError(t('deactivate_failed') + ': ' + String(err));
              } finally {
                setDeactivating(false);
              }
            }}
            onCancel={() => setConfirmDeactivate(false)}
          />
        </Box>
      )}

      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        <Box gap={1}>
          <Text color={COLORS.muted}>{t('account_statusLabel')}</Text>
          {status === 'pro' && <Text color={COLORS.success} bold>{t('account_pro')}</Text>}
          {status === 'free' && <Text color={COLORS.muted}>{t('account_free')}</Text>}
          {status === 'expired' && <Text color={COLORS.error}>{t('account_expired')}</Text>}
        </Box>

        {(degradation === 'warning' || degradation === 'limited') && license && (
          <Box marginTop={1} borderStyle="round" borderColor={COLORS.warning} paddingX={2} paddingY={0}>
            <Text color={COLORS.warning}>
              {t('license_offlineWarning', {
                days: Math.floor((Date.now() - new Date(license.lastValidatedAt).getTime()) / (24 * 60 * 60 * 1000)),
              })}
            </Text>
          </Box>
        )}

        {license && (
          <>
            <Box gap={1}>
              <Text color={COLORS.muted}>{t('account_emailLabel')}</Text>
              <Text>{license.customerEmail}</Text>
            </Box>
            <Box gap={1}>
              <Text color={COLORS.muted}>{t('account_nameLabel')}</Text>
              <Text>{license.customerName}</Text>
            </Box>
            <Box gap={1}>
              <Text color={COLORS.muted}>{t('account_planLabel')}</Text>
              <Text color={COLORS.success} bold>Pro</Text>
            </Box>
            <Box gap={1}>
              <Text color={COLORS.muted}>{t('account_keyLabel')}</Text>
              <Text>{maskKey(license.key)}</Text>
            </Box>
            {license.expiresAt && (
              <Box gap={1}>
                <Text color={COLORS.muted}>{t('account_expiresLabel')}</Text>
                <Text>{formatDate(license.expiresAt)}</Text>
              </Box>
            )}
            <Box gap={1}>
              <Text color={COLORS.muted}>{t('account_activatedLabel')}</Text>
              <Text>{formatDate(license.activatedAt)}</Text>
            </Box>
          </>
        )}

        {status === 'free' && (
          <Box flexDirection="column" marginTop={2} borderStyle="round" borderColor={COLORS.brand} paddingX={2} paddingY={1}>
            <Text bold color={COLORS.brand}>{'\u2B50'} {t('account_upgradeTitle')}</Text>
            <Text> </Text>
            <Text>{t('account_unlockDesc')}</Text>
            <Text color={COLORS.info} bold>{t('account_pricing')}</Text>
            <Text> </Text>
            <Text color={COLORS.muted}>{t('upgrade_buyAt')} <Text color={COLORS.sky} bold>{t('upgrade_buyUrl')}</Text></Text>
            <Text color={COLORS.muted}>{t('account_runActivate')} <Text color={COLORS.success} bold>{t('account_activateCmd')}</Text></Text>
          </Box>
        )}

        {status === 'expired' && (
          <Box marginTop={1}>
            <Box borderStyle="round" borderColor={COLORS.error} paddingX={2} paddingY={0}>
              <Text color={COLORS.error}>{t('account_licenseExpired')}</Text>
            </Box>
          </Box>
        )}

        {deactivating && <Text color={COLORS.sky}>{t('account_deactivating')}</Text>}
        {deactivateError && <Text color={COLORS.error}>{deactivateError}</Text>}
      </Box>

      <Box marginTop={2}>
        <Text color={COLORS.textSecondary}>
          {status === 'pro' ? `d:${t('hint_deactivate')}` : ''}
          {' '}{t('app_version', { version: process.env.APP_VERSION ?? '0.1.0' })}
        </Text>
      </Box>
    </Box>
  );
}
