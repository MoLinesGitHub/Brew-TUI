import React from 'react';
import { Text } from 'ink';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

const BADGE_STYLES: Record<BadgeVariant, { icon: string; color: string }> = {
  success: { icon: '\u2714', color: 'greenBright' },
  warning: { icon: '\u25CF', color: 'yellow' },
  error: { icon: '\u2718', color: 'redBright' },
  info: { icon: '\u25C6', color: 'blueBright' },
  muted: { icon: '\u25CB', color: 'gray' },
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const { icon, color } = BADGE_STYLES[variant];
  return <Text color={color}>{icon} {label}</Text>;
}
