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

const BATCH_SIZE = 100;

async function queryBatch(
  packages: Array<{ name: string; version: string }>,
  queries: OsvQuery[],
): Promise<Map<string, Vulnerability[]>> {
  const res = await fetch(OSV_BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });

  if (!res.ok) {
    // On 400, try individual queries to isolate bad packages
    if (res.status === 400 && queries.length > 1) {
      return queryOneByOne(packages);
    }
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

async function queryOneByOne(
  packages: Array<{ name: string; version: string }>,
): Promise<Map<string, Vulnerability[]>> {
  const result = new Map<string, Vulnerability[]>();

  for (const pkg of packages) {
    try {
      const partial = await queryBatch(
        [pkg],
        [{ package: { name: pkg.name, ecosystem: 'Homebrew' }, version: pkg.version }],
      );
      for (const [k, v] of partial) result.set(k, v);
    } catch {
      // Skip packages that the API rejects
    }
  }

  return result;
}

export async function queryVulnerabilities(
  packages: Array<{ name: string; version: string }>,
): Promise<Map<string, Vulnerability[]>> {
  const result = new Map<string, Vulnerability[]>();

  // Split into batches to stay within OSV API limits
  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    const batch = packages.slice(i, i + BATCH_SIZE);
    const queries: OsvQuery[] = batch.map((p) => ({
      package: { name: p.name, ecosystem: 'Homebrew' },
      version: p.version,
    }));

    const partial = await queryBatch(batch, queries);
    for (const [k, v] of partial) result.set(k, v);
  }

  return result;
}
