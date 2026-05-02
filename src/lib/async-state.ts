// ARQ-004: discriminated union for async data shapes. Today the brew-store
// keeps `loading: Record<string, boolean>` and `errors: Record<string, string|null>`
// in parallel, which lets contradictory states compile (loading=true AND
// error="x"). New consumers should prefer this type so the compiler eliminates
// impossible combinations and renderers can switch exhaustively.
//
// Migration plan: existing fields stay until a follow-up PR converts each
// store key by key. Mixing both during migration is fine — they are not
// mutually exclusive.

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; loadedAt: number }
  | { status: 'error'; message: string };

const asyncState = {
  idle<T>(): AsyncState<T> { return { status: 'idle' }; },
  loading<T>(): AsyncState<T> { return { status: 'loading' }; },
  success<T>(data: T): AsyncState<T> { return { status: 'success', data, loadedAt: Date.now() }; },
  error<T>(message: string): AsyncState<T> { return { status: 'error', message }; },

  isIdle<T>(s: AsyncState<T>): s is { status: 'idle' } { return s.status === 'idle'; },
  isLoading<T>(s: AsyncState<T>): s is { status: 'loading' } { return s.status === 'loading'; },
  isSuccess<T>(s: AsyncState<T>): s is { status: 'success'; data: T; loadedAt: number } {
    return s.status === 'success';
  },
  isError<T>(s: AsyncState<T>): s is { status: 'error'; message: string } {
    return s.status === 'error';
  },

  // For interop with the legacy boolean/string maps until full migration.
  fromLegacy<T>(loading: boolean, error: string | null, data: T | undefined): AsyncState<T> {
    if (loading) return { status: 'loading' };
    if (error) return { status: 'error', message: error };
    if (data !== undefined) return { status: 'success', data, loadedAt: Date.now() };
    return { status: 'idle' };
  },
};

export { asyncState as AsyncState };
