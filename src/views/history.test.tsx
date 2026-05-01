import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/history-store.js', async () => {
  const { create } = await import('zustand');
  const useHistoryStore = create<any>(() => ({
    entries: [],
    loading: false,
    error: null,
    load: vi.fn(),
  }));
  return { useHistoryStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
  }));
  return { useLicenseStore };
});

import { HistoryView } from './history.js';

describe('<HistoryView>', () => {
  it('renders without crashing', () => {
    expect(() => render(<HistoryView />)).not.toThrow();
  });
});
