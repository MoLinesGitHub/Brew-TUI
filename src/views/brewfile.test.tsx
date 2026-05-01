import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/brewfile-store.js', async () => {
  const { create } = await import('zustand');
  const useBrewfileStore = create<any>(() => ({
    schema: null,
    drift: null,
    loading: false,
    driftLoading: false,
    error: null,
    load: vi.fn(),
    createFromCurrent: vi.fn(),
  }));
  return { useBrewfileStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
  }));
  return { useLicenseStore };
});

vi.mock('../lib/brewfile/brewfile-manager.js', () => ({
  reconcile: vi.fn(),
}));

import { BrewfileView } from './brewfile.js';

describe('<BrewfileView>', () => {
  it('renders without crashing in initial state', () => {
    expect(() => render(<BrewfileView />)).not.toThrow();
  });
});
