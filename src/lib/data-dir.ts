import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

export const DATA_DIR = join(homedir(), '.brew-tui');
export const PROFILES_DIR = join(DATA_DIR, 'profiles');
export const LICENSE_PATH = join(DATA_DIR, 'license.json');
export const HISTORY_PATH = join(DATA_DIR, 'history.json');

export async function ensureDataDirs(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await mkdir(PROFILES_DIR, { recursive: true, mode: 0o700 });
}
