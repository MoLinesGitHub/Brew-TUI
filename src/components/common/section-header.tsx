import React from 'react';
import { Box, Text } from 'ink';
import { GradientText } from '../../utils/gradient.js';

interface SectionHeaderProps {
  emoji: string;
  title: string;
  color?: string;
  gradient?: string[];
  count?: number | string;
}

export function SectionHeader({ emoji, title, color = '#FFD700', gradient, count }: SectionHeaderProps) {
  return (
    <Box gap={1}>
      <Text>{emoji}</Text>
      {gradient ? (
        <GradientText colors={gradient} bold>{title}</GradientText>
      ) : (
        <Text bold color={color}>{title}</Text>
      )}
      {count !== undefined && (
        <Text color="#6B7280">({count})</Text>
      )}
    </Box>
  );
}
