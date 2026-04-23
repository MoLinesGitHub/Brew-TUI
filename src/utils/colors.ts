/**
 * Semantic color tokens for Brew-TUI.
 *
 * These constants provide a single source of truth for UI colors.
 * Views should gradually adopt these instead of hardcoded hex strings.
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
} as const;
