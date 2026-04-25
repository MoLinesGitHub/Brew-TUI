/**
 * Semantic color tokens for Brew-TUI.
 *
 * These constants provide a single source of truth for UI colors.
 * Views should gradually adopt these instead of hardcoded hex strings.
 *
 * Limitation: these tokens are designed for dark terminal backgrounds.
 * Light/high-contrast theme support is not yet implemented.
 */
export const COLORS = {
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
} as const;
