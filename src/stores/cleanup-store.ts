import { create } from 'zustand';
import type { CleanupSummary } from '../lib/cleanup/types.js';
import { analyzeCleanup } from '../lib/cleanup/cleanup-analyzer.js';
import { useBrewStore } from './brew-store.js';
import { useLicenseStore } from './license-store.js';
import { verifyPro } from '../lib/license/pro-guard.js';

interface CleanupState {
  summary: CleanupSummary | null;
  selected: Set<string>;
  loading: boolean;
  error: string | null;

  analyze: () => Promise<void>;
  toggleSelect: (name: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export const useCleanupStore = create<CleanupState>((set, get) => ({
  summary: null,
  selected: new Set(),
  loading: false,
  error: null,

  analyze: async () => {
    set({ loading: true, error: null });
    try {
      const brewState = useBrewStore.getState();
      if (brewState.formulae.length === 0) {
        await brewState.fetchInstalled();
        await brewState.fetchLeaves();
      }
      const { formulae, leaves } = useBrewStore.getState();
      const { license, status } = useLicenseStore.getState();
      const isPro = verifyPro(license, status);
      const summary = await analyzeCleanup(isPro, formulae, leaves);
      set({ summary, selected: new Set(), loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  toggleSelect: (name) => {
    const selected = new Set(get().selected);
    if (selected.has(name)) selected.delete(name);
    else selected.add(name);
    set({ selected });
  },

  selectAll: () => {
    const names = get().summary?.candidates.map((c) => c.name) ?? [];
    set({ selected: new Set(names) });
  },

  deselectAll: () => set({ selected: new Set() }),
}));
