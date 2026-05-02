import { access, writeFile, mkdir } from 'node:fs/promises';
import { ensureDataDirs, ONBOARDING_FLAG_PATH, DATA_DIR } from './data-dir.js';

// UX-002: a minimal first-run flag. The TUI flips this once the user dismisses
// the welcome screen so subsequent launches go straight to the dashboard. The
// file's *existence* is the signal — we never read its contents — which keeps
// migration cost zero if we later decide to track richer state.

let cached: boolean | null = null;

export async function hasCompletedOnboarding(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    await access(ONBOARDING_FLAG_PATH);
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}

export async function markOnboardingComplete(): Promise<void> {
  await ensureDataDirs();
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await writeFile(ONBOARDING_FLAG_PATH, new Date().toISOString(), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  cached = true;
}

// Test seam — never call from production code.
export function _resetOnboardingCacheForTests(): void {
  cached = null;
}
