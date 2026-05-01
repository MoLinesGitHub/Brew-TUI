import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { COLORS } from '../../utils/colors.js';
import { t } from '../../i18n/index.js';
import { SPACING } from '../../utils/spacing.js';

interface ProgressLogProps {
  lines: string[];
  isRunning: boolean;
  title?: string;
  maxVisible?: number;
}

export function ProgressLog({ lines, isRunning, title, maxVisible = 15 }: ProgressLogProps) {
  const visible = lines.slice(-maxVisible);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={COLORS.sky} paddingX={SPACING.xs}>
      {title && (
        <Box marginBottom={SPACING.xs}>
          {isRunning && <Spinner label="" />}
          <Text bold color={COLORS.sky}> {title}</Text>
        </Box>
      )}
      {visible.map((line, i) => (
        <Text key={lines.length - visible.length + i} color={COLORS.muted} wrap="wrap">{line}</Text>
      ))}
      {lines.length === 0 && !isRunning && (
        <Text color={COLORS.textSecondary} italic>{t('progress_noOutput')}</Text>
      )}
    </Box>
  );
}
