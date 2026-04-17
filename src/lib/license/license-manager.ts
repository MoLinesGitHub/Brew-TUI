import { readFile, writeFile, rm } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { LICENSE_PATH, ensureDataDirs } from '../data-dir.js';
import { activateLicense as apiActivate, validateLicense as apiValidate, deactivateLicense as apiDeactivate } from './lemonsqueezy-api.js';
import { t } from '../../i18n/index.js';
import type { LicenseData, LicenseFile } from './types.js';

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

// AES-256-GCM encryption secret — derived key via scrypt
const ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1';
const SCRYPT_SALT = 'brew-tui-salt-v1';

// Derived once at module load — inputs are constants so repeated derivation
// just blocks the event loop unnecessarily (scryptSync default N=16384).
const _derivedKey: Buffer = scryptSync(ENCRYPTION_SECRET, SCRYPT_SALT, 32);

function deriveEncryptionKey(): Buffer {
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

export async function loadLicense(): Promise<LicenseData | null> {
  try {
    const raw = await readFile(LICENSE_PATH, 'utf-8');
    const file = JSON.parse(raw) as LicenseFile;

    // New encrypted format
    if (file.encrypted && file.iv && file.tag) {
      const data = decryptLicenseData(file.encrypted, file.iv, file.tag);
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
  const file: LicenseFile = { version: 1, encrypted, iv, tag };
  await writeFile(LICENSE_PATH, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export async function clearLicense(): Promise<void> {
  try {
    await rm(LICENSE_PATH);
  } catch { /* file may not exist */ }
}

export function isExpired(license: LicenseData): boolean {
  if (!license.expiresAt) return false;
  return new Date(license.expiresAt).getTime() < Date.now();
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
  // LemonSqueezy keys are UUID-like: 8-4-4-4-12 hex chars or similar
  // Reject obviously invalid keys to avoid unnecessary API calls
  if (key.length < 10 || key.length > 100) {
    throw new Error('Invalid license key format');
  }
  // Only allow alphanumeric, hyphens, underscores
  if (!/^[\w-]+$/.test(key)) {
    throw new Error('Invalid license key format');
  }
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
      plan: 'pro',
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
 * allows LemonSqueezy to track activation count, last-seen timestamp,
 * and detect if the activation limit is exceeded (license sharing).
 */
export async function revalidate(license: LicenseData): Promise<boolean> {
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
      return true;
    }

    await saveLicense({ ...license, status: 'expired' });
    return false;
  } catch {
    // Network error: check grace period
    return isWithinGracePeriod(license);
  }
}

export async function deactivate(license: LicenseData): Promise<void> {
  try {
    await apiDeactivate(license.key, license.instanceId);
  } catch { /* best effort */ }
  await clearLicense();
}
