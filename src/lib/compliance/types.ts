export interface PolicyFile {
  version: 1;
  meta: {
    teamName: string;
    maintainer: string;
    createdAt: string;
    description?: string;
  };
  required: Array<{
    name: string;
    minVersion?: string; // semver mínimo, e.g. "3.11"
    type: 'formula' | 'cask';
  }>;
  forbidden: Array<{
    name: string;
    type: 'formula' | 'cask';
    reason?: string;
  }>;
  requiredTaps: string[];
  strictMode?: boolean; // si true, paquetes no en required son violación
}

export type ViolationSeverity = 'error' | 'warning';
export type ViolationType = 'missing' | 'forbidden' | 'wrong-version' | 'extra';

export interface ComplianceViolation {
  severity: ViolationSeverity;
  type: ViolationType;
  packageName: string;
  packageType: 'formula' | 'cask';
  detail: string;       // mensaje human-readable
  required?: string;    // versión requerida si aplica
  installed?: string;   // versión instalada si aplica
}

export interface ComplianceReport {
  compliant: boolean;
  score: number;        // 0-100
  violations: ComplianceViolation[];
  checkedAt: string;    // ISO 8601
  machineName: string;
  policyName: string;
}
