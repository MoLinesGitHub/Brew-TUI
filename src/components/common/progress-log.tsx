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
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      {title && (
        <Box marginBottom={1}>
          {isRunning && <Spinner label="" />}
          <Text bold color="cyan"> {title}</Text>
        </Box>
      )}
      {visible.map((line, i) => (
        <Text key={i} color="gray" wrap="wrap">{line}</Text>
      ))}
      {lines.length === 0 && !isRunning && (
        <Text color="gray" italic>{t('progress_noOutput')}</Text>
      )}
    </Box>
  );
}
