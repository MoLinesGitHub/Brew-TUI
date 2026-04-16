import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useLicenseStore } from '../stores/license-store.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';

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
      <Text bold>{'\u{1F464}'} Account & License</Text>

      {confirmDeactivate && (
        <Box marginY={1}>
          <ConfirmDialog
            message="Deactivate your Pro license on this machine?"
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
          <Text color="gray">Status:</Text>
          {status === 'pro' && <Text color="green" bold>[Pro]</Text>}
          {status === 'free' && <Text color="gray">[Free]</Text>}
          {status === 'expired' && <Text color="red">[Expired]</Text>}
          {status === 'validating' && <Text color="cyan">[Validating...]</Text>}
        </Box>

        {license && (
          <>
            <Box gap={1}>
              <Text color="gray">Email:</Text>
              <Text>{license.customerEmail}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">Name:</Text>
              <Text>{license.customerName}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">Plan:</Text>
              <Text>{license.plan === 'monthly' ? '$9/month' : '$49/year'}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">Key:</Text>
              <Text>{maskKey(license.key)}</Text>
            </Box>
            {license.expiresAt && (
              <Box gap={1}>
                <Text color="gray">Expires:</Text>
                <Text>{new Date(license.expiresAt).toLocaleDateString()}</Text>
              </Box>
            )}
            <Box gap={1}>
              <Text color="gray">Activated:</Text>
              <Text>{new Date(license.activatedAt).toLocaleDateString()}</Text>
            </Box>
          </>
        )}

        {status === 'free' && (
          <Box flexDirection="column" marginTop={2} borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
            <Text bold color="yellow">{'\u2B50'} Upgrade to Brew-TUI Pro</Text>
            <Text> </Text>
            <Text>Unlock Profiles, Smart Cleanup, History, and Security Audit.</Text>
            <Text color="cyan" bold>$9/month or $49/year</Text>
            <Text> </Text>
            <Text color="gray">Run: <Text color="green" bold>brew-tui activate {'<'}key{'>'}</Text></Text>
          </Box>
        )}

        {status === 'expired' && (
          <Box marginTop={1}>
            <Text color="red">Your license has expired. Renew to continue using Pro features.</Text>
          </Box>
        )}

        {deactivating && <Text color="cyan">Deactivating...</Text>}
      </Box>

      <Box marginTop={2}>
        <Text color="gray">
          {status === 'pro' ? 'd:deactivate' : ''}
          {' '}Brew-TUI v0.1.0
        </Text>
      </Box>
    </Box>
  );
}
