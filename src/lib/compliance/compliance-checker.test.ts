import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCompliance, versionAtLeast } from './compliance-checker.js';
import { generatePolicyFromSnapshot } from './policy-io.js';
import type { PolicyFile } from './types.js';

vi.mock('../state-snapshot/snapshot.js', () => ({
  captureSnapshot: vi.fn(),
}));

import { captureSnapshot } from '../state-snapshot/snapshot.js';

const mockSnapshot = {
  capturedAt: new Date().toISOString(),
  formulae: [
    { name: 'git', version: '2.44.0', pinned: false },
    { name: 'node', version: '22.0.0', pinned: false },
    { name: 'python', version: '3.12.1', pinned: false },
  ],
  casks: [
    { name: 'visual-studio-code', version: '1.88.0' },
  ],
  taps: ['homebrew/core', 'homebrew/cask'],
};

function basePolicy(overrides: Partial<PolicyFile> = {}): PolicyFile {
  return {
    version: 1,
    meta: { teamName: 'Test Team', maintainer: 'test@example.com', createdAt: '2024-01-01T00:00:00Z' },
    required: [],
    forbidden: [],
    requiredTaps: [],
    strictMode: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(captureSnapshot).mockResolvedValue(mockSnapshot);
});

describe('versionAtLeast', () => {
  it('returns true when installed equals minimum', () => {
    expect(versionAtLeast('3.11.0', '3.11')).toBe(true);
  });

  it('returns true when installed is greater than minimum', () => {
    expect(versionAtLeast('3.12.1', '3.11')).toBe(true);
  });

  it('returns false when installed is less than minimum', () => {
    expect(versionAtLeast('3.10.0', '3.11')).toBe(false);
  });

  it('handles patch version comparisons', () => {
    expect(versionAtLeast('2.44.0', '2.44')).toBe(true);
    expect(versionAtLeast('2.43.9', '2.44')).toBe(false);
  });

  it('handles single-segment versions', () => {
    expect(versionAtLeast('22', '20')).toBe(true);
    expect(versionAtLeast('19', '20')).toBe(false);
  });
});

describe('checkCompliance', () => {
  it('throws if not pro', async () => {
    const policy = basePolicy();
    await expect(checkCompliance(policy, false)).rejects.toThrow('Pro license required');
  });

  it('returns compliant report when required package is present', async () => {
    const policy = basePolicy({
      required: [{ name: 'git', type: 'formula' }],
    });
    const report = await checkCompliance(policy, true);
    expect(report.violations).toHaveLength(0);
    expect(report.compliant).toBe(true);
    expect(report.score).toBe(100);
  });

  it('returns missing violation when required package is absent', async () => {
    const policy = basePolicy({
      required: [{ name: 'wget', type: 'formula' }],
    });
    const report = await checkCompliance(policy, true);
    const v = report.violations.find((v) => v.type === 'missing');
    expect(v).toBeDefined();
    expect(v?.packageName).toBe('wget');
    expect(v?.severity).toBe('error');
  });

  it('no violation when installed version >= minVersion', async () => {
    const policy = basePolicy({
      required: [{ name: 'python', type: 'formula', minVersion: '3.11' }],
    });
    const report = await checkCompliance(policy, true);
    expect(report.violations).toHaveLength(0);
    expect(report.compliant).toBe(true);
  });

  it('wrong-version violation when installed < minVersion', async () => {
    const policy = basePolicy({
      required: [{ name: 'python', type: 'formula', minVersion: '3.13' }],
    });
    const report = await checkCompliance(policy, true);
    const v = report.violations.find((v) => v.type === 'wrong-version');
    expect(v).toBeDefined();
    expect(v?.packageName).toBe('python');
    expect(v?.installed).toBe('3.12.1');
    expect(v?.required).toBe('3.13');
  });

  it('forbidden violation when forbidden package is present', async () => {
    const policy = basePolicy({
      forbidden: [{ name: 'git', type: 'formula', reason: 'use system git' }],
    });
    const report = await checkCompliance(policy, true);
    const v = report.violations.find((v) => v.type === 'forbidden');
    expect(v).toBeDefined();
    expect(v?.packageName).toBe('git');
    expect(v?.severity).toBe('error');
  });

  it('no forbidden violation when forbidden package is absent', async () => {
    const policy = basePolicy({
      forbidden: [{ name: 'wget', type: 'formula' }],
    });
    const report = await checkCompliance(policy, true);
    expect(report.violations).toHaveLength(0);
  });

  it('strictMode: extra package produces warning violation', async () => {
    const policy = basePolicy({
      required: [{ name: 'git', type: 'formula' }],
      strictMode: true,
    });
    const report = await checkCompliance(policy, true);
    const extras = report.violations.filter((v) => v.type === 'extra');
    // node and python are extra
    expect(extras.length).toBeGreaterThan(0);
    expect(extras[0]?.severity).toBe('warning');
  });

  describe('score calculation', () => {
    it('score is 100 with no violations', async () => {
      const policy = basePolicy();
      const report = await checkCompliance(policy, true);
      expect(report.score).toBe(100);
    });

    it('score is 85 with 1 error (100 - 15)', async () => {
      const policy = basePolicy({
        required: [{ name: 'missing-pkg', type: 'formula' }],
      });
      const report = await checkCompliance(policy, true);
      const errors = report.violations.filter((v) => v.severity === 'error').length;
      expect(errors).toBe(1);
      expect(report.score).toBe(85);
    });

    it('score is 70 with 2 errors (100 - 30)', async () => {
      const policy = basePolicy({
        required: [
          { name: 'missing-pkg-1', type: 'formula' },
          { name: 'missing-pkg-2', type: 'formula' },
        ],
      });
      const report = await checkCompliance(policy, true);
      const errors = report.violations.filter((v) => v.severity === 'error').length;
      expect(errors).toBe(2);
      expect(report.score).toBe(70);
    });

    it('score does not go below 0', async () => {
      const required = Array.from({ length: 10 }, (_, i) => ({
        name: `missing-${i}`,
        type: 'formula' as const,
      }));
      const policy = basePolicy({ required });
      const report = await checkCompliance(policy, true);
      expect(report.score).toBe(0);
    });
  });

  it('report includes machine name and policy name', async () => {
    const policy = basePolicy();
    const report = await checkCompliance(policy, true);
    expect(report.machineName).toBeTruthy();
    expect(report.policyName).toBe('Test Team');
    expect(report.checkedAt).toBeTruthy();
  });
});

describe('integration: generatePolicyFromSnapshot → checkCompliance → score 100', () => {
  beforeEach(() => {
    vi.mocked(captureSnapshot).mockResolvedValue(mockSnapshot);
  });

  it('generates a policy from a snapshot and validates it with score 100', async () => {
    // Generate policy that exactly matches the mock snapshot
    const policy = await generatePolicyFromSnapshot(mockSnapshot, 'Integration Team', 'test@example.com');

    // checkCompliance uses captureSnapshot internally (mocked to return mockSnapshot)
    // The generated policy requires exactly the packages in mockSnapshot, so no violations expected
    const report = await checkCompliance(policy, true);

    expect(report.compliant).toBe(true);
    expect(report.score).toBe(100);
    expect(report.violations).toHaveLength(0);
  });

  it('generates policy that requires the correct taps', async () => {
    const policy = await generatePolicyFromSnapshot(mockSnapshot, 'Tap Team', 'admin@example.com');

    // The mock snapshot has taps that the policy will require
    expect(policy.requiredTaps).toEqual(expect.arrayContaining(mockSnapshot.taps));
  });
});
