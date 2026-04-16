import { create } from 'zustand';
import type { Formula, Cask, OutdatedPackage, BrewService, BrewConfig } from '../lib/types.js';
import * as api from '../lib/brew-api.js';

interface BrewState {
  formulae: Formula[];
  casks: Cask[];
  outdated: { formulae: OutdatedPackage[]; casks: OutdatedPackage[] };
  services: BrewService[];
  config: BrewConfig | null;
  leaves: string[];
  doctorWarnings: string[];
  doctorClean: boolean | null;

  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  fetchInstalled: () => Promise<void>;
  fetchOutdated: () => Promise<void>;
  fetchServices: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchLeaves: () => Promise<void>;
  fetchDoctor: () => Promise<void>;
  fetchAll: () => Promise<void>;

  uninstallPackage: (name: string) => Promise<void>;
  serviceAction: (name: string, action: 'start' | 'stop' | 'restart') => Promise<void>;
}

function setLoading(set: (fn: (s: BrewState) => Partial<BrewState>) => void, key: string, value: boolean) {
  set((s) => ({ loading: { ...s.loading, [key]: value } }));
}

function setError(set: (fn: (s: BrewState) => Partial<BrewState>) => void, key: string, error: string | null) {
  set((s) => ({ errors: { ...s.errors, [key]: error } }));
}

export const useBrewStore = create<BrewState>((set) => ({
  formulae: [],
  casks: [],
  outdated: { formulae: [], casks: [] },
  services: [],
  config: null,
  leaves: [],
  doctorWarnings: [],
  doctorClean: null,
  loading: {},
  errors: {},

  fetchInstalled: async () => {
    setLoading(set, 'installed', true);
    setError(set, 'installed', null);
    try {
      const result = await api.getInstalled();
      set({ formulae: result.formulae, casks: result.casks });
    } catch (err) {
      setError(set, 'installed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'installed', false);
    }
  },

  fetchOutdated: async () => {
    setLoading(set, 'outdated', true);
    setError(set, 'outdated', null);
    try {
      const result = await api.getOutdated();
      set({ outdated: result });
    } catch (err) {
      setError(set, 'outdated', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'outdated', false);
    }
  },

  fetchServices: async () => {
    setLoading(set, 'services', true);
    setError(set, 'services', null);
    try {
      const result = await api.getServices();
      set({ services: result });
    } catch (err) {
      setError(set, 'services', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'services', false);
    }
  },

  fetchConfig: async () => {
    setLoading(set, 'config', true);
    try {
      const result = await api.getConfig();
      set({ config: result });
    } catch (err) {
      setError(set, 'config', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'config', false);
    }
  },

  fetchLeaves: async () => {
    try {
      const result = await api.getLeaves();
      set({ leaves: result });
    } catch { /* non-critical */ }
  },

  fetchDoctor: async () => {
    setLoading(set, 'doctor', true);
    setError(set, 'doctor', null);
    try {
      const result = await api.getDoctor();
      set({ doctorWarnings: result.warnings, doctorClean: result.isClean });
    } catch (err) {
      setError(set, 'doctor', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'doctor', false);
    }
  },

  fetchAll: async () => {
    const store = useBrewStore.getState();
    await Promise.all([
      store.fetchInstalled(),
      store.fetchOutdated(),
      store.fetchServices(),
      store.fetchConfig(),
      store.fetchLeaves(),
    ]);
  },

  uninstallPackage: async (name) => {
    setLoading(set, 'action', true);
    try {
      await api.uninstallPackage(name);
      await useBrewStore.getState().fetchInstalled();
    } catch (err) {
      setError(set, 'action', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'action', false);
    }
  },

  serviceAction: async (name, action) => {
    setLoading(set, 'service-action', true);
    try {
      await api.serviceAction(name, action);
      await useBrewStore.getState().fetchServices();
    } catch (err) {
      setError(set, 'service-action', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(set, 'service-action', false);
    }
  },
}));
