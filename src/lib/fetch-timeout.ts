import { logger } from '../utils/logger.js';

export function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

/**
 * Wrap an async function with debug-level latency logging.
 */
export function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => logger.debug(`${label} took ${Date.now() - start}ms`));
}
