import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useBrewStore } from '../stores/brew-store.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading } from '../components/common/loading.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { t } from '../i18n/index.js';
import { useModalStore } from '../stores/modal-store.js';
import { useNavigationStore } from '../stores/navigation-store.js';
import * as api from '../lib/brew-api.js';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ formulae: string[]; casks: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [confirmInstall, setConfirmInstall] = useState<string | null>(null);
  const stream = useBrewStream();
  const { openModal, closeModal } = useModalStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const selectPackage = useNavigationStore((s) => s.selectPackage);
  const fetchInstalled = useBrewStore((s) => s.fetchInstalled);
  const hasRefreshed = useRef(false);

  // Suppress global Escape while results are showing so Escape clears results
  // rather than navigating away from this view.
  useEffect(() => {
    if (results !== null) {
      openModal();
      return () => { closeModal(); };
    }
    return undefined;
  }, [results]);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults(null);
      setSearchError(t('search_minChars'));
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const r = await api.search(term);
      setResults(r);
      setCursor(0);
    } catch (err) {
      setResults({ formulae: [], casks: [] });
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!stream.isRunning && !stream.error && stream.lines.length > 0 && !hasRefreshed.current) {
      hasRefreshed.current = true;
      void fetchInstalled();
    }
  }, [stream.isRunning, stream.error]);

  const MAX_VISIBLE = 20;
  const visibleFormulae = results ? results.formulae.slice(0, MAX_VISIBLE) : [];
  const visibleCasks = results ? results.casks.slice(0, MAX_VISIBLE) : [];
  const allVisible = [...visibleFormulae, ...visibleCasks];

  useInput((input, key) => {
    if (stream.isRunning) {
      if (key.escape) stream.cancel();
      return;
    }
    if (stream.lines.length > 0) {
      if (key.escape) {
        stream.clear();
      }
      return;
    }
    if (confirmInstall) return;

    if (key.return && !results) {
      void doSearch(query);
      return;
    }

    // Enter → navigate to package-info view (preview details, deps, caveats)
    if (key.return && allVisible[cursor]) {
      selectPackage(allVisible[cursor]);
      navigate('package-info');
      return;
    }

    // 'i' → install directly (with confirmation)
    if (input === 'i' && allVisible[cursor]) {
      setConfirmInstall(allVisible[cursor]);
      return;
    }

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(0, allVisible.length - 1)));
    } else if (input === 'k' || key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
    } else if (key.escape) {
      setResults(null);
      setQuery('');
    }
  });

  if (stream.isRunning || stream.lines.length > 0) {
    return (
      <Box flexDirection="column">
        <ProgressLog
          lines={stream.lines}
          isRunning={stream.isRunning}
          title={t('search_installing')}
        />
        {stream.isRunning && (
          <Text color="#6B7280">esc:{t('hint_cancel')}</Text>
        )}
        {!stream.isRunning && (
          <Box flexDirection="column" marginTop={1}>
            <Box borderStyle="round" borderColor={stream.error ? '#EF4444' : '#22C55E'} paddingX={2} paddingY={0}>
              <Text color={stream.error ? '#EF4444' : '#22C55E'} bold>
                {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('search_installComplete')}`}
              </Text>
            </Box>
            <Text color="#6B7280">esc:{t('hint_clear')}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="#FFD700">{'\u{1F50D}'} </Text>
        {!results ? (
          <TextInput
            placeholder={t('search_placeholder')}
            defaultValue={query}
            onChange={setQuery}
            onSubmit={() => void doSearch(query)}
          />
        ) : (
          <Text>{t('search_resultsFor')} "<Text bold color="#F9FAFB">{query}</Text>" <Text color="#6B7280">{t('search_escToClear')}</Text></Text>
        )}
      </Box>

      {searching && <Loading message={t('loading_searching')} />}

      {searchError && (
        <Box marginBottom={1}>
          <Text color="#EF4444">{searchError}</Text>
        </Box>
      )}

      {confirmInstall && (
        <ConfirmDialog
          message={t('search_confirmInstall', { name: confirmInstall })}
          onConfirm={() => {
            const name = confirmInstall;
            hasRefreshed.current = false;
            setConfirmInstall(null);
            void stream.run(['install', name]);
          }}
          onCancel={() => setConfirmInstall(null)}
        />
      )}

      {results && !searching && !confirmInstall && (
        <Box flexDirection="column">
          {visibleFormulae.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="#06B6D4">{t('search_formulaeHeader', { count: results.formulae.length })}</Text>
              {visibleFormulae.map((name, i) => {
                const isCurrent = i === cursor;
                return (
                  <Box key={name} gap={1}>
                    <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
                    <Text bold={isCurrent} inverse={isCurrent}>{name}</Text>
                  </Box>
                );
              })}
              {results.formulae.length > MAX_VISIBLE && (
                <Text color="#6B7280" dimColor>  {t('scroll_moreBelow', { count: results.formulae.length - MAX_VISIBLE })}</Text>
              )}
            </Box>
          )}

          {visibleCasks.length > 0 && (
            <Box flexDirection="column">
              <Text bold color="#A855F7">{t('search_casksHeader', { count: results.casks.length })}</Text>
              {visibleCasks.map((name, i) => {
                const idx = visibleFormulae.length + i;
                const isCurrent = idx === cursor;
                return (
                  <Box key={name} gap={1}>
                    <Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '\u25B6' : ' '}</Text>
                    <Text bold={isCurrent} inverse={isCurrent}>{name}</Text>
                  </Box>
                );
              })}
              {results.casks.length > MAX_VISIBLE && (
                <Text color="#6B7280" dimColor>  {t('scroll_moreBelow', { count: results.casks.length - MAX_VISIBLE })}</Text>
              )}
            </Box>
          )}

          {allVisible.length === 0 && (
            <Box borderStyle="round" borderColor="#6B7280" paddingX={2}>
              <Text color="#6B7280" italic>{t('search_noResults')}</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="#F9FAFB" bold>
              {allVisible.length > 0 ? `${cursor + 1}/${allVisible.length}` : ''}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
