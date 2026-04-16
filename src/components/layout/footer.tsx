import React from 'react';
import { Box, Text } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import type { ViewId } from '../../lib/types.js';

const VIEW_HINTS: Record<ViewId, string[]> = {
  dashboard: ['1-0:navigate', 'tab:next', 'q:quit'],
  installed: ['/:filter', 'enter:info', 'f:toggle', 'tab:next', 'q:quit'],
  search: ['type to search', 'enter:install', 'esc:back', 'q:quit'],
  outdated: ['enter:upgrade', 'A:upgrade all', 'tab:next', 'q:quit'],
  'package-info': ['i:install', 'u:uninstall', 'U:upgrade', 'esc:back', 'q:quit'],
  services: ['s:start', 'S:stop', 'r:restart', 'tab:next', 'q:quit'],
  doctor: ['r:refresh', 'tab:next', 'q:quit'],
  profiles: ['n:new', 'enter:details', 'i:import', 'd:delete', 'q:quit'],
  'smart-cleanup': ['enter:toggle', 'c:clean', 'r:refresh', 'q:quit'],
  history: ['/:search', 'f:filter', 'c:clear', 'q:quit'],
  'security-audit': ['r:scan', 'enter:details', 'q:quit'],
  account: ['d:deactivate', 'q:quit'],
};

export function Footer() {
  const currentView = useNavigationStore((s) => s.currentView);
  const hints = VIEW_HINTS[currentView] ?? [];

  return (
    <Box paddingX={1} marginTop={0}>
      {hints.map((hint, i) => (
        <React.Fragment key={hint}>
          {i > 0 && <Text color="gray"> {'\u2502'} </Text>}
          <Text color="yellowBright" dimColor>{hint}</Text>
        </React.Fragment>
      ))}
    </Box>
  );
}
