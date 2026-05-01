import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/security-store.js', async () => {
  const { create } = await import('zustand');
  const useSecurityStore = create<any>(() => ({
    summary: null,
    loading: false,
    error: null,
    scan: vi.fn(),
    cachedAt: null,
  }));
  return { useSecurityStore };
});

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    status: 'pro',
    isPro: () => true,
  }));
  return { useLicenseStore };
});

vi.mock('../hooks/use-brew-stream.js', () => ({
  useBrewStream: () => ({
    isRunning: false, lines: [], error: null,
    start: vi.fn(), cancel: vi.fn(), clear: vi.fn(),
  }),
}));

import { SecurityAuditView } from './security-audit.js';
import { useSecurityStore } from '../stores/security-store.js';

beforeEach(() => {
  (useSecurityStore as any).setState({ summary: null, loading: false, error: null, cachedAt: null });
});

describe('<SecurityAuditView>', () => {
  it('renders without crashing in initial state', () => {
    expect(() => render(<SecurityAuditView />)).not.toThrow();
  });

  it('surfaces the error banner when scan fails', () => {
    (useSecurityStore as any).setState({ error: 'OSV API unreachable' });
    const frame = render(<SecurityAuditView />).lastFrame() ?? '';
    expect(frame).toContain('OSV');
  });

  it('renders scan results when summary present', () => {
    (useSecurityStore as any).setState({
      summary: {
        scannedAt: '2026-05-01T00:00:00.000Z',
        packagesScanned: 50,
        vulnerablePackages: [],
        totalVulnerabilities: 0,
      },
      cachedAt: '2026-05-01T00:00:00.000Z',
    });
    const frame = render(<SecurityAuditView />).lastFrame() ?? '';
    expect(frame.length).toBeGreaterThan(0);
  });
});
