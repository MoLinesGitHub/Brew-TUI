import React from 'react';
import { Box, Text } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import { isProView } from '../../lib/license/feature-gate.js';
import type { ViewId } from '../../lib/types.js';

const VIEW_LABELS: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  installed: 'Installed',
  search: 'Search',
  outdated: 'Outdated',
  'package-info': 'Pkg Info',
  services: 'Services',
  doctor: 'Doctor',
  profiles: 'Profiles',
  'smart-cleanup': 'Cleanup',
  history: 'History',
  'security-audit': 'Security',
  account: 'Account',
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

  return (
    <Box borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false} paddingX={1} flexWrap="wrap">
      <Text bold color="green">{'\u{1F37A}'} Brew-TUI</Text>
      <Text> </Text>
      {TAB_VIEWS.map((view, i) => {
        const key = VIEW_KEYS[view];
        const label = key ? `${key}:${VIEW_LABELS[view]}` : VIEW_LABELS[view];
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
            {isPro && <Text color="yellow" bold> PRO</Text>}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
