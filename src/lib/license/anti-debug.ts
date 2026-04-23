import inspector from 'node:inspector';

declare const __TEST_MODE__: boolean;

/**
 * Detect if a debugger/inspector is attached.
 * If detected, Pro features are disabled as a precaution.
 * In test builds (__TEST_MODE__ is replaced at compile time by tsup),
 * detection is skipped to avoid false-positives with vitest --inspect-brk.
 */
export function isDebuggerAttached(): boolean {
  // Compile-time flag — replaced to `false` in production builds
  if (__TEST_MODE__) return false;

  // Node.js inspector protocol active
  if (inspector.url()) return true;

  // Debug flags in process arguments
  if (process.execArgv.some((a) => a.includes('--inspect') || a.includes('--debug'))) return true;

  // Debug environment variables
  if (process.env.NODE_OPTIONS?.includes('--inspect')) return true;

  return false;
}
