import { useLicenseStore } from '../../stores/license-store.js';
import { isDebuggerAttached } from './anti-debug.js';
import { verifyStoreIntegrity } from './anti-tamper.js';
import { checkCanaries } from './canary.js';
import { checkBundleIntegrity } from './integrity.js';
import { getDegradationLevel } from './license-manager.js';

// ── Layer 14: Obfuscated secondary verification ──
// Secondary verification using indirect property access.
// Resists simple string-search bypass (searching for "status" or "pro").
const _S = String.fromCharCode(115, 116, 97, 116, 117, 115); // "status"
const _P = String.fromCharCode(112, 114, 111); // "pro"

export function _verify(): boolean {
  const state = useLicenseStore.getState();
  return (state as unknown as Record<string, unknown>)[_S] === _P;
}

/**
 * Multi-layered Pro license verification. Call this inside Pro feature logic
 * (not just at the view gate) as a defense-in-depth check.
 * Combines direct store check, bundle integrity, debugger detection,
 * obfuscated indirect check, store integrity, canary checks, and
 * degradation level.
 * Returns true if Pro, false otherwise.
 */
export function verifyPro(): boolean {
  if (isDebuggerAttached()) return false;
  if (!checkBundleIntegrity()) return false;
  if (!verifyStoreIntegrity()) return false;
  if (!checkCanaries()) return false;

  const directCheck = useLicenseStore.getState().status === 'pro';
  const indirectCheck = _verify();

  // Both must agree — if someone patched one, the other catches it
  if (!directCheck || !indirectCheck) return false;

  // Layer 15: Check degradation level (time-bomb for extended offline)
  const license = useLicenseStore.getState().license;
  if (license) {
    const level = getDegradationLevel(license);
    if (level === 'expired' || level === 'limited') return false;
  }

  return true;
}

/**
 * Throws if not Pro. Use in critical Pro-only operations.
 */
export function requirePro(): void {
  if (!verifyPro()) {
    throw new Error('Pro license required');
  }
}
