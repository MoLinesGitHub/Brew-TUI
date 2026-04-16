import { readFile, writeFile, rm } from 'node:fs/promises';
import { LICENSE_PATH, ensureDataDirs } from '../data-dir.js';
import { activateLicense as apiActivate, validateLicense as apiValidate, deactivateLicense as apiDeactivate } from './lemonsqueezy-api.js';
import type { LicenseData, LicenseFile } from './types.js';

const REVALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function loadLicense(): Promise<LicenseData | null> {
  try {
    const raw = await readFile(LICENSE_PATH, 'utf-8');
    const file = JSON.parse(raw) as LicenseFile;
    return file.license ?? null;
  } catch {
    return null;
  }
}

export async function saveLicense(data: LicenseData): Promise<void> {
  await ensureDataDirs();
  const file: LicenseFile = { version: 1, license: data };
  await writeFile(LICENSE_PATH, JSON.stringify(file, null, 2), 'utf-8');
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
  return Date.now() - lastValidated > REVALIDATION_INTERVAL_MS;
}

export function isWithinGracePeriod(license: LicenseData): boolean {
  const lastValidated = new Date(license.lastValidatedAt).getTime();
  return Date.now() - lastValidated < GRACE_PERIOD_MS;
}

export async function activate(key: string): Promise<LicenseData> {
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
    plan: res.license_key.expires_at ? 'monthly' : 'yearly',
    activatedAt: new Date().toISOString(),
    expiresAt: res.license_key.expires_at,
    lastValidatedAt: new Date().toISOString(),
  };

  await saveLicense(license);
  return license;
}

export async function revalidate(license: LicenseData): Promise<boolean> {
  try {
    const res = await apiValidate(license.key, license.instanceId);

    if (res.valid) {
      license.lastValidatedAt = new Date().toISOString();
      license.status = 'active';
      license.expiresAt = res.license_key.expires_at;
      await saveLicense(license);
      return true;
    }

    license.status = 'expired';
    await saveLicense(license);
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
