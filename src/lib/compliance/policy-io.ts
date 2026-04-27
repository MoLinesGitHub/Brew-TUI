import { readFile, writeFile } from 'node:fs/promises';
import type { PolicyFile } from './types.js';
import type { ComplianceReport } from './types.js';
import type { BrewSnapshot } from '../state-snapshot/snapshot.js';

function isValidPolicy(obj: unknown): obj is PolicyFile {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    p['version'] === 1 &&
    typeof p['meta'] === 'object' &&
    p['meta'] !== null &&
    typeof (p['meta'] as Record<string, unknown>)['teamName'] === 'string' &&
    Array.isArray(p['required'])
  );
}

export async function loadPolicy(filePath: string): Promise<PolicyFile> {
  const raw = await readFile(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);

  if (!isValidPolicy(parsed)) {
    throw new Error('Invalid policy file: must have version=1, meta.teamName, and required array');
  }

  return parsed;
}

export async function exportReport(report: ComplianceReport, outputPath: string): Promise<void> {
  await writeFile(outputPath, JSON.stringify(report, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export async function generatePolicyFromSnapshot(
  snapshot: BrewSnapshot,
  teamName: string,
  maintainer: string,
): Promise<PolicyFile> {
  return {
    version: 1,
    meta: {
      teamName,
      maintainer,
      createdAt: new Date().toISOString(),
    },
    required: [
      ...snapshot.formulae.map((f) => ({
        name: f.name,
        type: 'formula' as const,
      })),
      ...snapshot.casks.map((c) => ({
        name: c.name,
        type: 'cask' as const,
      })),
    ],
    forbidden: [],
    requiredTaps: [...snapshot.taps],
    strictMode: false,
  };
}
