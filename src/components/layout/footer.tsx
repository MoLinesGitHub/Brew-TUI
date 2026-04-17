import React from 'react';
import { Box, Text } from 'ink';
import { useNavigationStore } from '../../stores/navigation-store.js';
import { t, useLocaleStore } from '../../i18n/index.js';
import type { ViewId } from '../../lib/types.js';
import type { TranslationKey } from '../../i18n/en.js';

type HintDef = [key: string, action: TranslationKey] | [text: TranslationKey];

const VIEW_HINT_DEFS: Record<ViewId, HintDef[]> = {
  dashboard: [['1-0', 'hint_navigate'], ['tab', 'hint_next'], ['q', 'hint_quit']],
  installed: [['/', 'hint_filter'], ['enter', 'hint_info'], ['f', 'hint_toggle'], ['tab', 'hint_next'], ['q', 'hint_quit']],
  search: [['hint_typeToSearch'], ['enter', 'hint_install'], ['esc', 'hint_back'], ['q', 'hint_quit']],
  outdated: [['enter', 'hint_upgrade'], ['A', 'hint_upgradeAll'], ['tab', 'hint_next'], ['q', 'hint_quit']],
  'package-info': [['i', 'hint_install'], ['u', 'hint_uninstall'], ['U', 'hint_upgrade'], ['esc', 'hint_back'], ['q', 'hint_quit']],
  services: [['s', 'hint_start'], ['S', 'hint_stop'], ['R', 'hint_restart'], ['r', 'hint_refresh'], ['tab', 'hint_next'], ['q', 'hint_quit']],
  doctor: [['r', 'hint_refresh'], ['tab', 'hint_next'], ['q', 'hint_quit']],
  profiles: [['n', 'hint_new'], ['enter', 'hint_details'], ['i', 'hint_import'], ['d', 'hint_delete'], ['q', 'hint_quit']],
  'smart-cleanup': [['enter', 'hint_toggle'], ['c', 'hint_clean'], ['r', 'hint_refresh'], ['q', 'hint_quit']],
  history: [['/', 'hint_search'], ['f', 'hint_filter'], ['c', 'hint_clear'], ['q', 'hint_quit']],
  'security-audit': [['r', 'hint_scan'], ['enter', 'hint_details'], ['q', 'hint_quit']],
  account: [['d', 'hint_deactivate'], ['q', 'hint_quit']],
};

function renderHint(def: HintDef): string {
  if (def.length === 1) return t(def[0]);
  return `${def[0]}:${t(def[1])}`;
}

export function Footer() {
  const currentView = useNavigationStore((s) => s.currentView);
  const locale = useLocaleStore((s) => s.locale);
  const defs = VIEW_HINT_DEFS[currentView] ?? [];

  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor="gray" paddingX={1} flexWrap="wrap">
      {defs.map((def, i) => {
        const text = renderHint(def);
        return (
          <React.Fragment key={text}>
            {i > 0 && <Text color="gray"> {'\u2502'} </Text>}
            <Text color="yellowBright" dimColor>{text}</Text>
          </React.Fragment>
        );
      })}
      <Text color="gray"> {'\u2502'} </Text>
      <Text color="yellowBright" dimColor>L:{t('hint_lang')}({locale})</Text>
    </Box>
  );
}
