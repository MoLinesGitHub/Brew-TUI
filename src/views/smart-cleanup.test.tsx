import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/cleanup-store.js', async () => {
  const { create } = await import('zustand');
  const useCleanupStore = create<any>(() => ({
    plan: null,
    loading: false,
    error: null,
    analyze: vi.fn(),
  }));
  return { useCleanupStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
  }));
  return { useLicenseStore };
});

vi.mock('../hooks/use-brew-stream.js', () => ({
  useBrewStream: () => ({ isRunning: false, lines: [], error: null, start: vi.fn(), cancel: vi.fn(), clear: vi.fn() }),
}));

import { SmartCleanupView } from './smart-cleanup.js';

describe('<SmartCleanupView>', () => {
  it('renders without crashing', () => {
    expect(() => render(<SmartCleanupView />)).not.toThrow();
  });
});
