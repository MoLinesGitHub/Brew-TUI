import React from 'react';
import { Box, Text } from 'ink';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = 'white' }: StatCardProps) {
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      alignItems="center"
      minWidth={16}
    >
      <Text bold color={color}>{value}</Text>
      <Text color="#9CA3AF">{label}</Text>
    </Box>
  );
}
