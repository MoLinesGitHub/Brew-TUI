import { describe, expect, it } from 'vitest';
import { isProUnlocked, hasProAccess, isLicenseValid, checkCanaries } from './canary.js';

describe('canary functions', () => {
  it('isProUnlocked returns false', () => {
    expect(isProUnlocked()).toBe(false);
  });

  it('hasProAccess returns false', () => {
    expect(hasProAccess()).toBe(false);
  });

  it('isLicenseValid returns false', () => {
    expect(isLicenseValid()).toBe(false);
  });

  it('checkCanaries returns true when no canaries are tripped', () => {
    expect(checkCanaries()).toBe(true);
  });
});
