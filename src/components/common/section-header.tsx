import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/colors.js';
import { GradientText } from '../../utils/gradient.js';

interface SectionHeaderProps {
  emoji: string;
  title: string;
  color?: string;
  gradient?: string[];
  count?: number | string;
}

export function SectionHeader({ emoji, title, color = COLORS.gold, gradient, count }: SectionHeaderProps) {
  return (
    <Box gap={1}>
      <Text>{emoji} </Text>
      {gradient ? (
        <GradientText colors={gradient} bold>{title}</GradientText>
      ) : (
        <Text bold color={color}>{title}</Text>
      )}
      {count !== undefined && (
        <Text color={COLORS.textSecondary}>({count})</Text>
      )}
    </Box>
  );
}
