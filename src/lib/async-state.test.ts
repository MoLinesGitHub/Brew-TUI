import { describe, it, expect } from 'vitest';
import { AsyncState } from './async-state.js';

describe('AsyncState (ARQ-004)', () => {
  it('isolates impossible combinations at the type level', () => {
    const s = AsyncState.success({ count: 3 });
    expect(AsyncState.isSuccess(s)).toBe(true);
    expect(AsyncState.isLoading(s)).toBe(false);
    expect(AsyncState.isError(s)).toBe(false);
    if (AsyncState.isSuccess(s)) {
      expect(s.data.count).toBe(3);
      expect(typeof s.loadedAt).toBe('number');
    }
  });

  it('round-trips loading and error', () => {
    expect(AsyncState.isLoading(AsyncState.loading())).toBe(true);
    const err = AsyncState.error<number>('boom');
    expect(AsyncState.isError(err)).toBe(true);
    if (AsyncState.isError(err)) expect(err.message).toBe('boom');
  });

  it('fromLegacy collapses the (loading, error, data) tuple deterministically', () => {
    expect(AsyncState.fromLegacy<number>(true, null, undefined).status).toBe('loading');
    expect(AsyncState.fromLegacy<number>(false, 'oops', undefined).status).toBe('error');
    expect(AsyncState.fromLegacy<number>(false, null, 7).status).toBe('success');
    expect(AsyncState.fromLegacy<number>(false, null, undefined).status).toBe('idle');
  });
});
