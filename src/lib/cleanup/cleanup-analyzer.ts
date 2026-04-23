import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { execBrew } from '../brew-cli.js';
import { formatBytes } from '../../utils/format.js';
import { requirePro } from '../license/pro-guard.js';
import { useLicenseStore } from '../../stores/license-store.js';
import type { Formula } from '../types.js';
import type { CleanupCandidate, CleanupSummary } from './types.js';

const execFileAsync = promisify(execFile);

async function getDiskUsage(cellarPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('du', ['-sk', cellarPath]);
    const kb = parseInt(stdout.split('\t')[0] ?? '0', 10);
    return kb * 1024;
  } catch {
    return 0;
  }
}

async function getCellarPath(name: string): Promise<string | null> {
  try {
    const raw = await execBrew(['--cellar', name]);
    return raw.trim() || null;
  } catch {
    return null;
  }
}

export async function analyzeCleanup(
  formulae: Formula[],
  leaves: string[],
): Promise<CleanupSummary> {
  const { license, status } = useLicenseStore.getState();
  requirePro(license, status);

  const leavesSet = new Set(leaves);

  // Build reverse dependency map
  const reverseDeps = new Map<string, number>();
  for (const f of formulae) {
    for (const dep of f.dependencies) {
      reverseDeps.set(dep, (reverseDeps.get(dep) ?? 0) + 1);
    }
  }

  // Find orphans: installed as dependency but not a leaf and has 0 reverse deps from installed packages
  const orphans: string[] = [];

  for (const f of formulae) {
    const installed = f.installed[0];
    if (!installed) continue;

    if (installed.installed_as_dependency && !installed.installed_on_request && !leavesSet.has(f.name)) {
      // Check if any installed package still depends on this
      // Actually, we need to check if any installed package lists THIS package as a dependency
      let isNeeded = false;
      for (const other of formulae) {
        if (other.name === f.name) continue;
        if (other.dependencies.includes(f.name)) {
          isNeeded = true;
          break;
        }
      }
      if (!isNeeded) {
        orphans.push(f.name);
      }
    }
  }

  // Get disk usage for orphans (parallel, limited concurrency)
  const candidates: CleanupCandidate[] = [];
  const concurrency = 5;

  for (let i = 0; i < orphans.length; i += concurrency) {
    const batch = orphans.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (name) => {
        const cellarPath = await getCellarPath(name);
        const bytes = cellarPath ? await getDiskUsage(cellarPath) : 0;
        return {
          name,
          reason: 'orphan' as const,
          diskUsageBytes: bytes,
          diskUsageFormatted: formatBytes(bytes),
          installedAsDependency: true,
          dependentsCount: 0,
        };
      }),
    );
    candidates.push(...results);
  }

  // Sort by disk usage descending
  candidates.sort((a, b) => b.diskUsageBytes - a.diskUsageBytes);

  const totalBytes = candidates.reduce((sum, c) => sum + c.diskUsageBytes, 0);

  return {
    totalReclaimableBytes: totalBytes,
    totalReclaimableFormatted: formatBytes(totalBytes),
    candidates,
    analyzedAt: new Date().toISOString(),
  };
}
