import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/colors.js';

interface ResultBannerProps {
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const STATUS_COLORS: Record<string, string> = {
  success: COLORS.success,
  error: COLORS.error,
  warning: COLORS.warning,
  info: COLORS.info,
};

export function ResultBanner({ status, message }: ResultBannerProps) {
  return (
    <Box borderStyle="round" borderColor={STATUS_COLORS[status]} paddingX={2} paddingY={0}>
      <Text color={STATUS_COLORS[status]} bold>{message}</Text>
    </Box>
  );
}
