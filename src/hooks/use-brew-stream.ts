import { useState, useCallback, useRef, useEffect } from 'react';
import { streamBrew } from '../lib/brew-cli.js';
import { detectAction } from '../lib/history/history-logger.js';
import { useLicenseStore } from '../stores/license-store.js';

const MAX_LINES = 100;

async function logToHistory(args: string[], success: boolean, error: string | null): Promise<void> {
  const detected = detectAction(args);
  if (!detected) return;

  try {
    const isPro = useLicenseStore.getState().isPro();
    const { appendEntry } = await import('../lib/history/history-logger.js');
    await appendEntry(isPro, detected.action, detected.packageName, success, error);
  } catch {
    // Free user or file error — silently skip logging
  }
}

interface BrewStreamState {
  lines: string[];
  isRunning: boolean;
  error: string | null;
  run: (args: string[]) => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

export function useBrewStream(): BrewStreamState {
  const [lines, setLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const generatorRef = useRef<AsyncGenerator<string> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generatorRef.current?.return(undefined);
      generatorRef.current = null;
    };
  }, []);

  const run = useCallback(async (args: string[]) => {
    if (!mountedRef.current) return;
    setIsRunning(true);
    setError(null);
    setLines([]);
    cancelRef.current = false;

    const gen = streamBrew(args);
    generatorRef.current = gen;

    let streamError: string | null = null;

    try {
      for await (const line of gen) {
        if (cancelRef.current) break;
        if (mountedRef.current) {
          setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), line]);
        }
      }
    } catch (err) {
      streamError = err instanceof Error ? err.message : String(err);
      if (!cancelRef.current && mountedRef.current) {
        setError(streamError);
      }
    } finally {
      generatorRef.current = null;
      if (mountedRef.current) {
        setIsRunning(false);
      }
    }

    // Log to history (Pro users only, silently skipped for free)
    if (!cancelRef.current) {
      void logToHistory(args, streamError === null, streamError);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    generatorRef.current?.return(undefined);
    generatorRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setError(null);
  }, []);

  return { lines, isRunning, error, run, cancel, clear };
}
