import React, { useEffect } from 'react';
import { useApp } from 'ink';
import { AppLayout } from './components/layout/app-layout.js';
import { useNavigationStore } from './stores/navigation-store.js';
import { useLicenseStore } from './stores/license-store.js';
import { useGlobalKeyboard } from './hooks/use-keyboard.js';
import { isProView } from './lib/license/feature-gate.js';
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

  // Gate Pro views
  if (isProView(currentView) && !isPro()) {
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
    case 'security-audit': return <SecurityAuditView />;
    case 'account': return <AccountView />;
  }
}

export function App() {
  const { exit } = useApp();
  const currentView = useNavigationStore((s) => s.currentView);

  useGlobalKeyboard({ onQuit: exit });

  return (
    <AppLayout>
      <LicenseInitializer />
      <ViewRouter currentView={currentView} />
    </AppLayout>
  );
}
