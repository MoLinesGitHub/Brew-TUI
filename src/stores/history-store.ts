import { create } from 'zustand';
import type { HistoryEntry, HistoryAction } from '../lib/history/types.js';
import * as historyLogger from '../lib/history/history-logger.js';
import { useLicenseStore } from './license-store.js';
import { verifyPro } from '../lib/license/pro-guard.js';

function getStrongIsPro(): boolean {
  const { license, status } = useLicenseStore.getState();
  return verifyPro(license, status);
}

interface HistoryState {
  entries: HistoryEntry[];
  loading: boolean;
  error: string | null;

  fetchHistory: () => Promise<void>;
  logAction: (action: HistoryAction, packageName: string | null, success: boolean, error?: string | null) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  loading: false,
  error: null,

  fetchHistory: async () => {
    set({ loading: true, error: null });
    try {
      const isPro = getStrongIsPro();
      const entries = await historyLogger.loadHistory(isPro);
      set({ entries, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  logAction: async (action, packageName, success, error = null) => {
    const isPro = getStrongIsPro();
    await historyLogger.appendEntry(isPro, action, packageName, success, error);
    const entries = await historyLogger.loadHistory(isPro);
    set({ entries });
  },

  clearHistory: async () => {
    const isPro = getStrongIsPro();
    await historyLogger.clearHistory(isPro);
    set({ entries: [] });
  },
}));
