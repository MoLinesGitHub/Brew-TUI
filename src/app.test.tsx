import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

// Stub every concrete view so the router is the only thing under test.
// Each factory inlines its own stub because vi.mock is hoisted above any
// top-level variables.
vi.mock('./views/dashboard.js', async () => {
  const { Text } = await import('ink');
  return { DashboardView: () => <Text>{'<Dashboard/>'}</Text> };
});
vi.mock('./views/installed.js', async () => {
  const { Text } = await import('ink');
  return { InstalledView: () => <Text>{'<Installed/>'}</Text> };
});
vi.mock('./views/search.js', async () => {
  const { Text } = await import('ink');
  return { SearchView: () => <Text>{'<Search/>'}</Text> };
});
vi.mock('./views/outdated.js', async () => {
  const { Text } = await import('ink');
  return { OutdatedView: () => <Text>{'<Outdated/>'}</Text> };
});
vi.mock('./views/package-info.js', async () => {
  const { Text } = await import('ink');
  return { PackageInfoView: () => <Text>{'<PackageInfo/>'}</Text> };
});
vi.mock('./views/services.js', async () => {
  const { Text } = await import('ink');
  return { ServicesView: () => <Text>{'<Services/>'}</Text> };
});
vi.mock('./views/doctor.js', async () => {
  const { Text } = await import('ink');
  return { DoctorView: () => <Text>{'<Doctor/>'}</Text> };
});
vi.mock('./views/profiles.js', async () => {
  const { Text } = await import('ink');
  return { ProfilesView: () => <Text>{'<Profiles/>'}</Text> };
});
vi.mock('./views/smart-cleanup.js', async () => {
  const { Text } = await import('ink');
  return { SmartCleanupView: () => <Text>{'<SmartCleanup/>'}</Text> };
});
vi.mock('./views/history.js', async () => {
  const { Text } = await import('ink');
  return { HistoryView: () => <Text>{'<History/>'}</Text> };
});
vi.mock('./views/security-audit.js', async () => {
  const { Text } = await import('ink');
  return { SecurityAuditView: () => <Text>{'<SecurityAudit/>'}</Text> };
});
vi.mock('./views/account.js', async () => {
  const { Text } = await import('ink');
  return { AccountView: () => <Text>{'<Account/>'}</Text> };
});
vi.mock('./views/rollback.js', async () => {
  const { Text } = await import('ink');
  return { RollbackView: () => <Text>{'<Rollback/>'}</Text> };
});
vi.mock('./views/brewfile.js', async () => {
  const { Text } = await import('ink');
  return { BrewfileView: () => <Text>{'<Brewfile/>'}</Text> };
});
vi.mock('./views/sync.js', async () => {
  const { Text } = await import('ink');
  return { SyncView: () => <Text>{'<Sync/>'}</Text> };
});
vi.mock('./views/compliance.js', async () => {
  const { Text } = await import('ink');
  return { ComplianceView: () => <Text>{'<Compliance/>'}</Text> };
});

// UpgradePrompt has its own render tests; here we only need a sentinel
// the router uses for gated views.
vi.mock('./components/common/upgrade-prompt.js', async () => {
  const { Text } = await import('ink');
  return {
    UpgradePrompt: ({ viewId }: { viewId: string }) => <Text>{`<UpgradePrompt:${viewId}/>`}</Text>,
  };
});

vi.mock('./components/layout/app-layout.js', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./hooks/use-keyboard.js', () => ({
  useGlobalKeyboard: () => {},
}));

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  return {
    ...actual,
    useApp: () => ({ exit: () => {} }),
  };
});

import { useNavigationStore } from './stores/navigation-store.js';
import { useLicenseStore } from './stores/license-store.js';
import { App } from './app.js';
import type { ViewId } from './lib/types.js';

beforeEach(() => {
  // Free tier by default
  useLicenseStore.setState({ status: 'free', license: null });
});

function setView(view: ViewId) {
  useNavigationStore.setState({ currentView: view, selectedPackage: null, selectedPackageType: null });
}

describe('<ViewRouter>', () => {
  it('renders DashboardView for the dashboard route', () => {
    setView('dashboard');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<Dashboard/>');
  });

  it('renders OutdatedView (free, not gated)', () => {
    setView('outdated');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<Outdated/>');
  });

  it('shows UpgradePrompt for Pro views when free', () => {
    setView('profiles');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<UpgradePrompt:profiles/>');
    expect(lastFrame()).not.toContain('<Profiles/>');
  });

  it('renders the Pro view itself when isPro returns true', () => {
    useLicenseStore.setState({ status: 'pro' });
    setView('security-audit');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<SecurityAudit/>');
    expect(lastFrame()).not.toContain('UpgradePrompt');
  });

  it('shows UpgradePrompt for compliance when only Pro (not Team)', () => {
    useLicenseStore.setState({ status: 'pro' });
    setView('compliance');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<UpgradePrompt:compliance/>');
  });

  it('renders ComplianceView when status is team', () => {
    useLicenseStore.setState({ status: 'team' });
    setView('compliance');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<Compliance/>');
  });

  it('Team status also unlocks Pro views (superset)', () => {
    useLicenseStore.setState({ status: 'team' });
    setView('rollback');
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('<Rollback/>');
  });
});
