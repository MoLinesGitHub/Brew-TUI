import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { LICENSE_PATH, ensureDataDirs, getMachineId } from '../data-dir.js';
import { activateLicense as apiActivate, validateLicense as apiValidate, deactivateLicense as apiDeactivate } from './polar-api.js';
import { t } from '../../i18n/index.js';
import type { LicenseData, LicenseFile } from './types.js';

// SEG-009: Built-in perennial accounts removed from the bundle.
// Previously a hardcoded map of customer emails bypassed Polar validation entirely;
// any user could craft a license.json with one of those emails (the AES key is
// derivable from the bundle) and gain perennial Pro/Team. Operator accounts now
// authenticate via real Polar license keys like everyone else. This function is
// retained as a stable export but always returns null; remove it once no caller
// references it.
export function getBuiltinAccountType(_email: string): 'pro' | 'team' | 'free' | null {
  return null;
}

const REVALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Layer 18: Client-side rate limiting on activations ──
const ACTIVATION_COOLDOWN_MS = 30_000; // 30 seconds between attempts
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min lockout after max attempts

interface ActivationTracker {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

// Note: rate limit state is in-memory only; resets on process restart
const tracker: ActivationTracker = {
  attempts: 0,
  lastAttempt: 0,
  lockedUntil: 0,
};

function checkRateLimit(): void {
  const now = Date.now();

  // Check lockout
  if (now < tracker.lockedUntil) {
    const remaining = Math.ceil((tracker.lockedUntil - now) / 60000);
    throw new Error(t('cli_rateLimited', { minutes: remaining }));
  }

  // Check cooldown
  if (now - tracker.lastAttempt < ACTIVATION_COOLDOWN_MS) {
    throw new Error(t('cli_cooldown'));
  }
}

function recordAttempt(success: boolean): void {
  const now = Date.now();
  tracker.lastAttempt = now;

  if (success) {
    tracker.attempts = 0;
    return;
  }

  tracker.attempts++;
  if (tracker.attempts >= MAX_ATTEMPTS) {
    tracker.lockedUntil = now + LOCKOUT_MS;
    tracker.attempts = 0;
  }
}

// SECURITY NOTE — Known architectural limitation (documented decision):
// These constants are compiled into the npm bundle and can be extracted by any user
// with `cat node_modules/.../license-manager.js`. The encryption protects against
// casual filesystem access, not against a determined attacker with the bundle.
// The primary defense is server-side revalidation (24h cycle via Polar.sh) and
// machine binding (machineId in the encrypted envelope). Migrating to macOS Keychain
// would eliminate this limitation but adds native dependency complexity.
const ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1';
const SCRYPT_SALT = 'brew-tui-salt-v1';

// Lazy derivation — scryptSync is CPU-intensive (default N=16384) and should
// not block the event loop at module import time.
let _derivedKey: Buffer | null = null;

function deriveEncryptionKey(): Buffer {
  if (!_derivedKey) _derivedKey = scryptSync(ENCRYPTION_SECRET, SCRYPT_SALT, 32);
  return _derivedKey;
}

function encryptLicenseData(data: LicenseData): { encrypted: string; iv: string; tag: string } {
  const key = deriveEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const plaintext = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function decryptLicenseData(encrypted: string, iv: string, tag: string): LicenseData {
  const key = deriveEncryptionKey();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf-8')) as LicenseData;
}

// BK-003: Type guard for license data format
function isLicenseFile(obj: unknown): obj is LicenseFile {
  return typeof obj === 'object' && obj !== null && (obj as Record<string, unknown>).version === 1;
}

function isEncryptedLicenseFile(obj: unknown): obj is LicenseFile & { encrypted: string; iv: string; tag: string } {
  if (!isLicenseFile(obj)) return false;
  const record = obj as unknown as Record<string, unknown>;
  return typeof record.encrypted === 'string'
    && typeof record.iv === 'string'
    && typeof record.tag === 'string';
}

export async function loadLicense(): Promise<LicenseData | null> {
  try {
    const raw = await readFile(LICENSE_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    // BK-003: Validate parsed data
    if (!isLicenseFile(parsed)) {
      throw new Error('Invalid license data format');
    }

    const file = parsed as LicenseFile;

    if (file.version !== 1) {
      // Future: add migration logic here
      throw new Error('Unsupported data version');
    }

    // New encrypted format
    if (isEncryptedLicenseFile(file)) {
      const data = decryptLicenseData(file.encrypted!, file.iv!, file.tag!);

      // SEG-002: Check machine ID if stored in the envelope.
      // getMachineId() now always resolves a value — if the user's machine-id
      // file was wiped, a new UUID is created and this check rejects the
      // license, prompting reactivation. Same behaviour the polar-api flow
      // already had on save.
      const fileRecord = file as unknown as Record<string, unknown>;
      if (fileRecord.machineId) {
        const currentMachineId = await getMachineId();
        if (fileRecord.machineId !== currentMachineId) {
          throw new Error('License was activated on a different machine');
        }
      }

      return data;
    }

    // Legacy unencrypted format — migrate to encrypted on read
    if (file.license) {
      const data = file.license;
      // Re-save in encrypted format
      await saveLicense(data);
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveLicense(data: LicenseData): Promise<void> {
  await ensureDataDirs();
  const { encrypted, iv, tag } = encryptLicenseData(data);
  // SEG-002: Include machineId in the envelope for portability detection
  const machineId = await getMachineId();
  const file: Record<string, unknown> = { version: 1, encrypted, iv, tag, machineId };
  const tmpPath = LICENSE_PATH + '.tmp';
  await writeFile(tmpPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
  await rename(tmpPath, LICENSE_PATH);
}

export async function clearLicense(): Promise<void> {
  try {
    await rm(LICENSE_PATH);
  } catch { /* file may not exist */ }
}

export function isExpired(license: LicenseData): boolean {
  if (!license.expiresAt) return false;
  const expiry = new Date(license.expiresAt).getTime();
  // Fail closed on corrupted/unparseable dates: NaN comparisons are always
  // false, so the previous version treated a garbage expiresAt as "never
  // expires", which is exploitable.
  if (isNaN(expiry)) return true;
  return expiry < Date.now();
}

export function needsRevalidation(license: LicenseData): boolean {
  const lastValidated = new Date(license.lastValidatedAt).getTime();
  if (isNaN(lastValidated)) return true; // corrupted date → force revalidation
  return Date.now() - lastValidated > REVALIDATION_INTERVAL_MS;
}

export function isWithinGracePeriod(license: LicenseData): boolean {
  const lastValidated = new Date(license.lastValidatedAt).getTime();
  if (isNaN(lastValidated)) return false; // corrupted date → no grace
  return Date.now() - lastValidated < GRACE_PERIOD_MS;
}

// ── Layer 15: Gradual degradation after extended offline ──

export type DegradationLevel = 'none' | 'warning' | 'limited' | 'expired';
export type RevalidationResult = 'valid' | 'grace' | 'expired';

/**
 * Returns the degradation level based on time since last server validation.
 * - 0-7 days: none (full access)
 * - 7-14 days: warning (shows a notice but still works)
 * - 14-30 days: limited (some features disabled)
 * - 30+ days: expired (all Pro features disabled)
 */
export function getDegradationLevel(license: LicenseData): DegradationLevel {
  const lastValidated = new Date(license.lastValidatedAt).getTime();
  if (isNaN(lastValidated)) return 'expired'; // corrupted date → deny access
  const elapsed = Date.now() - lastValidated;
  if (elapsed < 0) return 'none'; // clock skew: future timestamp → treat as fresh
  const days = elapsed / (24 * 60 * 60 * 1000);

  if (days <= 7) return 'none';
  if (days <= 14) return 'warning';
  if (days <= 30) return 'limited';
  return 'expired';
}

// Layer 10: License key format validation
function validateLicenseKey(key: string): void {
  // Polar keys are UUID-like: 8-4-4-4-12 hex chars or similar
  // Reject obviously invalid keys to avoid unnecessary API calls
  if (key.length < 10 || key.length > 100) {
    throw new Error('Invalid license key format');
  }
  // Only allow alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(key)) {
    throw new Error('Invalid license key format');
  }
}

// Polar license-key benefits use distinct prefixes per tier:
//   Pro Monthly/Yearly  → "BTUI-..."
//   Team Monthly/Yearly → "BTUI-T-..."
// We detect the tier from the prefix instead of looking up the productId,
// because Polar's customer-portal license endpoints don't echo product info
// in the activation response.
function detectPlan(key: string): 'pro' | 'team' {
  const upper = key.toUpperCase();
  return upper.startsWith('BTUI-T-') || upper.startsWith('BTUI-T_') ? 'team' : 'pro';
}

export async function activate(key: string): Promise<LicenseData> {
  validateLicenseKey(key);
  checkRateLimit();

  let success = false;
  try {
    const res = await apiActivate(key);

    if (!res.activated) {
      throw new Error(res.error ?? 'Activation failed');
    }

    const license: LicenseData = {
      key,
      instanceId: res.instance.id,
      status: 'active',
      customerEmail: res.meta.customer_email,
      customerName: res.meta.customer_name,
      plan: detectPlan(key),
      activatedAt: new Date().toISOString(),
      expiresAt: res.license_key.expires_at,
      lastValidatedAt: new Date().toISOString(),
    };

    await saveLicense(license);
    success = true;
    return license;
  } finally {
    recordAttempt(success);
  }
}

/**
 * Revalidate the license against the server.
 * This also serves as Layer 19 (telemetry): each validation call
 * allows Polar to track activation count, last-seen timestamp,
 * and detect if the activation limit is exceeded (license sharing).
 */
// EP-006: Detect if an error is a network error vs validation/contract error
function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|timeout|abort/i.test(msg);
}

export async function revalidate(license: LicenseData): Promise<RevalidationResult> {
  try {
    const res = await apiValidate(license.key, license.instanceId);

    if (res.valid) {
      const updated: LicenseData = {
        ...license,
        lastValidatedAt: new Date().toISOString(),
        status: 'active',
        expiresAt: res.license_key.expires_at,
      };
      await saveLicense(updated);
      return 'valid';
    }

    await saveLicense({ ...license, status: 'expired' });
    return 'expired';
  } catch (err) {
    // EP-006: Network errors trigger grace period; validation/contract errors mean expired
    if (isNetworkError(err)) {
      return isWithinGracePeriod(license) ? 'grace' : 'expired';
    }
    // Unexpected response or contract violation — treat as expired
    await saveLicense({ ...license, status: 'expired' });
    return 'expired';
  }
}

export async function deactivate(license: LicenseData): Promise<{ remoteSuccess: boolean }> {
  let remoteSuccess = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await apiDeactivate(license.key, license.instanceId);
      remoteSuccess = true;
      break;
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }
  }
  await clearLicense();
  return { remoteSuccess };
}
