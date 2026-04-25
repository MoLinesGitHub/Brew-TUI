import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { COLORS } from '../../utils/colors.js';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = 'white' }: StatCardProps) {
  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 80;
  // Adapt min width to terminal: tight on narrow, comfortable on wide
  const minW = cols < 60 ? 12 : cols < 100 ? 14 : 16;

  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={0}
      flexDirection="column"
      alignItems="center"
      minWidth={minW}
    >
      <Text bold color={color}>{value}</Text>
      <Text color={COLORS.muted}>{label}</Text>
    </Box>
  );
}
