import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Hash captured at module-load time (earliest possible moment in this process).
// This detects file modification that occurs AFTER the module has already been
// loaded into the process — i.e. an attacker who patches the file on-disk while
// the TUI is running. It does NOT detect patches applied before or during
// module load. For that, a signed bundle with an external manifest would be required.
let _baselineHash: string | null = null;

// In dev (`tsx`), `import.meta.url` points at the live TS source which can be
// re-transpiled; baseline capture is unreliable and must fail-open so devs can
// run the TUI. In production (`NODE_ENV !== 'development'`) the bundle is a
// static .js file and any failure to read it is treated as tampering.
const _isProduction = process.env.NODE_ENV !== 'development'
  && process.env.NODE_ENV !== 'test';

function _captureBaseline(): string | null {
  try {
    const bundlePath = fileURLToPath(import.meta.url);
    const content = readFileSync(bundlePath, 'utf-8');
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

// Capture immediately at module load — do not defer.
_baselineHash = _captureBaseline();

/**
 * Detect on-disk modification of the running bundle after process start.
 * Returns false only if the file was verifiably changed since module load.
 *
 * Dev mode (NODE_ENV=development|test): fails open if the baseline could not
 * be captured or the file cannot be re-read, so `npm run dev` and the test
 * runner are not blocked by tsx-relative paths.
 *
 * Production: fail-closed in both code paths — a missing baseline or an
 * unreadable bundle both mean we cannot prove integrity, so we deny access.
 */
export function checkBundleIntegrity(): boolean {
  if (_baselineHash === null) {
    return !_isProduction;
  }
  try {
    const bundlePath = fileURLToPath(import.meta.url);
    const content = readFileSync(bundlePath, 'utf-8');
    const current = createHash('sha256').update(content).digest('hex');
    return current === _baselineHash;
  } catch {
    // SEG-006: Fail closed in production; in dev keep the TUI usable.
    return !_isProduction;
  }
}
