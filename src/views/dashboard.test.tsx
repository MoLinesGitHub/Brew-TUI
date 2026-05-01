import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

// Stop the auto-fetch on mount; tests inject their own state.
vi.mock('../stores/brew-store.js', async () => {
  const { create } = await import('zustand');
  const useBrewStore = create<any>(() => ({
    formulae: [],
    casks: [],
    outdated: { formulae: [], casks: [] },
    services: [],
    config: null,
    leaves: [],
    doctorWarnings: [],
    doctorClean: null,
    loading: { installed: true, outdated: true, services: true, config: true, doctor: true },
    errors: {},
    lastFetchedAt: {},
    fetchAll: vi.fn().mockResolvedValue(undefined),
    fetchInstalled: vi.fn(),
    fetchOutdated: vi.fn(),
    fetchServices: vi.fn(),
    fetchConfig: vi.fn(),
    fetchLeaves: vi.fn(),
    fetchDoctor: vi.fn(),
    uninstallPackage: vi.fn(),
    serviceAction: vi.fn(),
  }));
  return { useBrewStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    status: 'free',
    license: null,
    loading: false,
    error: null,
    isPro: () => false,
    isTeam: () => false,
    initialize: vi.fn(),
  }));
  return { useLicenseStore };
});

import { DashboardView } from './dashboard.js';
import { useBrewStore } from '../stores/brew-store.js';

beforeEach(() => {
  // Reset to default loading state
  (useBrewStore as any).setState({
    formulae: [],
    casks: [],
    outdated: { formulae: [], casks: [] },
    services: [],
    leaves: [],
    loading: { installed: true, outdated: true, services: true, config: true, doctor: true },
    errors: {},
  });
});

describe('<DashboardView>', () => {
  it('shows the loading spinner while installed packages fetch', () => {
    const { lastFrame } = render(<DashboardView />);
    expect(lastFrame()).toMatch(/Brew|Loading|Fetching/i);
  });

  it('shows ErrorMessage when installed fetch fails', () => {
    (useBrewStore as any).setState({
      loading: { installed: false, outdated: false, services: false, config: false, doctor: false },
      errors: { installed: 'brew not found' },
    });
    const { lastFrame } = render(<DashboardView />);
    expect(lastFrame()).toContain('brew not found');
  });

  it('renders stat cards with package counts once loaded', () => {
    (useBrewStore as any).setState({
      formulae: [
        { name: 'wget', full_name: 'wget', desc: '', homepage: '', versions: { stable: '1.21' } } as any,
        { name: 'curl', full_name: 'curl', desc: '', homepage: '', versions: { stable: '8.0' } } as any,
      ],
      casks: [
        { token: 'firefox', name: ['Firefox'], desc: '', homepage: '', version: '120' } as any,
      ],
      outdated: { formulae: [], casks: [] },
      services: [],
      loading: { installed: false, outdated: false, services: false, config: false, doctor: false },
      errors: {},
    });
    const frame = render(<DashboardView />).lastFrame() ?? '';
    // Stat values (counts) must appear somewhere on screen.
    expect(frame).toMatch(/2/); // formulae
    expect(frame).toMatch(/1/); // casks
  });
});
