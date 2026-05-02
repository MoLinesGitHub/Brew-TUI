import { readFile, writeFile, rename, open, unlink, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { HISTORY_PATH, ensureDataDirs } from '../data-dir.js';
import type { HistoryEntry, HistoryFile, HistoryAction } from './types.js';

const MAX_ENTRIES = 1000;

function assertPro(isPro: boolean): void {
  if (!isPro) throw new Error('Pro license required');
}

// ── BK-004 + BK-007: file locking with stale-lock recovery ──
// A crash between open('wx') and unlink leaves an orphan lockfile that would
// block every future write. Reclaim a lock whose mtime is older than this TTL.
const lockPath = HISTORY_PATH + '.lock';
const LOCK_TTL_MS = 30_000;

async function tryAcquireLock(): Promise<Awaited<ReturnType<typeof open>> | null> {
  const fd = await open(lockPath, 'wx').catch(() => null);
  if (fd) return fd;

  // Lock exists — is it stale?
  try {
    const info = await stat(lockPath);
    if (Date.now() - info.mtime.getTime() > LOCK_TTL_MS) {
      await unlink(lockPath).catch(() => {});
      return await open(lockPath, 'wx').catch(() => null);
    }
  } catch { /* race with another writer; fall through */ }
  return null;
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockFd = await tryAcquireLock();
  if (!lockFd) throw new Error('History file is locked by another process');
  try {
    return await fn();
  } finally {
    await lockFd.close();
    await unlink(lockPath).catch(() => {});
  }
}

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

export async function loadHistory(isPro: boolean): Promise<HistoryEntry[]> {
  assertPro(isPro);

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
  isPro: boolean,
  action: HistoryAction,
  packageName: string | null,
  success: boolean,
  error: string | null = null,
): Promise<void> {
  assertPro(isPro);

  await withLock(async () => {
    const entries = await loadHistory(isPro);

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
  });
}

export async function clearHistory(isPro: boolean): Promise<void> {
  assertPro(isPro);
  await saveHistory([]);
}
