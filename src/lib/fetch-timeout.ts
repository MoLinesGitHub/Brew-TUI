export function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}
