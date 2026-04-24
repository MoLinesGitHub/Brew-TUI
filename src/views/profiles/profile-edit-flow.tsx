import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { COLORS } from '../../utils/colors.js';
import { t } from '../../i18n/index.js';

interface ProfileEditNameProps {
  defaultName: string;
  onSubmit: (name: string) => void;
}

export function ProfileEditName({ defaultName, onSubmit }: ProfileEditNameProps) {
  return (
    <Box flexDirection="column">
      <Text bold>{t('profiles_editName')}</Text>
      <TextInput
        defaultValue={defaultName}
        onSubmit={onSubmit}
      />
    </Box>
  );
}

interface ProfileEditDescProps {
  name: string;
  defaultDesc: string;
  loadError: string | null;
  onSubmit: (desc: string) => void;
}

export function ProfileEditDesc({ name, defaultDesc, loadError, onSubmit }: ProfileEditDescProps) {
  return (
    <Box flexDirection="column">
      <Text bold>{t('profiles_editDesc', { name })}</Text>
      {loadError && <Text color={COLORS.error}>{t('error_prefix')}{loadError}</Text>}
      <TextInput
        defaultValue={defaultDesc}
        onSubmit={onSubmit}
      />
    </Box>
  );
}
