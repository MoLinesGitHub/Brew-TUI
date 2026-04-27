export type RiskLevel = 'low' | 'medium' | 'high';

export interface UpgradeImpact {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  packageType: 'formula' | 'cask';
  // Packages this package needs (its dependencies)
  directDeps: string[];
  // Installed packages that depend on THIS package (reverse deps)
  reverseDeps: string[];
  risk: RiskLevel;
  riskReasons: string[];
}
