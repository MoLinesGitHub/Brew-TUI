import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
  }));
  return { useLicenseStore };
});

vi.mock('../lib/state-snapshot/snapshot.js', () => ({
  loadSnapshots: vi.fn().mockResolvedValue([]),
  deleteSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
}));

vi.mock('../lib/rollback/rollback-engine.js', () => ({
  rollbackToSnapshot: vi.fn(),
}));

vi.mock('../hooks/use-brew-stream.js', () => ({
  useBrewStream: () => ({ isRunning: false, lines: [], error: null, start: vi.fn(), cancel: vi.fn(), clear: vi.fn() }),
}));

import { RollbackView } from './rollback.js';

describe('<RollbackView>', () => {
  it('renders without crashing', () => {
    expect(() => render(<RollbackView />)).not.toThrow();
  });
});
