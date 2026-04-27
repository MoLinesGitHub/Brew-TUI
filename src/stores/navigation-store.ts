import { create } from 'zustand';
import type { ViewId } from '../lib/types.js';

interface NavigationState {
  currentView: ViewId;
  selectedPackage: string | null;
  selectedPackageType: 'formula' | 'cask' | null;
  viewHistory: ViewId[];
  navigate: (view: ViewId) => void;
  goBack: () => void;
  selectPackage: (name: string | null, type?: 'formula' | 'cask' | null) => void;
}

const VIEWS: ViewId[] = [
  'dashboard', 'installed', 'outdated', 'package-info', 'services', 'doctor',
  'profiles', 'smart-cleanup', 'history', 'rollback', 'brewfile', 'sync', 'security-audit', 'compliance', 'account',
];

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentView: 'dashboard',
  selectedPackage: null,
  selectedPackageType: null,
  viewHistory: [],

  navigate: (view) => {
    const { currentView, viewHistory } = get();
    if (view === currentView) return;
    set({
      currentView: view,
      viewHistory: [...viewHistory.slice(-19), currentView],
    });
  },

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length === 0) return;
    const prev = viewHistory[viewHistory.length - 1];
    set({
      currentView: prev,
      viewHistory: viewHistory.slice(0, -1),
    });
  },

  selectPackage: (name, type = null) => set({ selectedPackage: name, selectedPackageType: type }),
}));

export function getNextView(current: ViewId): ViewId {
  const idx = VIEWS.indexOf(current);
  return VIEWS[(idx + 1) % VIEWS.length]!;
}

export function getPrevView(current: ViewId): ViewId {
  const idx = VIEWS.indexOf(current);
  return VIEWS[(idx - 1 + VIEWS.length) % VIEWS.length]!;
}

export { VIEWS };
