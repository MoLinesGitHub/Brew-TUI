import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComplianceViolation } from './types.js';

const mockStream = vi.fn();
vi.mock('../brew-cli.js', () => ({
  streamBrew: (...args: unknown[]) => mockStream(...args),
}));

async function* asyncFrom(lines: string[]): AsyncGenerator<string> {
  for (const l of lines) yield l;
}

beforeEach(() => mockStream.mockReset());
afterEach(() => vi.resetModules());

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const l of gen) out.push(l);
  return out;
}

describe('compliance-remediator: gating', () => {
  it('throws synchronously when isPro is false (before any brew call)', async () => {
    const { remediateViolations } = await import('./compliance-remediator.js');
    // Generator throws on first .next(), not on construction
    const gen = remediateViolations([], false);
    await expect(gen.next()).rejects.toThrow(/Pro/i);
    expect(mockStream).not.toHaveBeenCalled();
  });
});

describe('compliance-remediator: actions', () => {
  it('installs missing packages via brew install', async () => {
    mockStream.mockReturnValue(asyncFrom(['Installing wget...', 'Done']));
    const violations: ComplianceViolation[] = [
      { severity: 'error', type: 'missing', packageName: 'wget', packageType: 'formula', detail: 'wget is required' },
    ];
    const { remediateViolations } = await import('./compliance-remediator.js');
    const out = await collect(remediateViolations(violations, true));
    expect(mockStream).toHaveBeenCalledWith(['install', 'wget']);
    expect(out.some((l) => l.includes('Installing wget'))).toBe(true);
    expect(out[out.length - 1]).toMatch(/1 installed, 0 upgraded, 0 skipped/);
  });

  it('upgrades packages with wrong version via brew upgrade', async () => {
    mockStream.mockReturnValue(asyncFrom(['Upgrading...']));
    const violations: ComplianceViolation[] = [
      { severity: 'error', type: 'wrong-version', packageName: 'curl', packageType: 'formula', detail: 'curl 7.0 < 8.0', required: '8.0', installed: '7.0' },
    ];
    const { remediateViolations } = await import('./compliance-remediator.js');
    const out = await collect(remediateViolations(violations, true));
    expect(mockStream).toHaveBeenCalledWith(['upgrade', 'curl']);
    expect(out[out.length - 1]).toMatch(/0 installed, 1 upgraded, 0 skipped/);
  });

  // Audit M-fix: the remediator must NEVER auto-uninstall. Forbidden and extra
  // packages are surfaced as manual-action items so the operator confirms the
  // removal explicitly.
  it('does not invoke brew for forbidden packages', async () => {
    const violations: ComplianceViolation[] = [
      { severity: 'error', type: 'forbidden', packageName: 'evil-tool', packageType: 'formula', detail: 'banned' },
    ];
    const { remediateViolations } = await import('./compliance-remediator.js');
    const out = await collect(remediateViolations(violations, true));
    expect(mockStream).not.toHaveBeenCalled();
    expect(out.some((l) => l.includes('Forbidden'))).toBe(true);
    expect(out[out.length - 1]).toMatch(/0 installed, 0 upgraded, 1 skipped/);
  });

  it('does not invoke brew for extra packages in strict mode', async () => {
    const violations: ComplianceViolation[] = [
      { severity: 'warning', type: 'extra', packageName: 'extra-pkg', packageType: 'formula', detail: 'not in policy' },
    ];
    const { remediateViolations } = await import('./compliance-remediator.js');
    const out = await collect(remediateViolations(violations, true));
    expect(mockStream).not.toHaveBeenCalled();
    expect(out[out.length - 1]).toMatch(/0 installed, 0 upgraded, 1 skipped/);
  });

  it('continues processing after a single brew install failure', async () => {
    mockStream
      .mockReturnValueOnce((async function* () { yield 'starting'; throw new Error('brew exit 1'); })())
      .mockReturnValueOnce(asyncFrom(['ok']));

    const violations: ComplianceViolation[] = [
      { severity: 'error', type: 'missing', packageName: 'fails', packageType: 'formula', detail: 'required' },
      { severity: 'error', type: 'missing', packageName: 'works', packageType: 'formula', detail: 'required' },
    ];
    const { remediateViolations } = await import('./compliance-remediator.js');
    const out = await collect(remediateViolations(violations, true));

    expect(out.some((l) => l.includes('Failed to install fails'))).toBe(true);
    expect(out[out.length - 1]).toMatch(/1 installed, 0 upgraded, 1 skipped/);
  });
});
