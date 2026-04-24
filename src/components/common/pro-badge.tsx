import React from 'react';
import { Text } from 'ink';
import { COLORS } from '../../utils/colors.js';

export function ProBadge() {
  return <Text color={COLORS.brand} bold>[PRO]</Text>;
}
