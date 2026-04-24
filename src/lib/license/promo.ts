import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { DATA_DIR, ensureDataDirs } from '../data-dir.js';
import { fetchWithTimeout } from '../fetch-timeout.js';
import { logger } from '../../utils/logger.js';

const MACHINE_ID_PATH = join(homedir(), '.brew-tui', 'machine-id');

async function getMachineId(): Promise<string> {
  try {
    const id = (await readFile(MACHINE_ID_PATH, 'utf-8')).trim();
    if (id) return id;
  } catch { /* file doesn't exist yet */ }
  const id = randomUUID();
  await mkdir(join(homedir(), '.brew-tui'), { recursive: true, mode: 0o700 });
  await writeFile(MACHINE_ID_PATH, id, { encoding: 'utf-8', mode: 0o600 });
  return id;
}

const PROMO_PATH = join(DATA_DIR, 'promo.json');

// Promo API endpoint (self-hosted or Polar webhook)
const PROMO_API_URL = 'https://api.molinesdesigns.com/api/promo';

export interface PromoCode {
  code: string;
  type: 'trial' | 'discount' | 'full';
  durationDays: number;
  maxRedemptions: number;
  currentRedemptions: number;
  createdAt: string;
  expiresAt: string | null;
  active: boolean;
}

interface PromoRedemption {
  code: string;
  redeemedAt: string;
  expiresAt: string;
  type: 'trial' | 'discount' | 'full';
}

interface PromoFile {
  version: 1;
  redemptions: PromoRedemption[];
}

// ── Generate promo codes (admin/CLI use) ──

export function generatePromoCode(prefix = 'BREW'): string {
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}`;
}

export function generatePromoBatch(count: number, options: {
  type: 'trial' | 'discount' | 'full';
  durationDays: number;
  maxRedemptions: number;
  expiresAt?: string | null;
  prefix?: string;
}): PromoCode[] {
  const codes: PromoCode[] = [];
  for (let i = 0; i < count; i++) {
    codes.push({
      code: generatePromoCode(options.prefix),
      type: options.type,
      durationDays: options.durationDays,
      maxRedemptions: options.maxRedemptions,
      currentRedemptions: 0,
      createdAt: new Date().toISOString(),
      expiresAt: options.expiresAt ?? null,
      active: true,
    });
  }
  return codes;
}

// ── Validate promo code against API ──

export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  type?: 'trial' | 'discount' | 'full';
  durationDays?: number;
  error?: string;
}> {
  const normalized = code.trim().toUpperCase();
  if (!normalized || normalized.length < 8) {
    return { valid: false, error: 'Invalid promo code format' };
  }

  try {
    const res = await fetchWithTimeout(`${PROMO_API_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalized }),
    }, 10_000);

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return { valid: false, error: body.error ?? 'Invalid or expired promo code' };
    }

    const data = await res.json() as { type: string; durationDays: number };
    return {
      valid: true,
      type: data.type as 'trial' | 'discount' | 'full',
      durationDays: data.durationDays,
    };
  } catch (err) {
    logger.error('Promo validation failed', { error: String(err) });
    return { valid: false, error: 'Could not validate promo code. Check your connection.' };
  }
}

// ── Redeem promo code locally ──

export async function redeemPromoCode(code: string): Promise<{
  success: boolean;
  expiresAt?: string;
  error?: string;
}> {
  const normalized = code.trim().toUpperCase();
  const machineId = await getMachineId();

  // Call backend to validate + redeem in one step
  try {
    const res = await fetchWithTimeout(`${PROMO_API_URL}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalized, machineId }),
    }, 10_000);

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return { success: false, error: body.error ?? 'Invalid or expired promo code' };
    }

    const data = await res.json() as { data: { expiresAt: string; type: string; durationDays: number } };
    var serverExpiresAt = data.data.expiresAt;
    var serverType = data.data.type as 'trial' | 'discount' | 'full';
  } catch (err) {
    logger.error('Promo redeem failed', { error: String(err) });
    return { success: false, error: 'Could not reach promo server. Check your connection.' };
  }

  // Save locally as well
  await ensureDataDirs();

  const redemption: PromoRedemption = {
    code: normalized,
    redeemedAt: new Date().toISOString(),
    expiresAt: serverExpiresAt,
    type: serverType,
  };

  let file: PromoFile = { version: 1, redemptions: [] };
  try {
    const raw = await readFile(PROMO_PATH, 'utf-8');
    file = JSON.parse(raw) as PromoFile;
  } catch { /* no existing file */ }

  // Check for duplicate redemption
  if (file.redemptions.some((r) => r.code === redemption.code)) {
    return { success: false, error: 'This promo code has already been redeemed' };
  }

  file.redemptions.push(redemption);

  // Atomic write
  const tmpPath = PROMO_PATH + '.tmp';
  await writeFile(tmpPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
  await rename(tmpPath, PROMO_PATH);

  return { success: true, expiresAt: redemption.expiresAt };
}

// ── Check if an active promo is in effect ──

export async function getActivePromo(): Promise<PromoRedemption | null> {
  try {
    const raw = await readFile(PROMO_PATH, 'utf-8');
    const file = JSON.parse(raw) as PromoFile;
    const now = Date.now();

    // Find the most recent non-expired redemption
    const active = file.redemptions
      .filter((r) => new Date(r.expiresAt).getTime() > now)
      .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];

    return active ?? null;
  } catch {
    return null;
  }
}
