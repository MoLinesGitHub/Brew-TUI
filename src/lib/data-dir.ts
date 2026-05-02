import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const DATA_DIR = join(homedir(), '.brew-tui');
export const PROFILES_DIR = join(DATA_DIR, 'profiles');
export const LICENSE_PATH = join(DATA_DIR, 'license.json');
export const HISTORY_PATH = join(DATA_DIR, 'history.json');
export const SNAPSHOTS_DIR = join(DATA_DIR, 'snapshots');
export const MACHINE_ID_PATH = join(DATA_DIR, 'machine-id');
export const ONBOARDING_FLAG_PATH = join(DATA_DIR, 'onboarding-completed');
export const ANALYTICS_CONSENT_PATH = join(DATA_DIR, 'analytics-consent');

export async function ensureDataDirs(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await mkdir(PROFILES_DIR, { recursive: true, mode: 0o700 });
  await mkdir(SNAPSHOTS_DIR, { recursive: true, mode: 0o700 });
}

// In-memory cache + serializer to prevent multiple concurrent first-time
// creations from racing and producing different UUIDs on first launch.
let cachedMachineId: string | null = null;
let pendingResolution: Promise<string> | null = null;

export async function getMachineId(): Promise<string> {
  if (cachedMachineId) return cachedMachineId;
  if (pendingResolution) return pendingResolution;

  pendingResolution = (async () => {
    try {
      const id = (await readFile(MACHINE_ID_PATH, 'utf-8')).trim();
      if (id) {
        cachedMachineId = id;
        return id;
      }
    } catch { /* file does not exist yet */ }

    const id = randomUUID();
    await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    await writeFile(MACHINE_ID_PATH, id, { encoding: 'utf-8', mode: 0o600 });
    cachedMachineId = id;
    return id;
  })();

  try {
    return await pendingResolution;
  } finally {
    pendingResolution = null;
  }
}
