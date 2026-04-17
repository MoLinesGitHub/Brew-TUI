import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { t } from '../../i18n/index.js';

interface ProgressLogProps {
  lines: string[];
  isRunning: boolean;
  title?: string;
  maxVisible?: number;
}

export function ProgressLog({ lines, isRunning, title, maxVisible = 15 }: ProgressLogProps) {
  const visible = lines.slice(-maxVisible);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#38BDF8" paddingX={1}>
      {title && (
        <Box marginBottom={1}>
          {isRunning && <Spinner label="" />}
          <Text bold color="#38BDF8"> {title}</Text>
        </Box>
      )}
      {visible.map((line, i) => (
        <Text key={i} color="#9CA3AF" wrap="wrap">{line}</Text>
      ))}
      {lines.length === 0 && !isRunning && (
        <Text color="#6B7280" italic>{t('progress_noOutput')}</Text>
      )}
    </Box>
  );
}
