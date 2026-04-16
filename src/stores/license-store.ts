import { create } from 'zustand';
import type { LicenseData, LicenseStatus } from '../lib/license/types.js';
import * as manager from '../lib/license/license-manager.js';
import { ensureDataDirs } from '../lib/data-dir.js';

interface LicenseState {
  status: LicenseStatus;
  license: LicenseData | null;
  error: string | null;

  initialize: () => Promise<void>;
  activate: (key: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
  isPro: () => boolean;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  status: 'free',
  license: null,
  error: null,

  initialize: async () => {
    await ensureDataDirs();
    const license = await manager.loadLicense();

    if (!license) {
      set({ status: 'free', license: null });
      return;
    }

    if (manager.isExpired(license)) {
      set({ status: 'expired', license });
      return;
    }

    // Set Pro immediately, revalidate in background
    set({ status: 'pro', license });

    if (manager.needsRevalidation(license)) {
      const valid = await manager.revalidate(license);
      if (!valid) {
        set({ status: 'expired', license: { ...license, status: 'expired' } });
      } else {
        // Refresh license data from disk after revalidation
        const updated = await manager.loadLicense();
        if (updated) set({ license: updated });
      }
    }
  },

  activate: async (key) => {
    set({ error: null });
    try {
      const license = await manager.activate(key);
      set({ status: 'pro', license });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return false;
    }
  },

  deactivate: async () => {
    const { license } = get();
    if (license) {
      await manager.deactivate(license);
    }
    set({ status: 'free', license: null, error: null });
  },

  isPro: () => get().status === 'pro',
}));
