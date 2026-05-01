import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { COLORS } from '../../utils/colors.js';
import { t, useLocaleStore } from '../../i18n/index.js';
import { SPACING } from '../../utils/spacing.js';

interface LoadingProps {
  message?: string;
}

export function Loading({ message }: LoadingProps) {
  useLocaleStore((s) => s.locale); // re-render on locale change
  return (
    <Box paddingY={SPACING.xs}>
      <Spinner label={message ?? t('loading_default')} />
    </Box>
  );
}

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  useLocaleStore((s) => s.locale); // re-render on locale change
  return (
    <Box paddingY={SPACING.xs}>
      <Text color={COLORS.error} bold>{'\u2718'} {t('error_prefix')}</Text>
      <Text color={COLORS.error}>{message}</Text>
    </Box>
  );
}
