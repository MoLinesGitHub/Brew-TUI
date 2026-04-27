import { hostname } from 'node:os';
import type { PolicyFile, ComplianceReport, ComplianceViolation } from './types.js';
import { captureSnapshot } from '../state-snapshot/snapshot.js';

/**
 * Compara versiones segmento a segmento ignorando sufijos alfa.
 * "3.12.1" >= "3.11" → true. "3.10.0" >= "3.11" → false.
 */
export function versionAtLeast(installed: string, minimum: string): boolean {
  const parseSegments = (v: string): number[] =>
    v.split('.').map((seg) => parseInt(seg.replace(/[^0-9]/g, ''), 10) || 0);

  const ins = parseSegments(installed);
  const min = parseSegments(minimum);
  const len = Math.max(ins.length, min.length);

  for (let i = 0; i < len; i++) {
    const a = ins[i] ?? 0;
    const b = min[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true; // igual
}

export async function checkCompliance(
  policy: PolicyFile,
  isPro: boolean,
): Promise<ComplianceReport> {
  if (!isPro) throw new Error('Pro license required');

  const snapshot = await captureSnapshot();
  const violations: ComplianceViolation[] = [];

  // Conjuntos rápidos para lookup
  const formulaeMap = new Map(snapshot.formulae.map((f) => [f.name, f]));
  const casksMap = new Map(snapshot.casks.map((c) => [c.name, c]));
  const tapsSet = new Set(snapshot.taps);

  // Required packages
  for (const req of policy.required) {
    const entry =
      req.type === 'formula' ? formulaeMap.get(req.name) : casksMap.get(req.name);

    if (!entry) {
      violations.push({
        severity: 'error',
        type: 'missing',
        packageName: req.name,
        packageType: req.type,
        detail: `Missing: ${req.name} (required)`,
        required: req.minVersion,
      });
      continue;
    }

    if (req.minVersion && !versionAtLeast(entry.version, req.minVersion)) {
      violations.push({
        severity: 'error',
        type: 'wrong-version',
        packageName: req.name,
        packageType: req.type,
        detail: `Wrong version: ${req.name} (required ${req.minVersion}, installed ${entry.version})`,
        required: req.minVersion,
        installed: entry.version,
      });
    }
  }

  // Forbidden packages
  for (const forbidden of policy.forbidden) {
    const present =
      forbidden.type === 'formula'
        ? formulaeMap.has(forbidden.name)
        : casksMap.has(forbidden.name);

    if (present) {
      const reason = forbidden.reason ? ` — ${forbidden.reason}` : '';
      violations.push({
        severity: 'error',
        type: 'forbidden',
        packageName: forbidden.name,
        packageType: forbidden.type,
        detail: `Forbidden: ${forbidden.name}${reason}`,
      });
    }
  }

  // Required taps
  for (const tap of policy.requiredTaps) {
    if (!tapsSet.has(tap)) {
      violations.push({
        severity: 'warning',
        type: 'missing',
        packageName: tap,
        packageType: 'formula',
        detail: `Missing tap: ${tap} (required)`,
      });
    }
  }

  // Strict mode: paquetes extra
  if (policy.strictMode === true) {
    const requiredNames = new Set(
      policy.required.filter((r) => r.type === 'formula').map((r) => r.name),
    );
    const requiredCasks = new Set(
      policy.required.filter((r) => r.type === 'cask').map((r) => r.name),
    );

    for (const f of snapshot.formulae) {
      if (!requiredNames.has(f.name)) {
        violations.push({
          severity: 'warning',
          type: 'extra',
          packageName: f.name,
          packageType: 'formula',
          detail: `Extra package: ${f.name}`,
        });
      }
    }

    for (const c of snapshot.casks) {
      if (!requiredCasks.has(c.name)) {
        violations.push({
          severity: 'warning',
          type: 'extra',
          packageName: c.name,
          packageType: 'cask',
          detail: `Extra package: ${c.name}`,
        });
      }
    }
  }

  // Score: errores -15pts, warnings -5pts
  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const score = Math.max(0, 100 - errors * 15 - warnings * 5);

  return {
    compliant: violations.length === 0,
    score,
    violations,
    checkedAt: new Date().toISOString(),
    machineName: hostname(),
    policyName: policy.meta.teamName,
  };
}
