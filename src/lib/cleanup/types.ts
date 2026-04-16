export interface CleanupCandidate {
  name: string;
  reason: 'orphan' | 'old-version';
  diskUsageBytes: number;
  diskUsageFormatted: string;
  installedAsDependency: boolean;
  dependentsCount: number;
}

export interface CleanupSummary {
  totalReclaimableBytes: number;
  totalReclaimableFormatted: string;
  candidates: CleanupCandidate[];
  analyzedAt: string;
}
