import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../lib/brew-api.js', () => ({
  getFormulaInfo: vi.fn().mockResolvedValue(null),
  getCaskInfo: vi.fn().mockResolvedValue(null),
}));

vi.mock('../stores/navigation-store.js', async () => {
  const { create } = await import('zustand');
  const useNavigationStore = create<any>(() => ({
    selectedPackage: 'wget',
    selectedPackageType: 'formula',
    navigate: vi.fn(),
    goBack: vi.fn(),
  }));
  return { useNavigationStore };
});

import { PackageInfoView } from './package-info.js';

describe('<PackageInfoView>', () => {
  it('renders without crashing while loading info', () => {
    expect(() => render(<PackageInfoView />)).not.toThrow();
  });
});
