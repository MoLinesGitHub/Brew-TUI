import { useState, useCallback, useRef, useEffect } from 'react';
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
  // Holds the active generator so we can terminate it on unmount.
  const generatorRef = useRef<AsyncGenerator<string> | null>(null);
  // Tracks mount state to prevent setState calls after unmount.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Calling .return() causes the generator's finally block to run,
      // which kills the underlying child process via proc.kill().
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

    try {
      for await (const line of gen) {
        if (cancelRef.current) break;
        if (mountedRef.current) {
          setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), line]);
        }
      }
    } catch (err) {
      if (!cancelRef.current && mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      generatorRef.current = null;
      if (mountedRef.current) {
        setIsRunning(false);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    // Also terminate the generator (and thus the child process) immediately.
    generatorRef.current?.return(undefined);
    generatorRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setError(null);
  }, []);

  return { lines, isRunning, error, run, cancel, clear };
}
