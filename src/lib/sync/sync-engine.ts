import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { encryptPayload, decryptPayload } from './crypto.js';
import {
  readSyncEnvelope,
  writeSyncEnvelope,
  isICloudAvailable,
} from './backends/icloud-backend.js';
import { captureSnapshot } from '../state-snapshot/snapshot.js';
import { DATA_DIR } from '../data-dir.js';
import { logger } from '../../utils/logger.js';
import type {
  SyncConfig,
  SyncPayload,
  SyncConflict,
  SyncResult,
  MachineState,
  SyncEnvelope,
} from './types.js';
import type { BrewfileSchema } from '../brewfile/types.js';

const SYNC_CONFIG_PATH = join(DATA_DIR, 'sync-config.json');
const MACHINE_ID_PATH = join(DATA_DIR, 'machine-id');

// ── Config I/O ──────────────────────────────────────────────────────────────

export async function loadSyncConfig(): Promise<SyncConfig | null> {
  try {
    const raw = await readFile(SYNC_CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as SyncConfig;
  } catch {
    return null;
  }
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  const tmpPath = SYNC_CONFIG_PATH + '.tmp';
  await writeFile(tmpPath, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  await rename(tmpPath, SYNC_CONFIG_PATH);
}

// ── Machine ID ───────────────────────────────────────────────────────────────

export async function getMachineId(): Promise<string> {
  try {
    const id = (await readFile(MACHINE_ID_PATH, 'utf-8')).trim();
    if (id) return id;
  } catch { /* machine-id created by polar-api on first activation */ }
  return hostname(); // Fallback: hostname if machine-id not yet created
}

// ── Conflict detection ───────────────────────────────────────────────────────

function detectConflicts(
  localSnapshot: { formulae: Array<{ name: string; version: string }>; casks: Array<{ name: string; version: string }> },
  otherMachines: MachineState[],
  localMachineId: string,
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];

  const localFormulaMap = new Map(localSnapshot.formulae.map((f) => [f.name, f.version]));
  const localCaskMap = new Map(localSnapshot.casks.map((c) => [c.name, c.version]));

  for (const machine of otherMachines) {
    if (machine.machineId === localMachineId) continue;

    // Check formula conflicts: same package, different version on both machines
    for (const remoteFormula of machine.snapshot.formulae) {
      const localVersion = localFormulaMap.get(remoteFormula.name);
      if (localVersion !== undefined && localVersion !== remoteFormula.version) {
        conflicts.push({
          packageName: remoteFormula.name,
          packageType: 'formula',
          localVersion,
          remoteMachine: machine.machineName,
          remoteVersion: remoteFormula.version,
        });
      }
    }

    // Check cask conflicts
    for (const remoteCask of machine.snapshot.casks) {
      const localVersion = localCaskMap.get(remoteCask.name);
      if (localVersion !== undefined && localVersion !== remoteCask.version) {
        conflicts.push({
          packageName: remoteCask.name,
          packageType: 'cask',
          localVersion,
          remoteMachine: machine.machineName,
          remoteVersion: remoteCask.version,
        });
      }
    }
  }

  return conflicts;
}

// ── Merge ────────────────────────────────────────────────────────────────────

async function writeEnvelope(payload: SyncPayload): Promise<string> {
  const now = new Date().toISOString();
  const { encrypted, iv, tag } = encryptPayload(payload);
  const envelope: SyncEnvelope = {
    schemaVersion: 1,
    encrypted,
    iv,
    tag,
    updatedAt: now,
  };
  await writeSyncEnvelope(envelope);
  return now;
}

function mergePayload(existing: SyncPayload, localState: MachineState): SyncPayload {
  return {
    machines: {
      ...existing.machines,
      [localState.machineId]: localState,
    },
  };
}

// ── Main sync function ───────────────────────────────────────────────────────

export async function sync(
  isPro: boolean,
  currentBrewfile?: BrewfileSchema,
): Promise<SyncResult> {
  if (!isPro) {
    throw new Error('Pro license required');
  }

  const available = await isICloudAvailable();
  if (!available) {
    return {
      success: false,
      conflicts: [],
      resolvedCount: 0,
      error: 'iCloud Drive not available',
    };
  }

  let existingPayload: SyncPayload | null = null;

  try {
    const envelope = await readSyncEnvelope();
    if (envelope) {
      existingPayload = decryptPayload(envelope.encrypted, envelope.iv, envelope.tag);
    }
  } catch (err) {
    logger.warn('sync: could not decrypt existing payload, starting fresh', { error: String(err) });
    existingPayload = null;
  }

  // Capture current local state
  const snapshot = await captureSnapshot();
  const machineId = await getMachineId();
  const machineName = hostname();

  const localState: MachineState = {
    machineId,
    machineName,
    updatedAt: new Date().toISOString(),
    snapshot,
    ...(currentBrewfile ? { brewfile: currentBrewfile } : {}),
  };

  // Detect conflicts against other machines in the payload
  const otherMachines = existingPayload
    ? Object.values(existingPayload.machines).filter((m) => m.machineId !== machineId)
    : [];

  const conflicts = detectConflicts(snapshot, otherMachines, machineId);

  // Always write the local machine state to the payload, even when conflicts
  // exist, so that applyConflictResolutions() has a local entry to update.
  // Without this, the iCloud envelope keeps only remote machines, and
  // resolution updates are silently dropped (they require localMachine to exist).
  const basePayload: SyncPayload = existingPayload ?? { machines: {} };
  const mergedPayload = mergePayload(basePayload, localState);

  if (conflicts.length > 0) {
    // Persist local state, then surface conflicts so the user can resolve them.
    await writeEnvelope(mergedPayload);
    return {
      success: false,
      conflicts,
      resolvedCount: 0,
    };
  }

  const now = await writeEnvelope(mergedPayload);

  // Update local sync config
  const existingConfig = await loadSyncConfig();
  await saveSyncConfig({
    enabled: true,
    machineId,
    machineName,
    ...(existingConfig ?? {}),
    lastSync: now,
  });

  logger.info('sync: completed successfully', { machineId, machines: Object.keys(mergedPayload.machines).length });

  return {
    success: true,
    conflicts: [],
    resolvedCount: 0,
  };
}

// ── Conflict resolution ──────────────────────────────────────────────────────

export async function applyConflictResolutions(
  payload: SyncPayload,
  resolutions: Array<{ conflict: SyncConflict; resolution: 'use-local' | 'use-remote' }>,
  localMachineId: string,
): Promise<void> {
  // Work on a mutable copy
  const updatedPayload: SyncPayload = {
    machines: { ...payload.machines },
  };

  for (const { conflict, resolution } of resolutions) {
    if (resolution !== 'use-remote') continue;
    // Re-read latest local machine on every iteration so consecutive resolutions
    // build on top of each other instead of overwriting prior changes.
    const localMachine = updatedPayload.machines[localMachineId];
    if (!localMachine) {
      logger.warn('sync: cannot apply resolution, local machine missing in payload', { localMachineId });
      continue;
    }
    if (conflict.packageType === 'formula') {
      updatedPayload.machines[localMachineId] = {
        ...localMachine,
        snapshot: {
          ...localMachine.snapshot,
          formulae: localMachine.snapshot.formulae.map((f) =>
            f.name === conflict.packageName
              ? { ...f, version: conflict.remoteVersion }
              : f,
          ),
        },
      };
    } else {
      updatedPayload.machines[localMachineId] = {
        ...localMachine,
        snapshot: {
          ...localMachine.snapshot,
          casks: localMachine.snapshot.casks.map((c) =>
            c.name === conflict.packageName
              ? { ...c, version: conflict.remoteVersion }
              : c,
          ),
        },
      };
    }
  }

  await writeEnvelope(updatedPayload);
  logger.info('sync: conflict resolutions applied', { count: resolutions.length });
}
