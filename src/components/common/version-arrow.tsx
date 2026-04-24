import React from 'react';
import { Text } from 'ink';
import { COLORS } from '../../utils/colors.js';
import { t } from '../../i18n/index.js';

interface VersionArrowProps {
  current: string;
  latest: string;
}

export function VersionArrow({ current, latest }: VersionArrowProps) {
  return (
    <>
      <Text color={COLORS.muted}>{t('version_installed')} </Text>
      <Text color={COLORS.error}>{current}</Text>
      <Text color={COLORS.warning}>{' \u2500\u2500 '}</Text>
      <Text color={COLORS.gold}>{'\u25B6'}</Text>
      <Text color={COLORS.muted}> {t('version_available')} </Text>
      <Text color={COLORS.teal}>{latest}</Text>
    </>
  );
}
