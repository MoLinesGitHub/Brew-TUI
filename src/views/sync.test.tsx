import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/sync-store.js', async () => {
  const { create } = await import('zustand');
  const useSyncStore = create<any>(() => ({
    config: null,
    lastResult: null,
    conflicts: [],
    loading: false,
    error: null,
    initialize: vi.fn(),
    syncNow: vi.fn(),
    resolveConflicts: vi.fn(),
  }));
  // Match the original module: useSyncStore.getState() must work too.
  return { useSyncStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
  }));
  return { useLicenseStore };
});

vi.mock('../stores/navigation-store.js', async () => {
  const { create } = await import('zustand');
  const useNavigationStore = create<any>(() => ({
    navigate: vi.fn(),
  }));
  return { useNavigationStore };
});

import { SyncView } from './sync.js';

describe('<SyncView>', () => {
  it('renders without crashing in overview state', () => {
    expect(() => render(<SyncView />)).not.toThrow();
  });
});
