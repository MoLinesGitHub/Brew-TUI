import React from 'react';
import { Text } from 'ink';
import { COLORS } from '../../utils/colors.js';
import { t } from '../../i18n/index.js';

export function ProBadge() {
  return <Text color={COLORS.brand} bold>{'\u2605'}{t('pro_badge')}</Text>;
}
