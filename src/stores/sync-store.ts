import { create } from 'zustand';
import type { SyncConfig, SyncConflict, SyncResult } from '../lib/sync/types.js';
import {
  sync,
  loadSyncConfig,
  applyConflictResolutions,
} from '../lib/sync/sync-engine.js';
import { readSyncEnvelope } from '../lib/sync/backends/icloud-backend.js';
import { decryptPayload } from '../lib/sync/crypto.js';
import { logger } from '../utils/logger.js';
import type { BrewfileSchema } from '../lib/brewfile/types.js';

interface SyncState {
  config: SyncConfig | null;
  lastResult: SyncResult | null;
  conflicts: SyncConflict[];
  loading: boolean;
  error: string | null;

  initialize: (isPro: boolean) => Promise<void>;
  syncNow: (isPro: boolean, brewfile?: BrewfileSchema) => Promise<void>;
  resolveConflicts: (
    resolutions: Array<{ conflict: SyncConflict; resolution: 'use-local' | 'use-remote' }>,
  ) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  config: null,
  lastResult: null,
  conflicts: [],
  loading: false,
  error: null,

  initialize: async (isPro: boolean) => {
    if (!isPro) return;
    try {
      const config = await loadSyncConfig();
      set({ config });
    } catch (err) {
      logger.warn('sync-store: could not load config', { error: String(err) });
    }
  },

  syncNow: async (isPro: boolean, brewfile?: BrewfileSchema) => {
    set({ loading: true, error: null });
    try {
      const result = await sync(isPro, brewfile);
      if (result.conflicts.length > 0) {
        set({ conflicts: result.conflicts, lastResult: result, loading: false });
      } else {
        const config = await loadSyncConfig();
        set({ config, lastResult: result, conflicts: [], loading: false });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set({ error, loading: false });
    }
  },

  resolveConflicts: async (resolutions) => {
    set({ loading: true, error: null });
    try {
      const config = get().config;
      if (!config) throw new Error('Sync not initialized');

      // Load current payload from iCloud
      const envelope = await readSyncEnvelope();
      if (!envelope) throw new Error('No sync data found');

      const payload = decryptPayload(envelope.encrypted, envelope.iv, envelope.tag);
      await applyConflictResolutions(payload, resolutions, config.machineId);

      const updatedConfig = await loadSyncConfig();
      set({ config: updatedConfig, conflicts: [], loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set({ error, loading: false });
    }
  },
}));
