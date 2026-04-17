import { useLicenseStore } from '../../stores/license-store.js';

// Store references to the original functions at module load time
const _originalIsPro = useLicenseStore.getState().isPro;
const _originalGetState = useLicenseStore.getState;

/**
 * Verify that the license store's isPro function hasn't been replaced
 * with a function that always returns true.
 */
export function verifyStoreIntegrity(): boolean {
  const state = useLicenseStore.getState();

  // Check 1: isPro function reference hasn't changed
  if (state.isPro !== _originalIsPro) return false;

  // Check 2: getState itself hasn't been replaced
  if (useLicenseStore.getState !== _originalGetState) return false;

  // Check 3: If status is 'free', isPro() must return false
  // (catches patches that make isPro() always return true regardless of status)
  if (state.status === 'free' && state.isPro()) return false;

  return true;
}
