import { useState, useCallback, useRef } from 'react';
import { streamBrew } from '../lib/brew-cli.js';

const MAX_LINES = 100;

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

  const run = useCallback(async (args: string[]) => {
    setIsRunning(true);
    setError(null);
    setLines([]);
    cancelRef.current = false;

    try {
      for await (const line of streamBrew(args)) {
        if (cancelRef.current) break;
        setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), line]);
      }
    } catch (err) {
      if (!cancelRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsRunning(false);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setError(null);
  }, []);

  return { lines, isRunning, error, run, cancel, clear };
}
