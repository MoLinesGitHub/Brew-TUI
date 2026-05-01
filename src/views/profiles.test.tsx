import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/profile-store.js', async () => {
  const { create } = await import('zustand');
  const useProfileStore = create<any>(() => ({
    profiles: [],
    loading: false,
    error: null,
    listProfiles: vi.fn(),
    saveProfile: vi.fn(),
    applyProfile: vi.fn(),
    deleteProfile: vi.fn(),
  }));
  return { useProfileStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
    license: { customerEmail: 'a@b.com' } as any,
  }));
  return { useLicenseStore };
});

vi.mock('../hooks/use-brew-stream.js', () => ({
  useBrewStream: () => ({ isRunning: false, lines: [], error: null, start: vi.fn(), cancel: vi.fn(), clear: vi.fn() }),
}));

import { ProfilesView } from './profiles.js';

describe('<ProfilesView>', () => {
  it('renders without crashing', () => {
    expect(() => render(<ProfilesView />)).not.toThrow();
  });
});
