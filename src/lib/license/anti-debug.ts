import inspector from 'node:inspector';

/**
 * Detect if a debugger/inspector is attached.
 * If detected, Pro features are disabled as a precaution.
 * Exempted in test/CI environments to prevent false-positives when
 * running vitest with --inspect-brk or inside CI pipelines.
 */
export function isDebuggerAttached(): boolean {
  // Never block test or CI runs — vitest may itself use inspector
  if (process.env.VITEST || process.env.CI) return false;

  // Node.js inspector protocol active
  if (inspector.url()) return true;

  // Debug flags in process arguments
  if (process.execArgv.some((a) => a.includes('--inspect') || a.includes('--debug'))) return true;

  // Debug environment variables
  if (process.env.NODE_OPTIONS?.includes('--inspect')) return true;

  return false;
}
