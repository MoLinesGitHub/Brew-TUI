import React from 'react';
import { Box, Text } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import { isProView } from '../../lib/license/feature-gate.js';
import { t, useLocaleStore } from '../../i18n/index.js';
import type { ViewId } from '../../lib/types.js';
import type { TranslationKey } from '../../i18n/en.js';

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

// Only show these in the tab bar (skip detail/internal views)
const TAB_VIEWS: ViewId[] = [
  'dashboard', 'installed', 'search', 'outdated', 'services', 'doctor',
  'profiles', 'smart-cleanup', 'history', 'security-audit', 'account',
];

export function Header() {
  const currentView = useNavigationStore((s) => s.currentView);
  useLocaleStore((s) => s.locale); // subscribe so header re-renders on locale change

  return (
    <Box borderStyle="bold" borderBottom borderLeft={false} borderRight={false} borderTop={false} paddingX={1} flexWrap="wrap">
      <Text bold color="green">{'\u{1F37A}'} {t('app_title')}</Text>
      <Text> </Text>
      {TAB_VIEWS.map((view, i) => {
        const key = VIEW_KEYS[view];
        const viewLabel = t(VIEW_LABEL_KEYS[view]);
        const label = key ? `${key}:${viewLabel}` : viewLabel;
        const isPro = isProView(view);

        return (
          <React.Fragment key={view}>
            {i > 0 && <Text color="gray"> {'\u2502'} </Text>}
            <Text
              bold={view === currentView}
              color={view === currentView ? 'cyan' : 'gray'}
              underline={view === currentView}
            >
              {label}
            </Text>
            {isPro && <Text color="yellow" bold> {t('pro_badge')}</Text>}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
