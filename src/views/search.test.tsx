import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../lib/brew-api.js', () => ({
  searchBrew: vi.fn().mockResolvedValue({ formulae: [], casks: [] }),
}));

vi.mock('../stores/navigation-store.js', async () => {
  const { create } = await import('zustand');
  const useNavigationStore = create<any>(() => ({
    navigate: vi.fn(),
    selectPackage: vi.fn(),
    currentView: 'search',
  }));
  return { useNavigationStore };
});

import { SearchView } from './search.js';

describe('<SearchView>', () => {
  it('renders the search prompt without crashing', () => {
    expect(() => render(<SearchView />)).not.toThrow();
  });
});
