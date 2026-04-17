import React from 'react';
import { Box, Text } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import { isProView } from '../../lib/license/feature-gate.js';
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
  'dashboard', 'installed', 'search', 'outdated', 'services', 'doctor',
  'profiles', 'smart-cleanup', 'history', 'security-audit', 'account',
];

export function Header() {
  const currentView = useNavigationStore((s) => s.currentView);
  useLocaleStore((s) => s.locale);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" paddingX={1}>
        {LOGO_BREW.map((brew, i) => (
          <Box key={i}>
            <GradientText colors={GRADIENTS.gold}>{brew}</GradientText>
            <GradientText colors={['#B8860B', '#8B6914', '#6B4F10']}>{LOGO_TUI[i]}</GradientText>
          </Box>
        ))}
      </Box>
      <Box borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false} borderColor="#FFD700" paddingX={1} flexWrap="wrap">
        {TAB_VIEWS.map((view, i) => {
          const key = VIEW_KEYS[view];
          const viewLabel = t(VIEW_LABEL_KEYS[view]);
          const label = key ? `${key}:${viewLabel}` : viewLabel;
          const isPro = isProView(view);

          return (
            <React.Fragment key={view}>
              {i > 0 && <Text color="#4B5563"> {'\u2502'} </Text>}
              <Text
                bold={view === currentView}
                color={view === currentView ? '#22C55E' : '#6B7280'}
                underline={view === currentView}
              >
                {view === currentView ? `\u25CF ${label}` : label}
              </Text>
              {isPro && <Text color="#FF6B2B" bold> {t('pro_badge')}</Text>}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
