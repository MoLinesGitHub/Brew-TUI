import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { logger } from '../../../utils/logger.js';
import type { SyncEnvelope } from '../types.js';

const ICLOUD_BASE = join(
  homedir(),
  'Library', 'Mobile Documents', 'com~apple~CloudDocs',
);
export const ICLOUD_SYNC_DIR = join(ICLOUD_BASE, 'BrewTUI');
export const ICLOUD_SYNC_PATH = join(ICLOUD_SYNC_DIR, 'sync.json');

export async function isICloudAvailable(): Promise<boolean> {
  try {
    await stat(ICLOUD_BASE);
    return true;
  } catch {
    return false;
  }
}

function isValidEnvelope(v: unknown): v is SyncEnvelope {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    obj['schemaVersion'] === 1 &&
    typeof obj['encrypted'] === 'string' &&
    typeof obj['iv'] === 'string' &&
    typeof obj['tag'] === 'string' &&
    typeof obj['updatedAt'] === 'string'
  );
}

export async function readSyncEnvelope(): Promise<SyncEnvelope | null> {
  try {
    const raw = await readFile(ICLOUD_SYNC_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isValidEnvelope(parsed)) {
      logger.warn('sync: invalid envelope structure in iCloud file');
      return null;
    }
    return parsed;
  } catch (err: unknown) {
    // File does not exist yet — expected on first sync
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }
    logger.warn('sync: could not read iCloud envelope', { error: String(err) });
    return null;
  }
}

export async function writeSyncEnvelope(envelope: SyncEnvelope): Promise<void> {
  await mkdir(ICLOUD_SYNC_DIR, { recursive: true });
  const tmpPath = ICLOUD_SYNC_PATH + '.tmp';
  await writeFile(tmpPath, JSON.stringify(envelope, null, 2), {
    encoding: 'utf-8',
    mode: 0o644,
  });
  await rename(tmpPath, ICLOUD_SYNC_PATH);
}
