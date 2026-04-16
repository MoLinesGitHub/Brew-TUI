import { create } from 'zustand';
import type { HistoryEntry, HistoryAction } from '../lib/history/types.js';
import * as logger from '../lib/history/history-logger.js';

interface HistoryState {
  entries: HistoryEntry[];
  loading: boolean;

  fetchHistory: () => Promise<void>;
  logAction: (action: HistoryAction, packageName: string | null, success: boolean, error?: string | null) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  loading: false,

  fetchHistory: async () => {
    set({ loading: true });
    const entries = await logger.loadHistory();
    set({ entries, loading: false });
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
