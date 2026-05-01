import { describe, expect, it } from 'vitest';
import { getWatermark, embedInvisibleWatermark } from './watermark.js';
import type { LicenseData } from './types.js';

const license: LicenseData = {
  key: 'test-key',
  instanceId: 'instance-1',
  status: 'active',
  customerEmail: 'user@example.com',
  customerName: 'User',
  plan: 'pro',
  activatedAt: '2026-04-01T00:00:00.000Z',
  expiresAt: '2027-04-01T00:00:00.000Z',
  lastValidatedAt: '2026-04-01T00:00:00.000Z',
};

describe('watermark: getWatermark', () => {
  // SEG-003 contract: the watermark must NOT leak the customer email unless
  // the caller has explicitly passed consent: true. Privacy regressions here
  // would embed PII in user-exported files without their knowledge.
  it('returns empty when consent is false', () => {
    expect(getWatermark(license, false)).toBe('');
  });

  it('returns empty when license is null even with consent', () => {
    expect(getWatermark(null, true)).toBe('');
  });

  it('returns empty when customerEmail is missing', () => {
    const noEmail: LicenseData = { ...license, customerEmail: '' };
    expect(getWatermark(noEmail, true)).toBe('');
  });

  it('returns the watermark when consent is true and email is present', () => {
    expect(getWatermark(license, true)).toBe('Licensed to: user@example.com');
  });

  it('defaults consent to false (BK-014: privacy-safe by default)', () => {
    expect(getWatermark(license)).toBe('');
  });
});

describe('watermark: embedInvisibleWatermark', () => {
  // The encoded payload uses three Unicode characters: ZWSP (U+200B), ZWNJ
  // (U+200C) and ZWJ (U+200D). The result must be invisible when rendered
  // and must round-trip cleanly through string operations.

  it('returns the original text plus encoded bits on the first line', () => {
    const out = embedInvisibleWatermark('hello', 'a');
    // Bits are appended to the first (and only) line, so length grows.
    expect(out.startsWith('hello')).toBe(true);
    expect(out.length).toBeGreaterThan('hello'.length);
  });

  it('only uses zero-width characters in the appended payload', () => {
    const out = embedInvisibleWatermark('x', 'a');
    const payload = out.slice('x'.length);
    // U+200B ZWSP, U+200C ZWNJ, U+200D ZWJ — the encoding alphabet.
    const allowed = new Set(['​', '‌', '‍']);
    expect(payload.length).toBeGreaterThan(0);
    for (const ch of payload) {
      expect(allowed.has(ch)).toBe(true);
    }
  });

  it('encodes one ZWJ separator between successive characters', () => {
    const out = embedInvisibleWatermark('', 'ab');
    const zwjCount = [...out].filter((c) => c === '‍').length;
    expect(zwjCount).toBe(1);
  });

  it('preserves multi-line text and only modifies the first line', () => {
    const out = embedInvisibleWatermark('first\nsecond\nthird', 'a');
    const lines = out.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]!.startsWith('first')).toBe(true);
    expect(lines[1]).toBe('second');
    expect(lines[2]).toBe('third');
  });

  it('handles non-ASCII (multi-byte) characters in the email', () => {
    const out = embedInvisibleWatermark('x', 'ñ');
    // U+00F1 is below 0x10FFFF so the 21-bit padding still represents it.
    const payload = out.slice('x'.length);
    const allowed = new Set(['​', '‌']);
    for (const ch of payload) {
      expect(allowed.has(ch)).toBe(true);
    }
    // 21 bits per code point, no separator for single-character input.
    expect(payload.length).toBe(21);
  });
});
