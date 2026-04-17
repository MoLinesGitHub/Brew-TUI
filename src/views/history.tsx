import React, { useEffect, useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useHistoryStore } from '../stores/history-store.js';
import { useDebounce } from '../hooks/use-debounce.js';
import { Loading, ErrorMessage } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { SearchInput } from '../components/common/search-input.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { formatRelativeTime } from '../utils/format.js';
import { t } from '../i18n/index.js';
import { useModalStore } from '../stores/modal-store.js';
import type { TranslationKey } from '../i18n/en.js';
import type { HistoryAction } from '../lib/history/types.js';

const ACTION_ICONS: Record<HistoryAction, { icon: string; color: string }> = {
  install: { icon: '+', color: 'greenBright' },
  uninstall: { icon: '-', color: 'redBright' },
  upgrade: { icon: '\u2191', color: 'cyanBright' },
  'upgrade-all': { icon: '\u21C8', color: 'cyanBright' },
};

const ACTION_LABEL_KEYS: Record<HistoryAction, TranslationKey> = {
  install: 'history_actionInstall',
  uninstall: 'history_actionUninstall',
  upgrade: 'history_actionUpgrade',
  'upgrade-all': 'history_actionUpgradeAll',
};

const FILTERS: (HistoryAction | 'all')[] = ['all', 'install', 'uninstall', 'upgrade', 'upgrade-all'];

export function HistoryView() {
  const { entries, loading, error, fetchHistory, clearHistory } = useHistoryStore();
  const [cursor, setCursor] = useState(0);
  const [filter, setFilter] = useState<HistoryAction | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 200);
  const { openModal, closeModal } = useModalStore();

  useEffect(() => { fetchHistory(); }, []);

  // Suppress global Escape while search bar is active so Escape clears the
  // search bar rather than navigating away from the history view.
  useEffect(() => {
    if (isSearching) {
      openModal();
      return () => { closeModal(); };
    }
    return undefined;
  }, [isSearching]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filter !== 'all') {
      result = result.filter((e) => e.action === filter);
    }
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((e) => e.packageName?.toLowerCase().includes(q));
    }
    return result;
  }, [entries, filter, debouncedQuery]);

  useInput((input, key) => {
    if (confirmClear) return;

    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        setSearchQuery('');
      }
      return;
    }

    if (input === '/') { setIsSearching(true); return; }
    if (input === 'f') {
      const idx = FILTERS.indexOf(filter);
      setFilter(FILTERS[(idx + 1) % FILTERS.length]!);
      setCursor(0);
      return;
    }
    if (input === 'c' && entries.length > 0) { setConfirmClear(true); return; }

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, Math.max(0, filtered.length - 1)));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
  });

  if (loading) return <Loading message={t('loading_history')} />;
  if (error) return <ErrorMessage message={error} />;

  const MAX_VISIBLE_ROWS = 20;
  const start = Math.max(0, cursor - Math.floor(MAX_VISIBLE_ROWS / 2));
  const visible = filtered.slice(start, start + MAX_VISIBLE_ROWS);

  return (
    <Box flexDirection="column">
      <Box gap={2} marginBottom={1}>
        <Text bold>{'\u{1F4DC}'} {t('history_title', { count: filtered.length })}</Text>
        <Text color={filter === 'all' ? 'white' : 'yellowBright'}>
          {t('history_filterLabel', { filter })}
        </Text>
      </Box>

      {isSearching && (
        <Box marginBottom={1}>
          <SearchInput defaultValue={searchQuery} onChange={setSearchQuery} placeholder={t('history_searchPlaceholder')} isActive />
        </Box>
      )}

      {confirmClear && (
        <ConfirmDialog
          message={t('history_confirmClear', { count: entries.length })}
          onConfirm={() => { void clearHistory(); setConfirmClear(false); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {filtered.length === 0 && !confirmClear && (
        <Text color="gray" italic>
          {filter !== 'all' ? t('history_noEntriesFor', { filter }) : t('history_noEntries')}
        </Text>
      )}

      {filtered.length > 0 && !confirmClear && (
        <Box flexDirection="column">
          {start > 0 && (
            <Text color="gray" dimColor>  {t('scroll_moreAbove', { count: start })}</Text>
          )}
          {visible.map((entry, i) => {
            const idx = start + i;
            const isCurrent = idx === cursor;
            const { icon, color } = ACTION_ICONS[entry.action];
            const ts = new Date(entry.timestamp).getTime() / 1000;

            return (
              <Box key={entry.id} gap={1}>
                <Text color={isCurrent ? 'greenBright' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
                <Text color={color} bold>{icon}</Text>
                <Text bold={isCurrent} inverse={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                  {t(ACTION_LABEL_KEYS[entry.action]).padEnd(12)}
                </Text>
                <Text color="white">{entry.packageName ?? t('history_all')}</Text>
                {entry.success
                  ? <StatusBadge label={t('badge_ok')} variant="success" />
                  : <StatusBadge label={t('badge_fail')} variant="error" />}
                <Text color="gray">{formatRelativeTime(ts)}</Text>
              </Box>
            );
          })}
          {start + MAX_VISIBLE_ROWS < filtered.length && (
            <Text color="gray" dimColor>  {t('scroll_moreBelow', { count: filtered.length - start - MAX_VISIBLE_ROWS })}</Text>
          )}

          <Box marginTop={1}>
            <Text color="white" bold>
              {cursor + 1}/{filtered.length}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
