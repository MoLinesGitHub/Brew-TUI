import React, { useEffect, useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useHistoryStore } from '../stores/history-store.js';
import { useDebounce } from '../hooks/use-debounce.js';
import { Loading } from '../components/common/loading.js';
import { StatusBadge } from '../components/common/status-badge.js';
import { SearchInput } from '../components/common/search-input.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { formatRelativeTime } from '../utils/format.js';
import type { HistoryAction } from '../lib/history/types.js';

const ACTION_ICONS: Record<HistoryAction, { icon: string; color: string }> = {
  install: { icon: '+', color: 'green' },
  uninstall: { icon: '-', color: 'red' },
  upgrade: { icon: '\u2191', color: 'cyan' },
  'upgrade-all': { icon: '\u21C8', color: 'cyan' },
};

const FILTERS: (HistoryAction | 'all')[] = ['all', 'install', 'uninstall', 'upgrade', 'upgrade-all'];

export function HistoryView() {
  const { entries, loading, fetchHistory, clearHistory } = useHistoryStore();
  const [cursor, setCursor] = useState(0);
  const [filter, setFilter] = useState<HistoryAction | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 200);

  useEffect(() => { fetchHistory(); }, []);

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

    if (input === 'j' || key.downArrow) setCursor((c) => Math.min(c + 1, filtered.length - 1));
    else if (input === 'k' || key.upArrow) setCursor((c) => Math.max(c - 1, 0));
  });

  if (loading) return <Loading message="Loading history..." />;

  const maxVisible = 20;
  const start = Math.max(0, cursor - Math.floor(maxVisible / 2));
  const visible = filtered.slice(start, start + maxVisible);

  return (
    <Box flexDirection="column">
      <Box gap={2} marginBottom={1}>
        <Text bold>{'\u{1F4DC}'} Action History ({filtered.length})</Text>
        <Text color={filter === 'all' ? 'white' : 'cyan'}>
          filter: {filter}
        </Text>
      </Box>

      {isSearching && (
        <Box marginBottom={1}>
          <SearchInput defaultValue={searchQuery} onChange={setSearchQuery} placeholder="Search packages..." isActive />
        </Box>
      )}

      {confirmClear && (
        <ConfirmDialog
          message={`Clear all ${entries.length} history entries?`}
          onConfirm={() => { clearHistory(); setConfirmClear(false); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {filtered.length === 0 && !confirmClear && (
        <Text color="gray" italic>No history entries{filter !== 'all' ? ` for "${filter}"` : ''}</Text>
      )}

      {filtered.length > 0 && !confirmClear && (
        <Box flexDirection="column">
          {visible.map((entry, i) => {
            const idx = start + i;
            const isCurrent = idx === cursor;
            const { icon, color } = ACTION_ICONS[entry.action];
            const ts = new Date(entry.timestamp).getTime() / 1000;

            return (
              <Box key={entry.id} gap={1}>
                <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
                <Text color={color} bold>{icon}</Text>
                <Text bold={isCurrent} color={isCurrent ? 'white' : 'gray'}>
                  {entry.action.padEnd(12)}
                </Text>
                <Text color="white">{entry.packageName ?? '(all)'}</Text>
                {entry.success
                  ? <StatusBadge label="ok" variant="success" />
                  : <StatusBadge label="fail" variant="error" />}
                <Text color="gray">{formatRelativeTime(ts)}</Text>
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color="gray">
              {cursor + 1}/{filtered.length} {'\u2502'} /:search f:filter({filter}) c:clear
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
