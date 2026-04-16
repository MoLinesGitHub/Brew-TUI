import React from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  useInput((input) => {
    if (input === 'y' || input === 'Y') onConfirm();
    else if (input === 'n' || input === 'N' || input === 'q') onCancel();
  });

  return (
    <Box borderStyle="double" borderColor="yellow" paddingX={2} paddingY={1} flexDirection="column">
      <Text bold color="yellow">{message}</Text>
      <Box marginTop={1}>
        <Text color="green">[Y]es</Text>
        <Text> / </Text>
        <Text color="red">[N]o</Text>
      </Box>
    </Box>
  );
}
