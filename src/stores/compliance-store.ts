import { create } from 'zustand';
import type { PolicyFile, ComplianceReport } from '../lib/compliance/types.js';
import { checkCompliance } from '../lib/compliance/compliance-checker.js';
import { loadPolicy } from '../lib/compliance/policy-io.js';

interface ComplianceState {
  policy: PolicyFile | null;
  report: ComplianceReport | null;
  loading: boolean;
  error: string | null;

  importPolicy: (filePath: string, isPro: boolean) => Promise<void>;
  runCheck: (isPro: boolean) => Promise<void>;
  clearPolicy: () => void;
}

export const useComplianceStore = create<ComplianceState>((set, get) => ({
  policy: null,
  report: null,
  loading: false,
  error: null,

  importPolicy: async (filePath: string, isPro: boolean) => {
    if (!isPro) {
      set({ error: 'Pro license required' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const policy = await loadPolicy(filePath);
      set({ policy, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set({ error, loading: false });
    }
  },

  runCheck: async (isPro: boolean) => {
    const { policy } = get();
    if (!policy) return;
    set({ loading: true, error: null });
    try {
      const report = await checkCompliance(policy, isPro);
      set({ report, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      set({ error, loading: false });
    }
  },

  clearPolicy: () => set({ policy: null, report: null, error: null }),
}));
