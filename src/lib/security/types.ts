export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface Vulnerability {
  id: string;
  summary: string;
  severity: Severity;
  fixedVersion: string | null;
  references: string[];
}

export interface PackageAuditResult {
  packageName: string;
  installedVersion: string;
  vulnerabilities: Vulnerability[];
  maxSeverity: Severity;
}

export interface SecurityAuditSummary {
  scannedAt: string;
  totalPackages: number;
  vulnerablePackages: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  results: PackageAuditResult[];
}
