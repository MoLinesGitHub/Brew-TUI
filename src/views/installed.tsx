import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useBrewStore } from '../stores/brew-store.js';
import { useNavigationStore } from '../stores/navigation-store.js';
import { useDebounce } from '../hooks/use-debounce.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { formulaeToListItems, casksToListItems } from '../lib/brew-api.js';
import { SearchInput } from '../components/common/search-input.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { ProgressLog } from '../components/common/progress-log.js';
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
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const debouncedFilter = useDebounce(filter, 200);
  const stream = useBrewStream();
  const { openModal, closeModal } = useModalStore();
  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 80;
  const nameWidth = Math.floor(cols * 0.35);
  const versionWidth = Math.floor(cols * 0.15);

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
    if (confirmUninstall || stream.isRunning) return;

    // Stream finished but still showing — Esc dismisses and refreshes
    if (!stream.isRunning && stream.lines.length > 0) {
      if (key.escape) {
        stream.clear();
        void fetchInstalled();
      }
      return;
    }

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

    if (input === 'u' && allItems[cursor]) {
      setConfirmUninstall(allItems[cursor].name);
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

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog
          lines={stream.lines}
          isRunning={stream.isRunning}
          title={t('pkgInfo_uninstalling', { name: '...' })}
        />
        {stream.isRunning && (
          <Text color="#6B7280">esc:{t('hint_cancel')}</Text>
        )}
        {!stream.isRunning && (
          <Box flexDirection="column" marginTop={1}>
            <Box borderStyle="round" borderColor={stream.error ? '#EF4444' : '#22C55E'} paddingX={2} paddingY={0}>
              <Text color={stream.error ? '#EF4444' : '#22C55E'} bold>
                {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('pkgInfo_done')}`}
              </Text>
            </Box>
            <Text color="#6B7280">esc:{t('hint_back')}</Text>
          </Box>
        )}
      </Box>
    );
  }

  const MAX_VISIBLE_ROWS = Math.max(5, (stdout?.rows ?? 24) - 8);
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
          borderColor={tab === 'formulae' ? '#06B6D4' : '#6B7280'}
          paddingX={1}
        >
          <Text bold={tab === 'formulae'} color={tab === 'formulae' ? '#06B6D4' : '#6B7280'}>
            {'\u{1F4E6}'} {t('installed_formulaeCount', { count: formulae.length })}
          </Text>
        </Box>
        <Box
          borderStyle="round"
          borderColor={tab === 'casks' ? '#A855F7' : '#6B7280'}
          paddingX={1}
        >
          <Text bold={tab === 'casks'} color={tab === 'casks' ? '#A855F7' : '#6B7280'}>
            {'\u{1F37A}'} {t('installed_casksCount', { count: casks.length })}
          </Text>
        </Box>
      </Box>

      {/* Uninstall confirmation */}
      {confirmUninstall && (
        <ConfirmDialog
          message={t('installed_confirmUninstall', { name: confirmUninstall })}
          onConfirm={() => {
            const name = confirmUninstall;
            setConfirmUninstall(null);
            void stream.run(['uninstall', name]).then(() => { fetchInstalled(); });
          }}
          onCancel={() => setConfirmUninstall(null)}
        />
      )}

      {/* Search bar */}
      {isSearching && (
        <Box marginBottom={1} borderStyle="round" borderColor="#FFD700" paddingX={1}>
          <SearchInput defaultValue={filter} onChange={setFilter} isActive={isSearching} />
        </Box>
      )}

      {/* Column header — 1 space prefix matches the 1-char cursor glyph in data
          rows; gap={1} is shared by both header and data rows via the parent Box,
          so widths must match: ' ' + gap(1) + padEnd(27) aligns with data rows. */}
      <Box gap={1} borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false} borderColor="#4B5563">
        <Text color="#F9FAFB" bold>{' '}{'Package'.padEnd(nameWidth)}</Text>
        <Text color="#F9FAFB" bold>{'Version'.padEnd(versionWidth)}</Text>
        <Text color="#F9FAFB" bold>{'Status'}</Text>
      </Box>

      {/* Package list */}
      <Box flexDirection="column">
        {visible.length === 0 && (
          <Box paddingY={1} justifyContent="center">
            <Text color="#6B7280" italic>{t('installed_noPackages')}</Text>
          </Box>
        )}
        {start > 0 && (
          <Text color="#6B7280" dimColor>  {t('scroll_moreAbove', { count: start })}</Text>
        )}
        {visible.map((item, i) => {
          const idx = start + i;
          const isCurrent = idx === cursor;
          return (
            <Box key={item.name} gap={1}>
              <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
              <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? '#F9FAFB' : '#9CA3AF'}>
                {truncate(item.name, nameWidth).padEnd(nameWidth)}
              </Text>
              <Text color="#2DD4BF">{item.version.padEnd(versionWidth)}</Text>
              {item.outdated && <StatusBadge label={t('badge_outdated')} variant="warning" />}
              {item.pinned && <StatusBadge label={t('badge_pinned')} variant="info" />}
              {item.kegOnly && <StatusBadge label={t('badge_kegOnly')} variant="muted" />}
              {item.installedAsDependency && <StatusBadge label={t('badge_dep')} variant="muted" />}
              {!item.outdated && !item.pinned && !item.kegOnly && !item.installedAsDependency && (
                <Text color="#6B7280" dimColor>{truncate(item.desc, 30)}</Text>
              )}
            </Box>
          );
        })}
        {start + MAX_VISIBLE_ROWS < allItems.length && (
          <Text color="#6B7280" dimColor>  {t('scroll_moreBelow', { count: allItems.length - start - MAX_VISIBLE_ROWS })}</Text>
        )}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text color="#F9FAFB" bold>
          {allItems.length > 0 ? `${cursor + 1}/${allItems.length}` : '0/0'}
        </Text>
      </Box>
    </Box>
  );
}
