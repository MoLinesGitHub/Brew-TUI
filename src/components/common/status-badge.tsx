import React from 'react';
import { Text } from 'ink';
import { COLORS } from '../../utils/colors.js';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

const BADGE_STYLES: Record<BadgeVariant, { icon: string; color: string }> = {
  success: { icon: '\u2714', color: COLORS.success },
  warning: { icon: '\u25B2', color: COLORS.warning },
  error: { icon: '\u2718', color: COLORS.error },
  info: { icon: '\u25C6', color: COLORS.blue },
  muted: { icon: '\u25CB', color: COLORS.textSecondary },
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const { icon, color } = BADGE_STYLES[variant];
  return <Text color={color}>{icon} {label}</Text>;
}
