import type { LicenseData } from './types.js';

/**
 * Get a watermark string containing the license holder's email.
 * Used subtly in Pro feature output for traceability.
 *
 * NOTE: This embeds the user's email in exported profiles without explicit
 * consent at export time. The email is obtained from the license data the
 * user provided during activation. A future improvement should inform the
 * user that exported profiles contain their identity, or add a consent
 * prompt before embedding.
 */
export function getWatermark(license: LicenseData | null): string {
  if (!license?.customerEmail) return '';
  // Create a subtle, non-obvious watermark
  // Embed as zero-width characters or as a comment in exported data
  return `Licensed to: ${license.customerEmail}`;
}

/**
 * Embed invisible watermark in a string using zero-width characters.
 * Each bit of the email is encoded as either a zero-width space (0) or
 * zero-width non-joiner (1).
 */
export function embedInvisibleWatermark(text: string, email: string): string {
  const encoded = [...email].map(c => {
    const cp = c.codePointAt(0) ?? 0;
    // Use 21 bits to cover the full Unicode range (max code point U+10FFFF)
    const bits = cp.toString(2).padStart(21, '0');
    return [...bits].map(b => b === '0' ? '\u200B' : '\u200C').join('');
  }).join('\u200D'); // zero-width joiner as separator

  // Insert at the end of the first line
  const lines = text.split('\n');
  if (lines.length > 0) {
    lines[0] = lines[0] + encoded;
  }
  return lines.join('\n');
}
