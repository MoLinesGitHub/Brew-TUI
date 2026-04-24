import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/colors.js';
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
        borderColor={COLORS.brand}
        paddingX={3}
        paddingY={2}
        flexDirection="column"
        alignItems="center"
        width="80%"
      >
        <Text bold color={COLORS.brand}>{'\u2B50'} {t('upgrade_proFeature', { title })}</Text>
        <Text> </Text>
        <Text color={COLORS.text} wrap="wrap">{t(keys.desc)}</Text>
        <Text> </Text>
        <Box flexDirection="column" alignItems="center">
          <Text color={COLORS.info} bold>{t('upgrade_pricing')}</Text>
          <Text> </Text>
          <Text color={COLORS.muted}>{t('upgrade_buyAt')}</Text>
          <Text color={COLORS.sky} bold>  {t('upgrade_buyUrl')}</Text>
          <Text> </Text>
          <Text color={COLORS.muted}>{t('upgrade_activateWith')}</Text>
          <Text color={COLORS.success} bold>  {t('upgrade_activateCmd')}</Text>
          <Text> </Text>
          <Text color={COLORS.brand}>{t('upgrade_proLabel')}</Text>
        </Box>
      </Box>
    </Box>
  );
}
