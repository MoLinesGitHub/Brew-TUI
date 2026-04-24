import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/colors.js';

interface SelectableRowProps {
  isCurrent: boolean;
  children: React.ReactNode;
  gap?: number;
}

export function SelectableRow({ isCurrent, children, gap = 1 }: SelectableRowProps) {
  return (
    <Box gap={gap}>
      <Text color={isCurrent ? COLORS.success : COLORS.muted}>
        {isCurrent ? '\u25B6' : ' '}
      </Text>
      {children}
    </Box>
  );
}
