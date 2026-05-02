import { describe, expect, it } from 'vitest';
import { compareSemver } from './version-check.js';

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('0.7.0', '0.7.0')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns negative when first is older', () => {
    expect(compareSemver('0.6.1', '0.7.0')).toBeLessThan(0);
    expect(compareSemver('0.7.0', '0.7.1')).toBeLessThan(0);
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('returns positive when first is newer', () => {
    expect(compareSemver('0.7.1', '0.7.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '0.99.99')).toBeGreaterThan(0);
  });

  it('treats missing trailing components as zero', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
  });

  it('treats non-numeric components as zero (defensive)', () => {
    // Real CFBundleShortVersionString is numeric, but guard anyway.
    expect(compareSemver('foo', '0.0.0')).toBe(0);
    expect(compareSemver('0.7.0', 'bar.baz')).toBeGreaterThan(0);
  });
});
