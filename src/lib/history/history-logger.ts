import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { HISTORY_PATH, ensureDataDirs } from '../data-dir.js';
import { requirePro } from '../license/pro-guard.js';
import { useLicenseStore } from '../../stores/license-store.js';
import type { HistoryEntry, HistoryFile, HistoryAction } from './types.js';

const MAX_ENTRIES = 1000;

/** Map brew subcommand to a history action type */
export function detectAction(args: string[]): { action: HistoryAction; packageName: string | null } | null {
  const cmd = args[0];
  if (cmd === 'install') return { action: 'install', packageName: args[1] ?? null };
  if (cmd === 'uninstall') {
    const name = args.find((a) => !a.startsWith('-')) === 'uninstall'
      ? args.find((a, i) => i > 0 && !a.startsWith('-')) ?? null
      : args[1] ?? null;
    return { action: 'uninstall', packageName: name };
  }
  if (cmd === 'upgrade') {
    if (args.length === 1) return { action: 'upgrade-all', packageName: null };
    return { action: 'upgrade', packageName: args[1] ?? null };
  }
  return null;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const { license, status } = useLicenseStore.getState();
  requirePro(license, status);

  try {
    const raw = await readFile(HISTORY_PATH, 'utf-8');
    const file = JSON.parse(raw) as HistoryFile;
    if (file.version !== 1) {
      // Future: add migration logic here
      throw new Error('Unsupported data version');
    }
    const entries = file.entries;
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await ensureDataDirs();
  const file: HistoryFile = { version: 1, entries };
  const tmp = HISTORY_PATH + '.tmp';
  await writeFile(tmp, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 });
  await rename(tmp, HISTORY_PATH);
}

export async function appendEntry(
  action: HistoryAction,
  packageName: string | null,
  success: boolean,
  error: string | null = null,
): Promise<void> {
  const { license, status } = useLicenseStore.getState();
  requirePro(license, status);
  const entries = await loadHistory();

  const entry: HistoryEntry = {
    id: randomUUID(),
    action,
    packageName,
    timestamp: new Date().toISOString(),
    success,
    error,
  };

  entries.unshift(entry);

  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  await saveHistory(entries);
}

export async function clearHistory(): Promise<void> {
  const { license, status } = useLicenseStore.getState();
  requirePro(license, status);
  await saveHistory([]);
}
