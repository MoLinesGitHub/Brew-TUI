import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/brew-store.js', async () => {
  const { create } = await import('zustand');
  const useBrewStore = create<any>(() => ({
    formulae: [],
    casks: [],
    leaves: [],
    loading: { installed: true },
    errors: {},
    fetchInstalled: vi.fn(),
    fetchLeaves: vi.fn(),
    uninstallPackage: vi.fn(),
  }));
  return { useBrewStore };
});

vi.mock('../hooks/use-brew-stream.js', () => ({
  useBrewStream: () => ({
    isRunning: false, lines: [], error: null,
    start: vi.fn(), cancel: vi.fn(), clear: vi.fn(),
  }),
}));

vi.mock('../lib/brew-api.js', () => ({
  formulaeToListItems: (formulae: Array<{ name: string }>) =>
    formulae.map((f) => ({ name: f.name, version: '1.0', desc: '', type: 'formula' })),
  casksToListItems: (casks: Array<{ name: string }>) =>
    casks.map((c) => ({ name: c.name, version: '1.0', desc: '', type: 'cask' })),
  uninstallPackage: vi.fn(),
}));

import { InstalledView } from './installed.js';
import { useBrewStore } from '../stores/brew-store.js';

beforeEach(() => {
  (useBrewStore as any).setState({
    formulae: [],
    casks: [],
    leaves: [],
    loading: { installed: true },
    errors: {},
  });
});

describe('<InstalledView>', () => {
  it('renders without crashing while loading', () => {
    expect(() => render(<InstalledView />)).not.toThrow();
  });

  it('shows the formula count once loaded', () => {
    (useBrewStore as any).setState({
      formulae: [
        { name: 'wget', full_name: 'wget', desc: '', homepage: '', versions: { stable: '1.21' } },
        { name: 'curl', full_name: 'curl', desc: '', homepage: '', versions: { stable: '8.0' } },
      ],
      casks: [],
      leaves: [],
      loading: { installed: false },
      errors: {},
    });
    const frame = render(<InstalledView />).lastFrame() ?? '';
    expect(frame).toContain('wget');
  });

  it('renders error message when fetch fails', () => {
    (useBrewStore as any).setState({
      loading: { installed: false },
      errors: { installed: 'brew not found' },
    });
    const frame = render(<InstalledView />).lastFrame() ?? '';
    expect(frame).toContain('brew not found');
  });
});
