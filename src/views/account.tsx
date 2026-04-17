import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useLicenseStore } from '../stores/license-store.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { t } from '../i18n/index.js';

export function AccountView() {
  const { status, license, deactivate } = useLicenseStore();
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
      <Text bold>{'\u{1F464}'} {t('account_title')}</Text>

      {confirmDeactivate && (
        <Box marginY={1}>
          <ConfirmDialog
            message={t('account_confirmDeactivate')}
            onConfirm={async () => {
              setConfirmDeactivate(false);
              setDeactivating(true);
              await deactivate();
              setDeactivating(false);
            }}
            onCancel={() => setConfirmDeactivate(false)}
          />
        </Box>
      )}

      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        <Box gap={1}>
          <Text color="gray">{t('account_statusLabel')}</Text>
          {status === 'pro' && <Text color="cyanBright" bold>{t('account_pro')}</Text>}
          {status === 'free' && <Text color="gray">{t('account_free')}</Text>}
          {status === 'expired' && <Text color="red">{t('account_expired')}</Text>}
          {status === 'validating' && <Text color="cyan">{t('account_validating')}</Text>}
        </Box>

        {license && (
          <>
            <Box gap={1}>
              <Text color="gray">{t('account_emailLabel')}</Text>
              <Text>{license.customerEmail}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">{t('account_nameLabel')}</Text>
              <Text>{license.customerName}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">{t('account_planLabel')}</Text>
              <Text>{license.plan === 'monthly' ? t('account_monthlyPrice') : t('account_yearlyPrice')}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">{t('account_keyLabel')}</Text>
              <Text>{maskKey(license.key)}</Text>
            </Box>
            {license.expiresAt && (
              <Box gap={1}>
                <Text color="gray">{t('account_expiresLabel')}</Text>
                <Text>{new Date(license.expiresAt).toLocaleDateString()}</Text>
              </Box>
            )}
            <Box gap={1}>
              <Text color="gray">{t('account_activatedLabel')}</Text>
              <Text>{new Date(license.activatedAt).toLocaleDateString()}</Text>
            </Box>
          </>
        )}

        {status === 'free' && (
          <Box flexDirection="column" marginTop={2} borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
            <Text bold color="cyanBright">{'\u2B50'} {t('account_upgradeTitle')}</Text>
            <Text> </Text>
            <Text>{t('account_unlockDesc')}</Text>
            <Text color="cyan" bold>{t('account_pricing')}</Text>
            <Text> </Text>
            <Text color="gray">{t('account_runActivate')} <Text color="cyanBright" bold>{t('account_activateCmd')}</Text></Text>
          </Box>
        )}

        {status === 'expired' && (
          <Box marginTop={1}>
            <Text color="red">{t('account_licenseExpired')}</Text>
          </Box>
        )}

        {deactivating && <Text color="cyan">{t('account_deactivating')}</Text>}
      </Box>

      <Box marginTop={2}>
        <Text color="gray">
          {status === 'pro' ? `d:${t('hint_deactivate')}` : ''}
          {' '}{t('app_version', { version: process.env.APP_VERSION ?? '0.0.0' })}
        </Text>
      </Box>
    </Box>
  );
}
