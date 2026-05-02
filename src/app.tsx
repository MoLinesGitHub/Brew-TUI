import React, { useEffect, useState } from 'react';
import { useApp } from 'ink';
import { AppLayout } from './components/layout/app-layout.js';
import { useNavigationStore } from './stores/navigation-store.js';
import { useLicenseStore } from './stores/license-store.js';
import { useGlobalKeyboard } from './hooks/use-keyboard.js';
import { hasCompletedOnboarding } from './lib/onboarding.js';
import { WelcomeView } from './views/welcome.js';
import { isProView, isTeamView } from './lib/license/feature-gate.js';
import { UpgradePrompt } from './components/common/upgrade-prompt.js';
import { DashboardView } from './views/dashboard.js';
import { InstalledView } from './views/installed.js';
import { SearchView } from './views/search.js';
import { OutdatedView } from './views/outdated.js';
import { PackageInfoView } from './views/package-info.js';
import { ServicesView } from './views/services.js';
import { DoctorView } from './views/doctor.js';
import { ProfilesView } from './views/profiles.js';
import { SmartCleanupView } from './views/smart-cleanup.js';
import { HistoryView } from './views/history.js';
import { SecurityAuditView } from './views/security-audit.js';
import { AccountView } from './views/account.js';
import { RollbackView } from './views/rollback.js';
import { BrewfileView } from './views/brewfile.js';
import { SyncView } from './views/sync.js';
import { ComplianceView } from './views/compliance.js';
import type { ViewId } from './lib/types.js';

// FE-009: Extracted LicenseInitializer component
function LicenseInitializer() {
  const initLicense = useLicenseStore((s) => s.initialize);
  useEffect(() => { initLicense(); }, []);
  return null;
}

// FE-009: Extracted ViewRouter component
function ViewRouter({ currentView }: { currentView: ViewId }) {
  const isPro = useLicenseStore((s) => s.isPro);
  const isTeam = useLicenseStore((s) => s.isTeam);

  // Gate Pro views
  if (isProView(currentView) && !isPro()) {
    return <UpgradePrompt viewId={currentView} />;
  }

  // Gate Team views
  if (isTeamView(currentView) && !isTeam()) {
    return <UpgradePrompt viewId={currentView} />;
  }

  switch (currentView) {
    case 'dashboard': return <DashboardView />;
    case 'installed': return <InstalledView />;
    case 'search': return <SearchView />;
    case 'outdated': return <OutdatedView />;
    case 'package-info': return <PackageInfoView />;
    case 'services': return <ServicesView />;
    case 'doctor': return <DoctorView />;
    case 'profiles': return <ProfilesView />;
    case 'smart-cleanup': return <SmartCleanupView />;
    case 'history': return <HistoryView />;
    case 'rollback': return <RollbackView />;
    case 'brewfile': return <BrewfileView />;
    case 'sync': return <SyncView />;
    case 'security-audit': return <SecurityAuditView />;
    case 'compliance': return <ComplianceView />;
    case 'account': return <AccountView />;
  }
}

export function App() {
  const { exit } = useApp();
  const currentView = useNavigationStore((s) => s.currentView);

  // UX-002: gate the whole app behind a one-shot welcome screen on first run.
  // Loading state is `null` until the disk check finishes — we render nothing
  // for that frame so a returning user never sees the welcome flash. In Vitest
  // (NODE_ENV=test) we skip the disk hop so render-tests keep their semantics.
  const isTestEnv = typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'test';
  const [showWelcome, setShowWelcome] = useState<boolean | null>(isTestEnv ? false : null);
  useEffect(() => {
    if (isTestEnv) return;
    void hasCompletedOnboarding().then((done) => setShowWelcome(!done));
  }, []);

  useGlobalKeyboard({ onQuit: exit });

  if (showWelcome === null) {
    return <AppLayout><></></AppLayout>;
  }

  if (showWelcome) {
    return (
      <AppLayout>
        <WelcomeView onContinue={() => setShowWelcome(false)} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <LicenseInitializer />
      <ViewRouter currentView={currentView} />
    </AppLayout>
  );
}
