import type { LicenseStatus } from './types.js';

interface LicenseStoreSnapshot {
  status: LicenseStatus;
  isPro: () => boolean;
}

interface LicenseStoreApi {
  getState: () => LicenseStoreSnapshot;
}

// Lazy-captured references: initialized on first call to initStoreIntegrity()
let _originalIsPro: (() => boolean) | null = null;
let _originalGetState: (() => LicenseStoreSnapshot) | null = null;
let _storeApi: LicenseStoreApi | null = null;

/**
 * Capture the original store function references for later integrity checks.
 * Call this once during license store initialization.
 */
export function initStoreIntegrity(store: LicenseStoreApi): void {
  _storeApi = store;
  _originalIsPro = store.getState().isPro;
  _originalGetState = store.getState;
}

/**
 * Verify that the license store's isPro function hasn't been replaced
 * with a function that always returns true.
 */
export function verifyStoreIntegrity(): boolean {
  if (!_storeApi || !_originalIsPro || !_originalGetState) return false;

  const state = _storeApi.getState();

  // Check 1: isPro function reference hasn't changed
  if (state.isPro !== _originalIsPro) return false;

  // Check 2: getState itself hasn't been replaced
  if (_storeApi.getState !== _originalGetState) return false;

  // Check 3: If status is 'free', isPro() must return false
  // (catches patches that make isPro() always return true regardless of status)
  if (state.status === 'free' && state.isPro()) return false;

  return true;
}
