import React from 'react';
import { Box, Text } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import { isProView } from '../../lib/license/feature-gate.js';
import { COLORS } from '../../utils/colors.js';
import { t, useLocaleStore } from '../../i18n/index.js';
import { GradientText, GRADIENTS } from '../../utils/gradient.js';
import type { ViewId } from '../../lib/types.js';
import type { TranslationKey } from '../../i18n/en.js';

// BREW portion (cols 0-27) and TUI portion (cols 28+) rendered in different colors
const LOGO_BREW = [
  '\u256D\u2501\u2501\u256E\u2571\u256D\u2501\u2501\u2501\u256E\u256D\u2501\u2501\u2501\u256E\u256D\u256E\u256D\u256E\u256D\u256E\u2571\u2571\u2571\u2571\u2571\u2571\u2571',
  '\u2503\u256D\u256E\u2503\u2571\u2503\u256D\u2501\u256E\u2503\u2503\u256D\u2501\u2501\u256F\u2503\u2503\u2503\u2503\u2503\u2503\u2571\u2571\u2571\u2571\u2571\u2571\u2571',
  '\u2503\u2570\u256F\u2570\u256E\u2503\u2570\u2501\u256F\u2503\u2503\u2570\u2501\u2501\u256E\u2503\u2503\u2503\u2503\u2503\u2503\u2571\u2571\u2571\u2571\u2571\u2571\u2571',
  '\u2503\u256D\u2501\u256E\u2503\u2503\u256D\u256E\u256D\u256F\u2503\u256D\u2501\u2501\u256F\u2503\u2570\u256F\u2570\u256F\u2503\u256D\u2501\u2501\u2533\u2501\u2501\u256E',
  '\u2503\u2570\u2501\u256F\u2503\u2503\u2503\u2503\u2570\u256E\u2503\u2570\u2501\u2501\u256E\u2570\u256E\u256D\u256E\u256D\u256F\u2570\u2501\u2501\u253B\u2501\u2501\u256F',
  '\u2570\u2501\u2501\u2501\u256F\u2570\u256F\u2570\u2501\u256F\u2570\u2501\u2501\u2501\u256F\u2571\u2570\u256F\u2570\u256F\u2571\u2571\u2571\u2571\u2571\u2571\u2571\u2571',
];
const LOGO_TUI = [
  '\u256D\u2501\u2501\u2501\u2501\u256E\u256D\u256E\u2571\u256D\u256E\u256D\u2501\u2501\u256E',
  '\u2503\u256D\u256E\u256D\u256E\u2503\u2503\u2503\u2571\u2503\u2503\u2570\u252B\u2523\u256F',
  '\u2570\u256F\u2503\u2503\u2570\u256F\u2503\u2503\u2571\u2503\u2503\u2571\u2503\u2503',
  '\u2571\u2571\u2503\u2503\u2571\u2571\u2503\u2503\u2571\u2503\u2503\u2571\u2503\u2503',
  '\u2571\u2571\u2503\u2503\u2571\u2571\u2503\u2570\u2501\u256F\u2503\u256D\u252B\u2523\u256E',
  '\u2571\u2571\u2570\u256F\u2571\u2571\u2570\u2501\u2501\u2501\u256F\u2570\u2501\u2501\u256F',
];

const VIEW_LABEL_KEYS: Record<ViewId, TranslationKey> = {
  dashboard: 'view_dashboard',
  installed: 'view_installed',
  search: 'view_search',
  outdated: 'view_outdated',
  'package-info': 'view_packageInfo',
  services: 'view_services',
  doctor: 'view_doctor',
  profiles: 'view_profiles',
  'smart-cleanup': 'view_smartCleanup',
  history: 'view_history',
  'security-audit': 'view_securityAudit',
  account: 'view_account',
};

const VIEW_KEYS: Record<ViewId, string> = {
  dashboard: '1', installed: '2', search: '3', outdated: '4',
  'package-info': '', services: '5', doctor: '6',
  profiles: '7', 'smart-cleanup': '8', history: '9', 'security-audit': '0',
  account: '',
};

const TAB_VIEWS: ViewId[] = [
  'dashboard', 'installed', 'search', 'outdated', 'package-info', 'services', 'doctor',
  'profiles', 'smart-cleanup', 'history', 'security-audit', 'account',
];

function MenuItem({ view, currentView }: { view: ViewId; currentView: ViewId }) {
  const key = VIEW_KEYS[view];
  const viewLabel = t(VIEW_LABEL_KEYS[view]);
  const isPro = isProView(view);
  const isActive = view === currentView;
  const isAccount = view === 'account';

  return (
    <Box>
      {isActive ? <Text color={COLORS.sky}>{'\u25CF'} </Text> : <Text>  </Text>}
      {key ? (
        <>
          <Text bold color="#FFFFFF">{key}</Text>
          <Text bold={isActive} underline={isActive} color={isActive ? COLORS.success : isAccount ? COLORS.gold : COLORS.textSecondary}> {viewLabel}</Text>
        </>
      ) : (
        <Text bold={isActive} underline={isActive} color={isActive ? COLORS.success : isAccount ? COLORS.gold : COLORS.textSecondary}>  {viewLabel}</Text>
      )}
      {isPro && <Text color={COLORS.brand} bold> {t('pro_badge')}</Text>}
    </Box>
  );
}

const COL1_VIEWS = TAB_VIEWS.slice(0, 6);
const COL2_VIEWS = TAB_VIEWS.slice(6);

export function Header() {
  const currentView = useNavigationStore((s) => s.currentView);
  useLocaleStore((s) => s.locale);

  return (
    <Box flexDirection="row" paddingX={1}>
      <Box flexDirection="column" flexShrink={0}>
        {LOGO_BREW.map((brew, i) => (
          <Box key={i}>
            <GradientText colors={GRADIENTS.gold}>{brew}</GradientText>
            <GradientText colors={['#B8860B', '#8B6914', '#6B4F10']}>{LOGO_TUI[i]}</GradientText>
          </Box>
        ))}
      </Box>
      <Box borderStyle="round" borderColor={COLORS.lavender} paddingX={1} marginLeft={2} flexDirection="row" alignSelf="center">
        <Box flexDirection="column">
          {COL1_VIEWS.map((view) => (
            <MenuItem key={view} view={view} currentView={currentView} />
          ))}
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          {COL2_VIEWS.map((view) => (
            <MenuItem key={view} view={view} currentView={currentView} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
