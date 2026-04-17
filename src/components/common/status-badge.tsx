import React from 'react';
import { Text } from 'ink';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

const BADGE_STYLES: Record<BadgeVariant, { icon: string; color: string }> = {
  success: { icon: '\u2714', color: '#22C55E' },
  warning: { icon: '\u25CF', color: '#F59E0B' },
  error: { icon: '\u2718', color: '#EF4444' },
  info: { icon: '\u25C6', color: '#3B82F6' },
  muted: { icon: '\u25CB', color: '#6B7280' },
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const { icon, color } = BADGE_STYLES[variant];
  return <Text color={color}>{icon} {label}</Text>;
}
