import type { BrewSnapshot } from '../state-snapshot/snapshot.js';
import type { BrewfileSchema } from '../brewfile/types.js';

export interface SyncConfig {
  enabled: boolean;
  machineId: string;
  machineName: string;
  lastSync?: string; // ISO 8601
}

export interface MachineState {
  machineId: string;
  machineName: string;
  updatedAt: string;       // ISO 8601
  snapshot: BrewSnapshot;
  brewfile?: BrewfileSchema;
}

export interface SyncPayload {
  machines: Record<string, MachineState>;
}

export interface SyncEnvelope {
  schemaVersion: 1;
  encrypted: string;
  iv: string;
  tag: string;
  updatedAt: string; // ISO 8601 — plaintext for BrewBar monitoring
}

export type ConflictResolution = 'use-local' | 'use-remote' | 'merge-union';

export interface SyncConflict {
  packageName: string;
  packageType: 'formula' | 'cask';
  localVersion: string;
  remoteMachine: string;
  remoteVersion: string;
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  resolvedCount: number;
  error?: string;
}
