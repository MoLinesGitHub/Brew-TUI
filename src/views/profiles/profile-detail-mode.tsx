import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/colors.js';
import { t } from '../../i18n/index.js';
import { formatDate } from '../../utils/format.js';
import type { Profile } from '../../lib/profiles/types.js';
import { SPACING } from '../../utils/spacing.js';

interface ProfileDetailModeProps {
  profile: Profile;
}

export function ProfileDetailMode({ profile }: ProfileDetailModeProps) {
  return (
    <Box flexDirection="column">
      <Text bold color={COLORS.gold}>{profile.name}</Text>
      <Text color={COLORS.muted}>{profile.description}</Text>
      <Text color={COLORS.muted}>{t('profiles_created', { date: formatDate(profile.createdAt) })}</Text>
      <Box marginTop={SPACING.xs} flexDirection="column">
        <Text bold>{t('profiles_formulaeCount', { count: profile.formulae.length })}</Text>
        <Box paddingLeft={SPACING.sm} flexDirection="column">
          {profile.formulae.slice(0, 30).map((f) => (
            <Text key={f} color={COLORS.muted}>{f}</Text>
          ))}
          {profile.formulae.length > 30 && (
            <Text color={COLORS.textSecondary} italic>{t('common_andMore', { count: profile.formulae.length - 30 })}</Text>
          )}
        </Box>
        <Text bold>{t('profiles_casksCount', { count: profile.casks.length })}</Text>
        <Box paddingLeft={SPACING.sm} flexDirection="column">
          {profile.casks.map((c) => (
            <Text key={c} color={COLORS.muted}>{c}</Text>
          ))}
        </Box>
      </Box>
      <Box marginTop={SPACING.xs}>
        <Text color={COLORS.textSecondary}>esc:{t('hint_back')} e:{t('hint_edit')} i:{t('hint_importProfile')}</Text>
      </Box>
    </Box>
  );
}
