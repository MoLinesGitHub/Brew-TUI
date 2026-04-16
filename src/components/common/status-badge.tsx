import React from 'react';
import { Text } from 'ink';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

const COLORS: Record<BadgeVariant, string> = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'cyan',
  muted: 'gray',
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return <Text color={COLORS[variant]}>[{label}]</Text>;
}
