import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/colors.js';

interface SelectableRowProps {
  isCurrent: boolean;
  label: string;
  dimColor?: boolean;
}

export function SelectableRow({ isCurrent, label, dimColor }: SelectableRowProps) {
  return (
    <Box>
      <Text color={isCurrent ? COLORS.success : COLORS.muted}>
        {isCurrent ? '\u25B6 ' : '  '}
      </Text>
      <Text color={isCurrent ? COLORS.text : COLORS.muted} dimColor={dimColor}>
        {label}
      </Text>
    </Box>
  );
}
