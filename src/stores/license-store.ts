import { create } from 'zustand';
import type { LicenseData, LicenseStatus } from '../lib/license/types.js';
import * as manager from '../lib/license/license-manager.js';
import { getDegradationLevel } from '../lib/license/license-manager.js';
import type { DegradationLevel } from '../lib/license/license-manager.js';
import { ensureDataDirs } from '../lib/data-dir.js';
import { initStoreIntegrity } from '../lib/license/anti-tamper.js';

const REVALIDATION_CHECK_MS = 60 * 60 * 1000; // Check every hour

// ARQ-002: Promise-based mutex for revalidation
let _revalidatingPromise: Promise<void> | null = null;
let _revalidationInterval: ReturnType<typeof setInterval> | null = null;

interface LicenseState {
  status: LicenseStatus;
  license: LicenseData | null;
  error: string | null;
  degradation: DegradationLevel;

  initialize: () => Promise<void>;
  activate: (key: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
  isPro: () => boolean;
}

async function doRevalidation(
  license: LicenseData,
  set: (partial: Partial<LicenseState>) => void,
): Promise<void> {
  const result = await manager.revalidate(license);
  if (result === 'expired') {
    set({ status: 'expired', license: { ...license, status: 'expired' }, degradation: 'expired' });
  } else {
    const updated = await manager.loadLicense();
    const effective = updated ?? license;
    set({ license: effective, degradation: getDegradationLevel(effective) });
  }
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  status: 'validating',
  license: null,
  error: null,
  degradation: 'none',

  initialize: async () => {
    initStoreIntegrity(useLicenseStore);
    await ensureDataDirs();
    const license = await manager.loadLicense();

    if (!license) {
      set({ status: 'free', license: null, degradation: 'none' });
      return;
    }

    if (manager.isExpired(license)) {
      set({ status: 'expired', license, degradation: 'expired' });
      return;
    }

    // Layer 15: Check degradation level based on offline time
    const level = getDegradationLevel(license);
    if (level === 'expired') {
      set({ status: 'expired', license, degradation: 'expired' });
      return;
    }

    // Set Pro immediately (warning/limited still shown as pro, but pro-guard checks degradation)
    set({ status: 'pro', license, degradation: level });

    if (manager.needsRevalidation(license)) {
      if (!_revalidatingPromise) {
        _revalidatingPromise = doRevalidation(license, set)
          .finally(() => { _revalidatingPromise = null; });
      }
      await _revalidatingPromise;
    }

    // Periodically re-check license validity during the session
    if (_revalidationInterval) clearInterval(_revalidationInterval);
    _revalidationInterval = setInterval(() => {
      const current = get().license;
      if (!current || get().status !== 'pro') return;
      if (!manager.needsRevalidation(current)) return;
      if (_revalidatingPromise) return;
      _revalidatingPromise = doRevalidation(current, set)
        .finally(() => { _revalidatingPromise = null; });
    }, REVALIDATION_CHECK_MS);
    _revalidationInterval.unref();
  },

  activate: async (key) => {
    set({ error: null });
    try {
      const license = await manager.activate(key);
      set({ status: 'pro', license, degradation: 'none' });
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
      const { remoteSuccess } = await manager.deactivate(license);
      if (!remoteSuccess) {
        set({ status: 'free', license: null, degradation: 'none', error: 'License removed locally but server deactivation failed. It may remain active remotely.' });
        return;
      }
    }
    set({ status: 'free', license: null, degradation: 'none', error: null });
  },

  isPro: () => get().status === 'pro',
}));
