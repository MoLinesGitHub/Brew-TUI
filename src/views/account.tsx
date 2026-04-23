import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useLicenseStore } from '../stores/license-store.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { SectionHeader } from '../components/common/section-header.js';
import { GRADIENTS } from '../utils/gradient.js';
import { t } from '../i18n/index.js';

export function AccountView() {
  const { status, license, deactivate, degradation } = useLicenseStore();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

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
              try {
                await deactivate();
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
          <Text color="#9CA3AF">{t('account_statusLabel')}</Text>
          {status === 'pro' && <Text color="#22C55E" bold>{t('account_pro')}</Text>}
          {status === 'free' && <Text color="#9CA3AF">{t('account_free')}</Text>}
          {status === 'expired' && <Text color="#EF4444">{t('account_expired')}</Text>}
          {status === 'validating' && <Text color="#38BDF8">{t('account_validating')}</Text>}
        </Box>

        {(degradation === 'warning' || degradation === 'limited') && license && (
          <Box marginTop={1} borderStyle="round" borderColor="#F59E0B" paddingX={2} paddingY={0}>
            <Text color="#F59E0B">
              {t('license_offlineWarning', {
                days: Math.floor((Date.now() - new Date(license.lastValidatedAt).getTime()) / (24 * 60 * 60 * 1000)),
              })}
            </Text>
          </Box>
        )}

        {license && (
          <>
            <Box gap={1}>
              <Text color="#9CA3AF">{t('account_emailLabel')}</Text>
              <Text>{license.customerEmail}</Text>
            </Box>
            <Box gap={1}>
              <Text color="#9CA3AF">{t('account_nameLabel')}</Text>
              <Text>{license.customerName}</Text>
            </Box>
            <Box gap={1}>
              <Text color="#9CA3AF">{t('account_planLabel')}</Text>
              <Text color="#22C55E" bold>Pro</Text>
            </Box>
            <Box gap={1}>
              <Text color="#9CA3AF">{t('account_keyLabel')}</Text>
              <Text>{maskKey(license.key)}</Text>
            </Box>
            {license.expiresAt && (
              <Box gap={1}>
                <Text color="#9CA3AF">{t('account_expiresLabel')}</Text>
                <Text>{new Date(license.expiresAt).toLocaleDateString()}</Text>
              </Box>
            )}
            <Box gap={1}>
              <Text color="#9CA3AF">{t('account_activatedLabel')}</Text>
              <Text>{new Date(license.activatedAt).toLocaleDateString()}</Text>
            </Box>
          </>
        )}

        {status === 'free' && (
          <Box flexDirection="column" marginTop={2} borderStyle="round" borderColor="#FF6B2B" paddingX={2} paddingY={1}>
            <Text bold color="#FF6B2B">{'\u2B50'} {t('account_upgradeTitle')}</Text>
            <Text> </Text>
            <Text>{t('account_unlockDesc')}</Text>
            <Text color="#06B6D4" bold>{t('account_pricing')}</Text>
            <Text> </Text>
            <Text color="#9CA3AF">{t('upgrade_buyAt')} <Text color="#38BDF8" bold>{t('upgrade_buyUrl')}</Text></Text>
            <Text color="#9CA3AF">{t('account_runActivate')} <Text color="#22C55E" bold>{t('account_activateCmd')}</Text></Text>
          </Box>
        )}

        {status === 'expired' && (
          <Box marginTop={1}>
            <Box borderStyle="round" borderColor="#EF4444" paddingX={2} paddingY={0}>
              <Text color="#EF4444">{t('account_licenseExpired')}</Text>
            </Box>
          </Box>
        )}

        {deactivating && <Text color="#38BDF8">{t('account_deactivating')}</Text>}
      </Box>

      <Box marginTop={2}>
        <Text color="#6B7280">
          {status === 'pro' ? `d:${t('hint_deactivate')}` : ''}
          {' '}{t('app_version', { version: process.env.APP_VERSION ?? '0.1.0' })}
        </Text>
      </Box>
    </Box>
  );
}
