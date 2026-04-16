import type { Vulnerability, Severity } from './types.js';

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';

interface OsvQuery {
  package: { name: string; ecosystem: string };
  version: string;
}

interface OsvVulnerability {
  id: string;
  summary?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    ranges?: Array<{
      events?: Array<{ fixed?: string }>;
    }>;
  }>;
  references?: Array<{ url: string }>;
  database_specific?: { severity?: string };
}

interface OsvBatchResponse {
  results: Array<{ vulns?: OsvVulnerability[] }>;
}

function mapSeverity(vuln: OsvVulnerability): Severity {
  // Check database_specific severity first
  const dbSev = vuln.database_specific?.severity?.toUpperCase();
  if (dbSev && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(dbSev)) {
    return dbSev as Severity;
  }

  // Check CVSS score
  const cvss = vuln.severity?.find((s) => s.type === 'CVSS_V3');
  if (cvss) {
    const score = parseFloat(cvss.score);
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 7.0) return 'HIGH';
    if (score >= 4.0) return 'MEDIUM';
    return 'LOW';
  }

  return 'UNKNOWN';
}

function getFixedVersion(vuln: OsvVulnerability): string | null {
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return null;
}

export async function queryVulnerabilities(
  packages: Array<{ name: string; version: string }>,
): Promise<Map<string, Vulnerability[]>> {
  const queries: OsvQuery[] = packages.map((p) => ({
    package: { name: p.name, ecosystem: 'Homebrew' },
    version: p.version,
  }));

  const res = await fetch(OSV_BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });

  if (!res.ok) {
    throw new Error(`OSV API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OsvBatchResponse;
  const result = new Map<string, Vulnerability[]>();

  for (let i = 0; i < packages.length; i++) {
    const vulns = data.results[i]?.vulns;
    if (!vulns || vulns.length === 0) continue;

    result.set(
      packages[i]!.name,
      vulns.map((v) => ({
        id: v.id,
        summary: v.summary ?? 'No description available',
        severity: mapSeverity(v),
        fixedVersion: getFixedVersion(v),
        references: v.references?.map((r) => r.url) ?? [],
      })),
    );
  }

  return result;
}
