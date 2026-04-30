import type { Vulnerability, Severity } from './types.js';
import { fetchWithRetry } from '../fetch-timeout.js';
import { logger } from '../../utils/logger.js';

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
  // 400 means a bad query (don't retry); 5xx/network errors are retried with backoff.
  // 429 (rate limit) is handled separately in queryOneByOne, so don't retry it here.
  const res = await fetchWithRetry(OSV_BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  }, 15_000, {
    retryOn: (r) => r.status >= 500 && r.status < 600,
  });

  if (!res.ok) {
    // On 400, try individual queries to isolate bad packages
    if (res.status === 400 && queries.length > 1) {
      return queryOneByOne(packages);
    }
    throw new Error(`OSV API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OsvBatchResponse;

  // EP-003: Validate response structure
  if (!data || !Array.isArray(data.results)) {
    throw new Error('Invalid OSV API response: missing results array');
  }
  if (data.results.length !== packages.length) {
    throw new Error(`OSV API response mismatch: expected ${packages.length} results, got ${data.results.length}`);
  }

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
  const errors: string[] = [];

  for (const pkg of packages) {
    try {
      const partial = await queryBatch(
        [pkg],
        [{ package: { name: pkg.name, ecosystem: 'Homebrew' }, version: pkg.version }],
      );
      for (const [k, v] of partial) result.set(k, v);
    } catch (err) {
      // EP-004: Only skip on 400 (bad request for that package). Re-throw on 5xx or network errors.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('400')) {
        errors.push(`Skipped ${pkg.name}: ${msg}`);
        continue;
      }
      // For rate limiting (429), apply backoff
      if (msg.includes('429')) {
        logger.warn(`Rate limited by OSV API, backing off`, { package: pkg.name });
        await new Promise(r => setTimeout(r, 2000));
        // Retry once after backoff
        try {
          const retryResult = await queryBatch(
            [pkg],
            [{ package: { name: pkg.name, ecosystem: 'Homebrew' }, version: pkg.version }],
          );
          for (const [k, v] of retryResult) result.set(k, v);
        } catch {
          errors.push(`Failed after retry ${pkg.name}: ${msg}`);
        }
        continue;
      }
      // Network/server errors: log and continue instead of failing entire scan
      logger.error(`OSV query failed for ${pkg.name}: ${msg}`);
      errors.push(`${pkg.name}: ${msg}`);
    }

    // EP-008: Rate limit protection — small delay between individual requests
    await new Promise(r => setTimeout(r, 75));
  }

  if (errors.length > 0) {
    logger.warn(`OSV query errors for ${errors.length} packages`, { errors: errors.slice(0, 5) });
  }

  return result;
}

export async function queryVulnerabilities(
  packages: Array<{ name: string; version: string }>,
): Promise<Map<string, Vulnerability[]>> {
  // EP-007: Filter out packages with empty/undefined/null versions
  const validPackages = packages.filter(
    (p) => p.version && typeof p.version === 'string' && p.version.trim().length > 0,
  );

  const result = new Map<string, Vulnerability[]>();

  // Split into batches to stay within OSV API limits
  for (let i = 0; i < validPackages.length; i += BATCH_SIZE) {
    const batch = validPackages.slice(i, i + BATCH_SIZE);
    const queries: OsvQuery[] = batch.map((p) => ({
      package: { name: p.name, ecosystem: 'Homebrew' },
      version: p.version,
    }));

    const partial = await queryBatch(batch, queries);
    for (const [k, v] of partial) result.set(k, v);
  }

  return result;
}
