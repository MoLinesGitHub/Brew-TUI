import { readFile, writeFile, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { HISTORY_PATH, ensureDataDirs } from '../data-dir.js';
import type { HistoryEntry, HistoryFile, HistoryAction } from './types.js';

const MAX_ENTRIES = 1000;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await readFile(HISTORY_PATH, 'utf-8');
    const file = JSON.parse(raw) as HistoryFile;
    return file.entries ?? [];
  } catch {
    return [];
  }
}

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await ensureDataDirs();
  const file: HistoryFile = { version: 1, entries };
  const tmp = HISTORY_PATH + '.tmp';
  await writeFile(tmp, JSON.stringify(file, null, 2), 'utf-8');
  await rename(tmp, HISTORY_PATH);
}

export async function appendEntry(
  action: HistoryAction,
  packageName: string | null,
  success: boolean,
  error: string | null = null,
): Promise<void> {
  const entries = await loadHistory();

  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  await saveHistory([]);
}
