import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Hash captured at module-load time (earliest possible moment in this process).
// This detects file modification that occurs AFTER the module has already been
// loaded into the process — i.e. an attacker who patches the file on-disk while
// the TUI is running. It does NOT detect patches applied before or during
// module load. For that, a signed bundle with an external manifest would be required.
let _baselineHash: string | null = null;

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
 * Fails open (returns true) if the file cannot be read.
 */
export function checkBundleIntegrity(): boolean {
  if (_baselineHash === null) {
    // Could not establish baseline (dev mode / permissions) — fail open
    return true;
  }
  try {
    const bundlePath = fileURLToPath(import.meta.url);
    const content = readFileSync(bundlePath, 'utf-8');
    const current = createHash('sha256').update(content).digest('hex');
    return current === _baselineHash;
  } catch {
    // SEG-006: Fail closed — if we can't read the bundle, assume tampering
    return false;
  }
}
