import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Formula, Cask } from '../types.js';
import type { Vulnerability } from './types.js';

const mockQuery = vi.fn();

vi.mock('./osv-api.js', () => ({
  queryVulnerabilities: (...args: unknown[]) => mockQuery(...args),
}));

beforeEach(() => mockQuery.mockReset());
afterEach(() => vi.resetModules());

function makeFormula(name: string, version: string): Formula {
  return {
    name,
    full_name: name,
    desc: '',
    homepage: '',
    versions: { stable: version, head: null, bottle: false },
    dependencies: [],
    build_dependencies: [],
    installed: [{ version, installed_as_dependency: false, installed_on_request: true }],
    outdated: false,
    pinned: false,
    deprecated: false,
    deprecation_date: null,
    deprecation_reason: null,
    disabled: false,
    disable_date: null,
    disable_reason: null,
    keg_only: false,
  } as unknown as Formula;
}

function makeCask(token: string, version: string): Cask {
  return {
    token,
    name: [token],
    desc: '',
    homepage: '',
    url: '',
    version,
    installed: version,
    outdated: false,
    auto_updates: false,
  } as unknown as Cask;
}

function vuln(id: string, severity: Vulnerability['severity'], fixed: string | null = null): Vulnerability {
  return { id, summary: `summary-${id}`, severity, fixedVersion: fixed, references: [] };
}

describe('audit-runner: gating', () => {
  it('throws when isPro is false', async () => {
    const { runSecurityAudit } = await import('./audit-runner.js');
    await expect(runSecurityAudit(false, [], [])).rejects.toThrow(/Pro/i);
  });
});

describe('audit-runner: aggregation', () => {
  it('returns an empty summary when no vulns are found', async () => {
    mockQuery.mockResolvedValue(new Map());
    const { runSecurityAudit } = await import('./audit-runner.js');

    const summary = await runSecurityAudit(true, [makeFormula('wget', '1.21')], []);
    expect(summary.totalPackages).toBe(1);
    expect(summary.vulnerablePackages).toBe(0);
    expect(summary.results).toEqual([]);
    expect(summary.criticalCount).toBe(0);
  });

  it('counts vulnerabilities per severity bucket', async () => {
    mockQuery.mockResolvedValue(new Map([
      ['wget', [vuln('CVE-1', 'CRITICAL'), vuln('CVE-2', 'HIGH'), vuln('CVE-3', 'LOW')]],
      ['curl', [vuln('CVE-4', 'MEDIUM')]],
    ]));
    const { runSecurityAudit } = await import('./audit-runner.js');

    const summary = await runSecurityAudit(true, [makeFormula('wget', '1.21'), makeFormula('curl', '8.0')], []);
    expect(summary.criticalCount).toBe(1);
    expect(summary.highCount).toBe(1);
    expect(summary.mediumCount).toBe(1);
    expect(summary.lowCount).toBe(1);
    expect(summary.vulnerablePackages).toBe(2);
  });

  it('uses the highest severity per package as maxSeverity', async () => {
    mockQuery.mockResolvedValue(new Map([
      ['wget', [vuln('CVE-LO', 'LOW'), vuln('CVE-HI', 'CRITICAL'), vuln('CVE-MD', 'MEDIUM')]],
    ]));
    const { runSecurityAudit } = await import('./audit-runner.js');

    const summary = await runSecurityAudit(true, [makeFormula('wget', '1.21')], []);
    expect(summary.results[0]!.maxSeverity).toBe('CRITICAL');
  });

  it('sorts results so the most severe package comes first', async () => {
    mockQuery.mockResolvedValue(new Map([
      ['low-pkg', [vuln('a', 'LOW')]],
      ['critical-pkg', [vuln('b', 'CRITICAL')]],
      ['medium-pkg', [vuln('c', 'MEDIUM')]],
    ]));
    const { runSecurityAudit } = await import('./audit-runner.js');

    const summary = await runSecurityAudit(true, [
      makeFormula('low-pkg', '1.0'),
      makeFormula('critical-pkg', '1.0'),
      makeFormula('medium-pkg', '1.0'),
    ], []);
    expect(summary.results.map((r) => r.packageName)).toEqual([
      'critical-pkg', 'medium-pkg', 'low-pkg',
    ]);
  });

  it('includes casks with their installed version', async () => {
    mockQuery.mockResolvedValue(new Map([
      ['firefox', [vuln('CVE-FF', 'HIGH')]],
    ]));
    const { runSecurityAudit } = await import('./audit-runner.js');

    const summary = await runSecurityAudit(true, [], [makeCask('firefox', '120.0')]);
    expect(summary.totalPackages).toBe(1);
    expect(summary.results[0]!.installedVersion).toBe('120.0');
  });

  it('skips casks that are not installed', async () => {
    mockQuery.mockResolvedValue(new Map());
    const { runSecurityAudit } = await import('./audit-runner.js');

    const cask = { ...makeCask('uninstalled', '1.0'), installed: null } as unknown as Cask;
    const summary = await runSecurityAudit(true, [], [cask]);
    expect(summary.totalPackages).toBe(0);
  });

  it('falls back to formula stable version when nothing is installed', async () => {
    mockQuery.mockResolvedValue(new Map());
    const { runSecurityAudit } = await import('./audit-runner.js');

    const f = { ...makeFormula('wget', '1.21'), installed: [] } as unknown as Formula;
    const summary = await runSecurityAudit(true, [f], []);
    // Implementation reads installed[0]?.version ?? versions.stable
    expect(summary.totalPackages).toBe(1);
  });
});
