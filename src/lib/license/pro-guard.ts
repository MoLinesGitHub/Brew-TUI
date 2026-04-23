import { isDebuggerAttached } from './anti-debug.js';
import { verifyStoreIntegrity } from './anti-tamper.js';
import { checkCanaries } from './canary.js';
import { checkBundleIntegrity } from './integrity.js';
import { getDegradationLevel } from './license-manager.js';
import type { LicenseData, LicenseStatus } from './types.js';

// ── Layer 14: Obfuscated secondary verification ──
// Secondary verification using indirect property access.
// Resists simple string-search bypass (searching for "status" or "pro").
const _P = String.fromCharCode(112, 114, 111); // "pro"

export function _verify(status: string): boolean {
  return status === _P;
}

/**
 * Multi-layered Pro license verification. Call this inside Pro feature logic
 * (not just at the view gate) as a defense-in-depth check.
 * Combines direct store check, bundle integrity, debugger detection,
 * obfuscated indirect check, store integrity, canary checks, and
 * degradation level.
 * Returns true if Pro, false otherwise.
 */
export function verifyPro(license: LicenseData | null, status: LicenseStatus): boolean {
  if (isDebuggerAttached()) return false;
  if (!checkBundleIntegrity()) return false;
  if (!verifyStoreIntegrity()) return false;
  if (!checkCanaries()) return false;

  const directCheck = status === 'pro';
  const indirectCheck = _verify(status);

  // Both must agree — if someone patched one, the other catches it
  if (!directCheck || !indirectCheck) return false;

  // Layer 15: Check degradation level (time-bomb for extended offline)
  if (license) {
    const level = getDegradationLevel(license);
    if (level === 'expired' || level === 'limited') return false;
  }

  return true;
}

/**
 * Throws if not Pro. Use in critical Pro-only operations.
 */
export function requirePro(license: LicenseData | null, status: LicenseStatus): void {
  if (!verifyPro(license, status)) {
    throw new Error('Pro license required');
  }
}
