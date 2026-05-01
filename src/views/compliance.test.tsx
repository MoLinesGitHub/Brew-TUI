import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/compliance-store.js', async () => {
  const { create } = await import('zustand');
  const useComplianceStore = create<any>(() => ({
    policy: null,
    report: null,
    loading: false,
    error: null,
    importPolicy: vi.fn(),
    runCheck: vi.fn(),
  }));
  return { useComplianceStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    isPro: () => true,
    isTeam: () => true,
  }));
  return { useLicenseStore };
});

vi.mock('../lib/compliance/compliance-remediator.js', () => ({
  remediateViolations: vi.fn(),
}));

vi.mock('../lib/compliance/policy-io.js', () => ({
  exportReport: vi.fn(),
}));

import { ComplianceView } from './compliance.js';

describe('<ComplianceView>', () => {
  it('renders without crashing without policy loaded', () => {
    expect(() => render(<ComplianceView />)).not.toThrow();
  });
});
