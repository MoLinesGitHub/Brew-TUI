import { queryVulnerabilities } from './osv-api.js';
import type { Formula, Cask } from '../types.js';
import type { PackageAuditResult, SecurityAuditSummary, Severity } from './types.js';

const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

export async function runSecurityAudit(
  isPro: boolean,
  formulae: Formula[],
  casks: Cask[],
): Promise<SecurityAuditSummary> {
  if (!isPro) throw new Error('Pro license required');

  const packages: Array<{ name: string; version: string }> = [];

  for (const f of formulae) {
    const version = f.installed[0]?.version ?? f.versions.stable;
    packages.push({ name: f.name, version });
  }

  for (const c of casks) {
    if (c.installed) {
      packages.push({ name: c.token, version: c.installed });
    }
  }

  // Batch query (OSV supports up to 1000)
  const vulnMap = await queryVulnerabilities(packages);

  const results: PackageAuditResult[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const [name, vulns] of vulnMap) {
    const pkg = packages.find((p) => p.name === name);
    if (!pkg) continue;

    const maxSeverity = vulns.reduce<Severity>((max, v) =>
      SEVERITY_ORDER[v.severity] > SEVERITY_ORDER[max] ? v.severity : max,
      'UNKNOWN',
    );

    results.push({
      packageName: name,
      installedVersion: pkg.version,
      vulnerabilities: vulns,
      maxSeverity,
    });

    for (const v of vulns) {
      if (v.severity === 'CRITICAL') criticalCount++;
      else if (v.severity === 'HIGH') highCount++;
      else if (v.severity === 'MEDIUM') mediumCount++;
      else if (v.severity === 'LOW') lowCount++;
    }
  }

  // Sort by severity (most severe first)
  results.sort((a, b) => SEVERITY_ORDER[b.maxSeverity] - SEVERITY_ORDER[a.maxSeverity]);

  return {
    scannedAt: new Date().toISOString(),
    totalPackages: packages.length,
    vulnerablePackages: results.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    results,
  };
}
