import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading } from '../components/common/loading.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import { t } from '../i18n/index.js';
import { useModalStore } from '../stores/modal-store.js';
import * as api from '../lib/brew-api.js';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ formulae: string[]; casks: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [confirmInstall, setConfirmInstall] = useState<string | null>(null);
  const stream = useBrewStream();
  const { openModal, closeModal } = useModalStore();

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
    if (term.length < 2) return;
    setSearching(true);
    try {
      const r = await api.search(term);
      setResults(r);
      setCursor(0);
    } catch (err) {
      setResults({ formulae: [], casks: [] });
      // Search failed (network error, brew not found, etc.)
      // Results are cleared so the UI shows "no results" rather than stale data
      void err;
    } finally {
      setSearching(false);
    }
  }, []);

  const allResults = results ? [...results.formulae, ...results.casks] : [];

  useInput((input, key) => {
    if (confirmInstall || stream.isRunning) return;

    if (key.return && !results) {
      void doSearch(query);
      return;
    }

    if (key.return && allResults[cursor]) {
      setConfirmInstall(allResults[cursor]);
      return;
    }

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(0, allResults.length - 1)));
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
        {!stream.isRunning && (
          <Box marginTop={1}>
            <Text color={stream.error ? 'red' : 'cyanBright'} bold>
              {stream.error ? `\u2718 ${stream.error}` : `\u2714 ${t('search_installComplete')}`}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan">{'\u{1F50D}'} </Text>
        {!results ? (
          <TextInput
            placeholder={t('search_placeholder')}
            defaultValue={query}
            onChange={setQuery}
            onSubmit={() => void doSearch(query)}
          />
        ) : (
          <Text>{t('search_resultsFor')} "<Text bold color="white">{query}</Text>" <Text color="gray">{t('search_escToClear')}</Text></Text>
        )}
      </Box>

      {searching && <Loading message={t('loading_searching')} />}

      {confirmInstall && (
        <ConfirmDialog
          message={t('search_confirmInstall', { name: confirmInstall })}
          onConfirm={() => {
            const name = confirmInstall;
            setConfirmInstall(null);
            void stream.run(['install', name]);
          }}
          onCancel={() => setConfirmInstall(null)}
        />
      )}

      {results && !searching && !confirmInstall && (
        <Box flexDirection="column">
          {results.formulae.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="cyan">{t('search_formulaeHeader', { count: results.formulae.length })}</Text>
              {results.formulae.slice(0, 20).map((name, i) => {
                const isCurrent = i === cursor;
                return (
                  <Box key={name} gap={1}>
                    <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
                    <Text bold={isCurrent} inverse={isCurrent}>{name}</Text>
                  </Box>
                );
              })}
              {results.formulae.length > 20 && (
                <Text color="gray" dimColor>  {t('scroll_moreBelow', { count: results.formulae.length - 20 })}</Text>
              )}
            </Box>
          )}

          {results.casks.length > 0 && (
            <Box flexDirection="column">
              <Text bold color="magentaBright">{t('search_casksHeader', { count: results.casks.length })}</Text>
              {results.casks.slice(0, 20).map((name, i) => {
                const idx = results.formulae.length + i;
                const isCurrent = idx === cursor;
                return (
                  <Box key={name} gap={1}>
                    <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u25B6' : ' '}</Text>
                    <Text bold={isCurrent} inverse={isCurrent}>{name}</Text>
                  </Box>
                );
              })}
              {results.casks.length > 20 && (
                <Text color="gray" dimColor>  {t('scroll_moreBelow', { count: results.casks.length - 20 })}</Text>
              )}
            </Box>
          )}

          {allResults.length === 0 && (
            <Text color="gray" italic>{t('search_noResults')}</Text>
          )}

          <Box marginTop={1}>
            <Text color="white" bold>
              {allResults.length > 0 ? `${cursor + 1}/${allResults.length}` : ''}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
