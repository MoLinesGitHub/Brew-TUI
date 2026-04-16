export type HistoryAction = 'install' | 'uninstall' | 'upgrade' | 'upgrade-all';

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  packageName: string | null;
  timestamp: string;
  success: boolean;
  error: string | null;
}

export interface HistoryFile {
  version: 1;
  entries: HistoryEntry[];
}
