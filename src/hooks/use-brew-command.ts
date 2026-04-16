import { useState, useCallback } from 'react';
import { execBrew } from '../lib/brew-cli.js';

interface BrewCommandState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  run: (...args: string[]) => Promise<T | null>;
}

export function useBrewCommand<T>(parser: (raw: string) => T): BrewCommandState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (...args: string[]): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const raw = await execBrew(args);
      const parsed = parser(raw);
      setData(parsed);
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [parser]);

  return { data, loading, error, run };
}
