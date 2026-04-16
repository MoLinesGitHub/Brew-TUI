import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useDebounce } from '../hooks/use-debounce.js';
import { useBrewStream } from '../hooks/use-brew-stream.js';
import { Loading } from '../components/common/loading.js';
import { ProgressLog } from '../components/common/progress-log.js';
import { ConfirmDialog } from '../components/common/confirm-dialog.js';
import * as api from '../lib/brew-api.js';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ formulae: string[]; casks: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [confirmInstall, setConfirmInstall] = useState<string | null>(null);
  const stream = useBrewStream();

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) return;
    setSearching(true);
    try {
      const r = await api.search(term);
      setResults(r);
      setCursor(0);
    } catch {
      setResults({ formulae: [], casks: [] });
    } finally {
      setSearching(false);
    }
  }, []);

  const allResults = results ? [...results.formulae, ...results.casks] : [];

  useInput((input, key) => {
    if (confirmInstall || stream.isRunning) return;

    if (key.return && !results) {
      doSearch(query);
      return;
    }

    if (key.return && allResults[cursor]) {
      setConfirmInstall(allResults[cursor]);
      return;
    }

    if (input === 'j' || key.downArrow) {
      setCursor((c) => Math.min(c + 1, allResults.length - 1));
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
          title={`Installing package...`}
        />
        {!stream.isRunning && (
          <Box marginTop={1}>
            <Text color={stream.error ? 'red' : 'green'} bold>
              {stream.error ? `\u2718 ${stream.error}` : '\u2714 Installation complete!'}
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
            placeholder="Search Homebrew packages... (enter to search)"
            defaultValue={query}
            onChange={setQuery}
            onSubmit={() => doSearch(query)}
          />
        ) : (
          <Text>Results for "<Text bold color="white">{query}</Text>" <Text color="gray">(esc to clear)</Text></Text>
        )}
      </Box>

      {searching && <Loading message="Searching..." />}

      {confirmInstall && (
        <ConfirmDialog
          message={`Install ${confirmInstall}?`}
          onConfirm={() => {
            const name = confirmInstall;
            setConfirmInstall(null);
            stream.run(['install', name]);
          }}
          onCancel={() => setConfirmInstall(null)}
        />
      )}

      {results && !searching && !confirmInstall && (
        <Box flexDirection="column">
          {results.formulae.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="cyan">=== Formulae ({results.formulae.length})</Text>
              {results.formulae.slice(0, 20).map((name, i) => {
                const isCurrent = i === cursor;
                return (
                  <Box key={name} gap={1}>
                    <Text color={isCurrent ? 'cyan' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
                    <Text bold={isCurrent}>{name}</Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {results.casks.length > 0 && (
            <Box flexDirection="column">
              <Text bold color="magenta">=== Casks ({results.casks.length})</Text>
              {results.casks.slice(0, 20).map((name, i) => {
                const idx = results.formulae.length + i;
                const isCurrent = idx === cursor;
                return (
                  <Box key={name} gap={1}>
                    <Text color={isCurrent ? 'magenta' : 'white'}>{isCurrent ? '\u276F' : ' '}</Text>
                    <Text bold={isCurrent}>{name}</Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {allResults.length === 0 && (
            <Text color="gray" italic>No results found</Text>
          )}

          <Box marginTop={1}>
            <Text color="gray">
              {allResults.length > 0 ? `${cursor + 1}/${allResults.length}` : ''}
              {' '}{'\u2502'} enter:install esc:clear
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
