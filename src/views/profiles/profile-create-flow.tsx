import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { COLORS } from '../../utils/colors.js';
import { t } from '../../i18n/index.js';

interface ProfileCreateNameProps {
  onSubmit: (name: string) => void;
}

export function ProfileCreateName({ onSubmit }: ProfileCreateNameProps) {
  return (
    <Box flexDirection="column">
      <Text bold>{t('profiles_createName')}</Text>
      <TextInput
        placeholder={t('profiles_namePlaceholder')}
        onSubmit={onSubmit}
      />
    </Box>
  );
}

interface ProfileCreateDescProps {
  name: string;
  loadError: string | null;
  onSubmit: (desc: string) => void;
}

export function ProfileCreateDesc({ name, loadError, onSubmit }: ProfileCreateDescProps) {
  return (
    <Box flexDirection="column">
      <Text bold>{t('profiles_createDesc', { name })}</Text>
      {loadError && <Text color={COLORS.error}>{t('error_prefix')}{loadError}</Text>}
      <TextInput
        placeholder={t('profiles_descPlaceholder')}
        onSubmit={onSubmit}
      />
    </Box>
  );
}
