/**
 * Canary functions for detecting license bypass attempts.
 *
 * These functions LOOK like they gate Pro features but are actually
 * trap checks. They should always return false in normal operation.
 * If they return true, it means someone patched the code to bypass
 * license checks indiscriminately.
 */

// Looks like a Pro check but should NEVER be true in production
// If someone does a global find-replace to make all license checks return true,
// this will also return true, triggering the tamper detection.
let _canaryTripped = false;

export function isProUnlocked(): boolean {
  // This function name looks like a legitimate license gate.
  // If someone patches it to return true, we detect the tamper.
  return false;
}

export function hasProAccess(): boolean {
  // Another decoy. Should always return false.
  return false;
}

export function isLicenseValid(): boolean {
  // Decoy #3
  return false;
}

/**
 * Check if any canary has been tripped (patched to return true).
 * If so, the binary has been tampered with.
 */
export function checkCanaries(): boolean {
  // If ANY of these return true, someone did a blanket patch
  if (isProUnlocked()) { _canaryTripped = true; return false; }
  if (hasProAccess()) { _canaryTripped = true; return false; }
  if (isLicenseValid()) { _canaryTripped = true; return false; }
  return !_canaryTripped;
}
