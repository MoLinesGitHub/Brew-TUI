import { create } from 'zustand';
import type { Profile } from '../lib/profiles/types.js';
import * as manager from '../lib/profiles/profile-manager.js';
import { useLicenseStore } from './license-store.js';

interface ProfileState {
  profileNames: string[];
  selectedProfile: Profile | null;
  loading: boolean;
  loadError: string | null;

  fetchProfiles: () => Promise<void>;
  loadProfile: (name: string) => Promise<void>;
  exportCurrent: (name: string, description: string) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
  updateProfile: (oldName: string, newName: string, newDescription: string) => Promise<void>;
}

function getIsPro(): boolean {
  return useLicenseStore.getState().isPro();
}

export const useProfileStore = create<ProfileState>((set) => ({
  profileNames: [],
  selectedProfile: null,
  loading: false,
  loadError: null,

  fetchProfiles: async () => {
    set({ loading: true });
    const names = await manager.listProfiles(getIsPro());
    set({ profileNames: names, loading: false });
  },

  loadProfile: async (name) => {
    set({ loadError: null });
    try {
      const profile = await manager.loadProfile(getIsPro(), name);
      set({ selectedProfile: profile });
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : String(err) });
    }
  },

  exportCurrent: async (name, description) => {
    set({ loading: true, loadError: null });
    try {
      const license = useLicenseStore.getState().license;
      await manager.exportCurrentSetup(getIsPro(), name, description, license);
      const names = await manager.listProfiles(getIsPro());
      set({ profileNames: names, loading: false });
    } catch (err) {
      set({ loading: false, loadError: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  deleteProfile: async (name) => {
    await manager.deleteProfile(getIsPro(), name);
    const names = await manager.listProfiles(getIsPro());
    set({ profileNames: names, selectedProfile: null });
  },

  updateProfile: async (oldName, newName, newDescription) => {
    set({ loadError: null });
    try {
      await manager.updateProfile(getIsPro(), oldName, newName, newDescription);
      const names = await manager.listProfiles(getIsPro());
      const updated = await manager.loadProfile(getIsPro(), newName);
      set({ profileNames: names, selectedProfile: updated });
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : String(err) });
    }
  },
}));
