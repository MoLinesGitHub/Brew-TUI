export type RollbackStrategy =
  | 'versioned-formula'  // brew info name@major exists
  | 'bottle-cache'       // version in ~/.cache/Homebrew/downloads
  | 'pin-only'           // pin only, no version restoration
  | 'unavailable';       // cask or other non-restorable case

export interface RollbackAction {
  packageName: string;
  packageType: 'formula' | 'cask';
  action: 'downgrade' | 'install' | 'remove' | 'pin';
  fromVersion: string;
  toVersion: string;
  strategy: RollbackStrategy;
  versionedFormula?: string;  // e.g. "node@20" if strategy=versioned-formula
}

export interface RollbackPlan {
  snapshotLabel: string;
  snapshotDate: string;
  actions: RollbackAction[];
  warnings: string[];  // e.g. "3 casks will be pinned only"
  canExecute: boolean; // false if ALL actions are unavailable
}

export interface RollbackResult {
  success: boolean;
  completedActions: RollbackAction[];
  failedActions: Array<{ action: RollbackAction; error: string }>;
}
