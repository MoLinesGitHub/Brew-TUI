import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/brew-store.js', async () => {
  const { create } = await import('zustand');
  const useBrewStore = create<any>(() => ({
    outdated: { formulae: [], casks: [] },
    loading: { outdated: true },
    errors: {},
    fetchOutdated: vi.fn().mockResolvedValue(undefined),
  }));
  return { useBrewStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    status: 'free',
    isPro: () => false,
    isTeam: () => false,
  }));
  return { useLicenseStore };
});

// useBrewStream uses Ink's process.stdout — keep it inert for these tests.
vi.mock('../hooks/use-brew-stream.js', () => ({
  useBrewStream: () => ({
    isRunning: false,
    lines: [],
    error: null,
    start: vi.fn(),
    cancel: vi.fn(),
    clear: vi.fn(),
  }),
}));

// Impact analysis fires async on mount; stub it to keep render deterministic.
vi.mock('../lib/impact/impact-analyzer.js', () => ({
  getUpgradeImpact: vi.fn().mockResolvedValue(null),
}));

import { OutdatedView } from './outdated.js';
import { useBrewStore } from '../stores/brew-store.js';

beforeEach(() => {
  (useBrewStore as any).setState({
    outdated: { formulae: [], casks: [] },
    loading: { outdated: true },
    errors: {},
  });
});

describe('<OutdatedView>', () => {
  it('renders the loading message while outdated fetch is in flight', () => {
    const { lastFrame } = render(<OutdatedView />);
    // i18n keys "loading_outdated" — locale-agnostic check that *something*
    // about packages renders rather than a blank frame.
    expect((lastFrame() ?? '').trim().length).toBeGreaterThan(0);
    expect(lastFrame()).toMatch(/[a-z]/i);
  });

  it('renders the error banner when fetch fails', () => {
    (useBrewStore as any).setState({
      loading: { outdated: false },
      errors: { outdated: 'brew offline' },
    });
    const { lastFrame } = render(<OutdatedView />);
    expect(lastFrame()).toContain('brew offline');
  });

  it('shows the package list when outdated formulae and casks are loaded', () => {
    (useBrewStore as any).setState({
      outdated: {
        formulae: [
          { name: 'wget', installed_versions: ['1.21'], current_version: '1.22', pinned: false },
        ],
        casks: [
          { name: 'firefox', installed_versions: ['120'], current_version: '121', pinned: false },
        ],
      },
      loading: { outdated: false },
      errors: {},
    });
    const frame = render(<OutdatedView />).lastFrame() ?? '';
    expect(frame).toContain('wget');
    expect(frame).toContain('firefox');
  });
});
