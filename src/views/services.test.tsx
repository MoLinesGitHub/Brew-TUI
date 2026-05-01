import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/brew-store.js', async () => {
  const { create } = await import('zustand');
  const useBrewStore = create<any>(() => ({
    services: [],
    loading: { services: true },
    errors: {},
    fetchServices: vi.fn(),
    serviceAction: vi.fn(),
  }));
  return { useBrewStore };
});

import { ServicesView } from './services.js';
import { useBrewStore } from '../stores/brew-store.js';

beforeEach(() => {
  (useBrewStore as any).setState({ services: [], loading: { services: true }, errors: {} });
});

describe('<ServicesView>', () => {
  it('renders without crashing in initial state', () => {
    expect(() => render(<ServicesView />)).not.toThrow();
  });

  it('renders the populated services list', () => {
    (useBrewStore as any).setState({
      services: [
        { name: 'postgresql', status: 'started', user: 'me', file: '/path' },
        { name: 'redis', status: 'stopped', user: 'me', file: '/path' },
      ],
      loading: { services: false },
      errors: {},
    });
    const frame = render(<ServicesView />).lastFrame() ?? '';
    expect(frame).toContain('postgresql');
    expect(frame).toContain('redis');
  });
});
