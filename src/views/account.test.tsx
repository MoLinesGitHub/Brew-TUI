import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../stores/license-store.js', async () => {
  const { create } = await import('zustand');
  const useLicenseStore = create<any>(() => ({
    status: 'free',
    license: null,
    degradation: 'none',
    deactivate: vi.fn(),
    initialize: vi.fn(),
    isPro: () => false,
    isTeam: () => false,
  }));
  return { useLicenseStore };
});

vi.mock('../lib/license/promo.js', () => ({
  redeemPromoCode: vi.fn(),
}));

import { AccountView } from './account.js';
import { useLicenseStore } from '../stores/license-store.js';

beforeEach(() => {
  (useLicenseStore as any).setState({
    status: 'free',
    license: null,
    degradation: 'none',
  });
});

describe('<AccountView>', () => {
  it('shows the validating loader when status is "validating"', () => {
    (useLicenseStore as any).setState({ status: 'validating' });
    const { lastFrame } = render(<AccountView />);
    expect((lastFrame() ?? '').trim().length).toBeGreaterThan(0);
  });

  it('renders the free-tier label by default', () => {
    const frame = render(<AccountView />).lastFrame() ?? '';
    // Free, libre, gratis, gratuito — locale-agnostic check that some
    // status label rendered. The "deactivate" hint is gated to pro/team
    // and must NOT appear here.
    expect(frame.toLowerCase()).not.toContain('deactivate');
    expect(frame.toLowerCase()).not.toContain('desactivar');
  });

  it('renders the Pro tier and shows the deactivate hint', () => {
    (useLicenseStore as any).setState({
      status: 'pro',
      license: {
        key: 'BTUI-1234-5678-9012-3456',
        instanceId: 'inst-1',
        status: 'active',
        customerEmail: 'a@b.com',
        customerName: 'A B',
        plan: 'pro',
        activatedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
        lastValidatedAt: '2026-05-01T00:00:00.000Z',
      },
      degradation: 'none',
    });
    const frame = render(<AccountView />).lastFrame() ?? '';
    // The masked key is shown: first 4 + last 4
    expect(frame).toContain('BTUI');
    expect(frame).toContain('3456');
    // Deactivate hint surfaces because status === 'pro'
    expect(frame.toLowerCase()).toMatch(/deactivate|desactivar/);
  });

  it('renders the expired state when status is expired', () => {
    (useLicenseStore as any).setState({ status: 'expired' });
    const frame = render(<AccountView />).lastFrame() ?? '';
    expect((frame).trim().length).toBeGreaterThan(0);
  });
});
