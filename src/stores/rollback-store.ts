import { create } from 'zustand';
import type { BrewSnapshot } from '../lib/state-snapshot/snapshot.js';
import { loadSnapshots, buildRollbackPlan } from '../lib/rollback/rollback-engine.js';
import type { RollbackPlan } from '../lib/rollback/types.js';

interface RollbackState {
  snapshots: BrewSnapshot[];
  loading: boolean;
  error: string | null;
  selectedSnapshot: BrewSnapshot | null;
  plan: RollbackPlan | null;
  planLoading: boolean;
  planError: string | null;

  fetchSnapshots: (isPro: boolean) => Promise<void>;
  selectSnapshot: (s: BrewSnapshot | null, isPro: boolean) => Promise<void>;
  clearPlan: () => void;
}

export const useRollbackStore = create<RollbackState>((set) => ({
  snapshots: [],
  loading: false,
  error: null,
  selectedSnapshot: null,
  plan: null,
  planLoading: false,
  planError: null,

  fetchSnapshots: async (isPro) => {
    if (!isPro) return;
    set({ loading: true, error: null });
    try {
      const snapshots = await loadSnapshots();
      set({ snapshots, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  selectSnapshot: async (snapshot, isPro) => {
    if (!snapshot) {
      set({ selectedSnapshot: null, plan: null, planError: null });
      return;
    }
    set({ selectedSnapshot: snapshot, plan: null, planLoading: true, planError: null });
    try {
      const plan = await buildRollbackPlan(snapshot, isPro);
      set({ plan, planLoading: false });
    } catch (err) {
      set({ planError: err instanceof Error ? err.message : String(err), planLoading: false });
    }
  },

  clearPlan: () => set({ selectedSnapshot: null, plan: null, planError: null }),
}));
