import { create } from 'zustand';
import type { Profile } from '../lib/profiles/types.js';
import * as manager from '../lib/profiles/profile-manager.js';

interface ProfileState {
  profileNames: string[];
  selectedProfile: Profile | null;
  loading: boolean;
  loadError: string | null;

  fetchProfiles: () => Promise<void>;
  loadProfile: (name: string) => Promise<void>;
  exportCurrent: (name: string, description: string) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profileNames: [],
  selectedProfile: null,
  loading: false,
  loadError: null,

  fetchProfiles: async () => {
    set({ loading: true });
    const names = await manager.listProfiles();
    set({ profileNames: names, loading: false });
  },

  loadProfile: async (name) => {
    set({ loadError: null });
    try {
      const profile = await manager.loadProfile(name);
      set({ selectedProfile: profile });
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : String(err) });
    }
  },

  exportCurrent: async (name, description) => {
    set({ loading: true, loadError: null });
    try {
      await manager.exportCurrentSetup(name, description);
      const names = await manager.listProfiles();
      set({ profileNames: names, loading: false });
    } catch (err) {
      set({ loading: false, loadError: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  deleteProfile: async (name) => {
    await manager.deleteProfile(name);
    const names = await manager.listProfiles();
    set({ profileNames: names, selectedProfile: null });
  },
}));
