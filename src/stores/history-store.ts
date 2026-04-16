import { create } from 'zustand';
import type { HistoryEntry, HistoryAction } from '../lib/history/types.js';
import * as logger from '../lib/history/history-logger.js';

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
      const entries = await logger.loadHistory();
      set({ entries, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  logAction: async (action, packageName, success, error = null) => {
    await logger.appendEntry(action, packageName, success, error);
    const entries = await logger.loadHistory();
    set({ entries });
  },

  clearHistory: async () => {
    await logger.clearHistory();
    set({ entries: [] });
  },
}));
