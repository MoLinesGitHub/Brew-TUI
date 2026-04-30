import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import { isProView, isTeamView } from '../../lib/license/feature-gate.js';
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
  rollback: 'view_rollback',
  brewfile: 'view_brewfile',
  sync: 'view_sync',
  'security-audit': 'view_securityAudit',
  compliance: 'view_compliance',
  account: 'view_account',
};

const VIEW_KEYS: Record<ViewId, string> = {
  dashboard: '1', installed: '2', search: '', outdated: '3',
  'package-info': '', services: '4', doctor: '5',
  profiles: '6', 'smart-cleanup': '7', history: '8', 'security-audit': '9',
  rollback: '', brewfile: '', sync: '', compliance: '',
  account: '0',
};

const TAB_VIEWS: ViewId[] = [
  'dashboard', 'installed', 'outdated', 'package-info', 'services', 'doctor',
  'profiles', 'smart-cleanup', 'history', 'rollback', 'brewfile', 'sync', 'security-audit', 'compliance', 'account',
];

function MenuItem({ view, currentView }: { view: ViewId; currentView: ViewId }) {
  const key = VIEW_KEYS[view];
  const viewLabel = t(VIEW_LABEL_KEYS[view]);
  const isPro = isProView(view) || isTeamView(view);
  const isActive = view === currentView;
  const isAccount = view === 'account';
  // Indicator for keyless views: package-info uses Enter, account uses 0
  const indicator = key || (view === 'package-info' ? '\u21B2' : ' ');

  return (
    <Box>
      {isActive ? <Text color={COLORS.success} bold>{'\u25B6'} </Text> : <Text>  </Text>}
      <Text bold color={key ? COLORS.white : COLORS.textSecondary}>{indicator}</Text>
      <Text bold={isActive} underline={isActive} color={isActive ? COLORS.success : isAccount ? COLORS.gold : COLORS.textSecondary}> {viewLabel}</Text>
      {isPro && <Text color={COLORS.brand} bold> {t('pro_badge')}</Text>}
    </Box>
  );
}

const COL1_VIEWS = TAB_VIEWS.slice(0, 6);
const COL2_VIEWS = TAB_VIEWS.slice(6);

export function Header() {
  const currentView = useNavigationStore((s) => s.currentView);
  useLocaleStore((s) => s.locale);
  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 80;
  const isNarrow = cols < 95;

  const logoBlock = (
    <Box flexDirection="column" flexShrink={0}>
      {LOGO_BREW.map((brew, i) => (
        <Box key={i}>
          <GradientText colors={GRADIENTS.gold}>{brew}</GradientText>
          <GradientText colors={GRADIENTS.darkGold}>{LOGO_TUI[i]}</GradientText>
        </Box>
      ))}
    </Box>
  );

  const menuBlock = (
    <Box borderStyle="round" borderColor={COLORS.lavender} paddingX={1} flexDirection="column" alignSelf={isNarrow ? 'flex-start' : 'center'}>
      <Box flexDirection="row">
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
      <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={COLORS.lavender} marginTop={0}>
        <Text bold color={COLORS.white}>S</Text>
        <Text color={COLORS.textSecondary}> {t('hint_search')}</Text>
        <Text color={COLORS.lavender}> {'\u2503'} </Text>
        <Text bold color={COLORS.white}>L</Text>
        <Text color={COLORS.textSecondary}> {t('hint_lang')}</Text>
      </Box>
    </Box>
  );

  if (isNarrow) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {logoBlock}
        <Box marginTop={1}>{menuBlock}</Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="row" paddingX={1} alignItems="center">
      {logoBlock}
      <Box marginLeft={2}>{menuBlock}</Box>
    </Box>
  );
}
