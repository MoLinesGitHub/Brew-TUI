import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/brew-store.js', async () => {
  const { create } = await import('zustand');
  const useBrewStore = create<any>(() => ({
    doctorWarnings: [],
    doctorClean: null,
    loading: { doctor: true },
    errors: {},
    fetchDoctor: vi.fn(),
  }));
  return { useBrewStore };
});

import { DoctorView } from './doctor.js';
import { useBrewStore } from '../stores/brew-store.js';

beforeEach(() => {
  (useBrewStore as any).setState({
    doctorWarnings: [],
    doctorClean: null,
    loading: { doctor: true },
    errors: {},
  });
});

describe('<DoctorView>', () => {
  it('renders without crashing while loading', () => {
    expect(() => render(<DoctorView />)).not.toThrow();
  });

  it('renders the clean status when no warnings', () => {
    (useBrewStore as any).setState({
      doctorWarnings: [],
      doctorClean: true,
      loading: { doctor: false },
      errors: {},
    });
    const frame = render(<DoctorView />).lastFrame() ?? '';
    expect(frame.length).toBeGreaterThan(0);
  });

  it('lists warnings when doctor reports issues', () => {
    (useBrewStore as any).setState({
      doctorWarnings: ['You have unlinked kegs in your Cellar.', 'Some installed kegs are unlinked.'],
      doctorClean: false,
      loading: { doctor: false },
      errors: {},
    });
    const frame = render(<DoctorView />).lastFrame() ?? '';
    expect(frame).toContain('unlinked');
  });
});
