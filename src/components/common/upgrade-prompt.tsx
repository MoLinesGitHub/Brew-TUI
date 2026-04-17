import React from 'react';
import { Box, Text } from 'ink';
import { t } from '../../i18n/index.js';
import type { ViewId } from '../../lib/types.js';
import type { TranslationKey } from '../../i18n/en.js';

const FEATURE_KEYS: Record<string, { title: TranslationKey; desc: TranslationKey }> = {
  profiles: { title: 'upgrade_profiles', desc: 'upgrade_profilesDesc' },
  'smart-cleanup': { title: 'upgrade_cleanup', desc: 'upgrade_cleanupDesc' },
  history: { title: 'upgrade_history', desc: 'upgrade_historyDesc' },
  'security-audit': { title: 'upgrade_security', desc: 'upgrade_securityDesc' },
};

interface UpgradePromptProps {
  viewId: ViewId;
}

export function UpgradePrompt({ viewId }: UpgradePromptProps) {
  const keys = FEATURE_KEYS[viewId];
  if (!keys) return null;

  const title = t(keys.title);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Box
        borderStyle="double"
        borderColor="cyan"
        paddingX={4}
        paddingY={2}
        flexDirection="column"
        alignItems="center"
      >
        <Text bold color="cyanBright">{'\u2B50'} {t('upgrade_proFeature', { title })}</Text>
        <Text> </Text>
        <Text color="white">{t(keys.desc)}</Text>
        <Text> </Text>
        <Box flexDirection="column" alignItems="center">
          <Text color="cyan" bold>{t('upgrade_pricing')}</Text>
          <Text> </Text>
          <Text color="gray">{t('upgrade_activateWith')}</Text>
          <Text color="cyanBright" bold>  {t('upgrade_activateCmd')}</Text>
          <Text> </Text>
          <Text color="gray">{t('upgrade_proLabel')}</Text>
        </Box>
      </Box>
    </Box>
  );
}
