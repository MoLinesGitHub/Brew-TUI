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
      {/* Tab selector — both tabs always have a round border so the tab bar
          height stays constant when switching (prevents content jump). The
          inactive tab uses a dim gray border to signal it is not selected. */}
      <Box marginBottom={1} gap={1}>
        <Box
          borderStyle="round"
          borderColor={tab === 'formulae' ? 'cyanBright' : 'gray'}
          paddingX={1}
        >
          <Text bold={tab === 'formulae'} color={tab === 'formulae' ? 'cyanBright' : 'gray'}>
            {'\u{1F4E6}'} {t('installed_formulaeCount', { count: formulae.length })}
          </Text>
        </Box>
        <Box
          borderStyle="round"
          borderColor={tab === 'casks' ? 'magentaBright' : 'gray'}
          paddingX={1}
        >
          <Text bold={tab === 'casks'} color={tab === 'casks' ? 'magentaBright' : 'gray'}>
            {'\u{1F37A}'} {t('installed_casksCount', { count: casks.length })}
          </Text>
        </Box>
      </Box>

      {/* Search bar */}
      {isSearching && (
        <Box marginBottom={1} borderStyle="round" borderColor="yellowBright" paddingX={1}>
          <SearchInput defaultValue={filter} onChange={setFilter} isActive={isSearching} />
        </Box>
      )}

      {/* Column header — 1 space prefix matches the 1-char cursor glyph in data
          rows; gap={1} is shared by both header and data rows via the parent Box,
          so widths must match: ' ' + gap(1) + padEnd(27) aligns with data rows. */}
      <Box gap={1} borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false} borderColor="gray">
        <Text color="white" bold>{' '}{'Package'.padEnd(27)}</Text>
        <Text color="white" bold>{'Version'.padEnd(12)}</Text>
        <Text color="white" bold>{'Status'}</Text>
      </Box>

      {/* Package list */}
      <Box flexDirection="column">
        {visible.length === 0 && (
          <Box paddingY={1} justifyContent="center">
            <Text color="gray" italic>{t('installed_noPackages')}</Text>
          </Box>
        )}
        {start > 0 && (
          <Text color="gray" dimColor>  {t('scroll_moreAbove', { count: start })}</Text>
        )}
        {visible.map((item, i) => {
          const idx = start + i;
          const isCurrent = idx === cursor;
          return (
            <Box key={item.name} gap={1}>
              <Text color={isCurrent ? 'greenBright' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
              <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                {truncate(item.name, 27).padEnd(27)}
              </Text>
              <Text color="cyanBright">{item.version.padEnd(12)}</Text>
              {item.outdated && <StatusBadge label={t('badge_outdated')} variant="warning" />}
              {item.pinned && <StatusBadge label={t('badge_pinned')} variant="info" />}
              {item.kegOnly && <StatusBadge label={t('badge_kegOnly')} variant="muted" />}
              {item.installedAsDependency && <StatusBadge label={t('badge_dep')} variant="muted" />}
              {!item.outdated && !item.pinned && !item.kegOnly && !item.installedAsDependency && (
                <Text color="gray" dimColor>{truncate(item.desc, 30)}</Text>
              )}
            </Box>
          );
        })}
        {start + MAX_VISIBLE_ROWS < allItems.length && (
          <Text color="gray" dimColor>  {t('scroll_moreBelow', { count: allItems.length - start - MAX_VISIBLE_ROWS })}</Text>
        )}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text color="white" bold>
          {allItems.length > 0 ? `${cursor + 1}/${allItems.length}` : '0/0'}
        </Text>
      </Box>
    </Box>
  );
}
