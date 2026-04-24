import { create } from 'zustand';
import type { SecurityAuditSummary } from '../lib/security/types.js';
import { runSecurityAudit } from '../lib/security/audit-runner.js';
import { useBrewStore } from './brew-store.js';
import { useLicenseStore } from './license-store.js';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface SecurityState {
  summary: SecurityAuditSummary | null;
  loading: boolean;
  error: string | null;
  cachedAt: number | null;

  scan: (forceRefresh?: boolean) => Promise<void>;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  summary: null,
  loading: false,
  error: null,
  cachedAt: null,

  scan: async (forceRefresh = false) => {
    // ARQ-005: Use cached results if available and fresh
    const { summary, cachedAt } = get();
    if (!forceRefresh && summary && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const brewState = useBrewStore.getState();
      if (brewState.formulae.length === 0) {
        await brewState.fetchInstalled();
      }
      const { formulae, casks } = useBrewStore.getState();
      const isPro = useLicenseStore.getState().isPro();
      const result = await runSecurityAudit(isPro, formulae, casks);
      set({ summary: result, loading: false, cachedAt: Date.now() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },
}));
