import { create } from 'zustand';
import type { SecurityAuditSummary } from '../lib/security/types.js';
import { runSecurityAudit } from '../lib/security/audit-runner.js';
import { useBrewStore } from './brew-store.js';

interface SecurityState {
  summary: SecurityAuditSummary | null;
  loading: boolean;
  error: string | null;

  scan: () => Promise<void>;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  summary: null,
  loading: false,
  error: null,

  scan: async () => {
    set({ loading: true, error: null });
    try {
      const brewState = useBrewStore.getState();
      if (brewState.formulae.length === 0) {
        await brewState.fetchInstalled();
      }
      const { formulae, casks } = useBrewStore.getState();
      const summary = await runSecurityAudit(formulae, casks);
      set({ summary, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },
}));
