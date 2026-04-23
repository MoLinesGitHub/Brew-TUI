import { create } from 'zustand';
import type { ViewId } from '../lib/types.js';

interface NavigationState {
  currentView: ViewId;
  previousView: ViewId | null;
  selectedPackage: string | null;
  viewHistory: ViewId[];
  navigate: (view: ViewId) => void;
  goBack: () => void;
  selectPackage: (name: string | null) => void;
}

const VIEWS: ViewId[] = [
  'dashboard', 'installed', 'search', 'outdated', 'package-info', 'services', 'doctor',
  'profiles', 'smart-cleanup', 'history', 'security-audit', 'account',
];

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentView: 'dashboard',
  previousView: null,
  selectedPackage: null,
  viewHistory: [],

  navigate: (view) => {
    const { currentView, viewHistory } = get();
    if (view === currentView) return;
    set({
      currentView: view,
      previousView: currentView,
      viewHistory: [...viewHistory.slice(-19), currentView],
    });
  },

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length === 0) return;
    const prev = viewHistory[viewHistory.length - 1];
    set({
      currentView: prev,
      previousView: get().currentView,
      viewHistory: viewHistory.slice(0, -1),
    });
  },

  selectPackage: (name) => set({ selectedPackage: name }),
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
