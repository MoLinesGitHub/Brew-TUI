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
      paddingX={2}
      paddingY={0}
      flexDirection="column"
      alignItems="center"
      minWidth={18}
    >
      <Text bold color={color}>{value}</Text>
      <Text color="gray">{label}</Text>
    </Box>
  );
}
