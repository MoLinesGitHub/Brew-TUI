import { create } from 'zustand';
import type { BrewfileSchema, DriftReport } from '../lib/brewfile/types.js';
import {
  loadBrewfile,
  saveBrewfile,
  computeDrift,
  createDefaultBrewfile,
} from '../lib/brewfile/brewfile-manager.js';

interface BrewfileState {
  schema: BrewfileSchema | null;
  drift: DriftReport | null;
  loading: boolean;
  driftLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  save: (schema: BrewfileSchema) => Promise<void>;
  refreshDrift: () => Promise<void>;
  createFromCurrent: (name: string) => Promise<void>;
}

export const useBrewfileStore = create<BrewfileState>((set, get) => ({
  schema: null,
  drift: null,
  loading: false,
  driftLoading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const schema = await loadBrewfile();
      set({ schema, loading: false });
      if (schema) {
        void get().refreshDrift();
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  save: async (schema) => {
    set({ error: null });
    try {
      await saveBrewfile(schema);
      set({ schema });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  refreshDrift: async () => {
    const { schema } = get();
    if (!schema) return;
    set({ driftLoading: true, error: null });
    try {
      const drift = await computeDrift(schema);
      set({ drift, driftLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), driftLoading: false });
    }
  },

  createFromCurrent: async (name) => {
    set({ loading: true, error: null });
    try {
      const schema = await createDefaultBrewfile(name);
      await saveBrewfile(schema);
      set({ schema, loading: false });
      void get().refreshDrift();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },
}));
