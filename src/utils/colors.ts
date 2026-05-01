/**
 * Semantic color tokens for Brew-TUI.
 *
 * These constants provide a single source of truth for UI colors.
 * Views should gradually adopt these instead of hardcoded hex strings.
 *
 * Limitation: the palette is tuned for dark terminal backgrounds.
 * Light/high-contrast theme support is not yet implemented.
 *
 * NO_COLOR support: when the standard NO_COLOR env var is set to any
 * non-empty value (https://no-color.org), every token is replaced by
 * the empty string so Ink renders plain text without ANSI escapes.
 * Callers continue to pass `color={COLORS.success}` unchanged.
 */
const PALETTE = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
  brand: '#FF6B2B',
  muted: '#9CA3AF',
  text: '#F9FAFB',
  textSecondary: '#6B7280',
  teal: '#2DD4BF',
  sky: '#38BDF8',
  gold: '#FFD700',
  purple: '#A855F7',
  blue: '#3B82F6',
  lavender: '#C4B5FD',
  border: '#4B5563',
  white: '#FFFFFF',
} as const;

type ColorKey = keyof typeof PALETTE;

function isNoColorRequested(): boolean {
  const v = process.env['NO_COLOR'];
  return typeof v === 'string' && v.length > 0;
}

export const NO_COLOR = isNoColorRequested();

export const COLORS: Record<ColorKey, string> = NO_COLOR
  ? (Object.fromEntries(
      (Object.keys(PALETTE) as ColorKey[]).map((k) => [k, '']),
    ) as Record<ColorKey, string>)
  : (PALETTE as Record<ColorKey, string>);
