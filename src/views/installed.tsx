import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { useNavigationStore } from '../stores/navigation-store.js';
import { useDebounce } from '../hooks/use-debounce.js';
import { formulaeToListItems, casksToListItems } from '../lib/brew-api.js';
import { SearchInput } from '../components/common/search-input.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { truncate } from '../utils/format.js';
import { t } from '../i18n/index.js';
import { useModalStore } from '../stores/modal-store.js';
import type { PackageListItem } from '../lib/types.js';

export function InstalledView() {
  const { formulae, casks, loading, errors, fetchInstalled } = useBrewStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const selectPackage = useNavigationStore((s) => s.selectPackage);

  const [filter, setFilter] = useState('');
  const [cursor, setCursor] = useState(0);
  const [tab, setTab] = useState<'formulae' | 'casks'>('formulae');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedFilter = useDebounce(filter, 200);
  const { openModal, closeModal } = useModalStore();

  useEffect(() => { fetchInstalled(); }, []);

  // While search bar is active, suppress global Escape so it only clears
  // the search bar rather than navigating away from this view.
  useEffect(() => {
    if (isSearching) {
      openModal();
      return () => { closeModal(); };
    }
    return undefined;
  }, [isSearching]);

  const allItems: PackageListItem[] = useMemo(() => {
    const items = tab === 'formulae'
      ? formulaeToListItems(formulae)
      : casksToListItems(casks);

    if (!debouncedFilter) return items;
    const lower = debouncedFilter.toLowerCase();
    return items.filter((p) =>
      p.name.toLowerCase().includes(lower) || p.desc.toLowerCase().includes(lower)
    );
  }, [formulae, casks, tab, debouncedFilter]);

  useInput((input, key) => {
    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        setFilter('');
      }
      return;
    }

    if (input === '/') {
      setIsSearching(true);
      return;
    }

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(0, allItems.length - 1)));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (input === 'g') {
      setCursor(0);
    } else if (input === 'G') {
      setCursor(Math.max(allItems.length - 1, 0));
    } else if (key.return && allItems[cursor]) {
      selectPackage(allItems[cursor].name);
      navigate('package-info');
    } else if (input === 'f') {
      setTab((t) => t === 'formulae' ? 'casks' : 'formulae');
      setCursor(0);
    }
  }, { isActive: true });

  if (loading.installed) return <Loading message={t('loading_installed')} />;
  if (errors.installed) return <ErrorMessage message={errors.installed} />;

  const MAX_VISIBLE_ROWS = 20;
  const start = Math.max(0, cursor - Math.floor(MAX_VISIBLE_ROWS / 2));
  const visible = allItems.slice(start, start + MAX_VISIBLE_ROWS);

  return (
    <Box flexDirection="column">
      <Box gap={2} marginBottom={1}>
        <Text
          bold={tab === 'formulae'}
          color={tab === 'formulae' ? 'cyan' : 'gray'}
          underline={tab === 'formulae'}
        >
          {t('installed_formulaeCount', { count: formulae.length })}
        </Text>
        <Text
          bold={tab === 'casks'}
          color={tab === 'casks' ? 'magenta' : 'gray'}
          underline={tab === 'casks'}
        >
          {t('installed_casksCount', { count: casks.length })}
        </Text>
        <Text color="gray" italic>  f:{t('hint_toggle')}</Text>
      </Box>

      {isSearching && (
        <Box marginBottom={1}>
          <SearchInput defaultValue={filter} onChange={setFilter} isActive={isSearching} />
        </Box>
      )}

      {!isSearching && filter && (
        <Text color="gray" italic>{t('installed_filterDisplay', { query: filter, count: allItems.length })}</Text>
      )}

      <Box flexDirection="column">
        {visible.map((item, i) => {
          const idx = start + i;
          const isCurrent = idx === cursor;
          return (
            <Box key={item.name} gap={1}>
              <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
              <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                {item.name}
              </Text>
              <Text color="green">{item.version}</Text>
              {item.outdated && <StatusBadge label={t('badge_outdated')} variant="warning" />}
              {item.pinned && <StatusBadge label={t('badge_pinned')} variant="info" />}
              {item.kegOnly && <StatusBadge label={t('badge_kegOnly')} variant="muted" />}
              {item.installedAsDependency && <StatusBadge label={t('badge_dep')} variant="muted" />}
              <Text color="gray">{truncate(item.desc, 40)}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          {allItems.length > 0
            ? `${cursor + 1}/${allItems.length}`
            : t('installed_noPackages')}
          {' '}{'\u2502'} /:{t('hint_search')} f:{t('hint_toggle')} enter:{t('hint_info')}
        </Text>
      </Box>
    </Box>
  );
}
