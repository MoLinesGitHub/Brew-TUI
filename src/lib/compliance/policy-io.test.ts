import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPolicy, generatePolicyFromSnapshot } from './policy-io.js';
import type { BrewSnapshot } from '../state-snapshot/snapshot.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

const validPolicyJson = JSON.stringify({
  version: 1,
  meta: {
    teamName: 'Acme Dev Team',
    maintainer: 'ops@acme.com',
    createdAt: '2024-01-01T00:00:00Z',
  },
  required: [
    { name: 'git', type: 'formula' },
    { name: 'node', type: 'formula', minVersion: '20' },
  ],
  forbidden: [{ name: 'wget', type: 'formula', reason: 'use curl instead' }],
  requiredTaps: ['homebrew/core'],
  strictMode: false,
});

describe('loadPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid policy JSON correctly', async () => {
    vi.mocked(readFile).mockResolvedValue(validPolicyJson);
    const policy = await loadPolicy('/path/to/policy.json');

    expect(policy.version).toBe(1);
    expect(policy.meta.teamName).toBe('Acme Dev Team');
    expect(policy.meta.maintainer).toBe('ops@acme.com');
    expect(policy.required).toHaveLength(2);
    expect(policy.required[0]?.name).toBe('git');
    expect(policy.forbidden[0]?.name).toBe('wget');
    expect(policy.requiredTaps).toContain('homebrew/core');
  });

  it('throws on JSON missing version field', async () => {
    const noVersion = JSON.stringify({
      meta: { teamName: 'Test', maintainer: 'test@test.com', createdAt: '2024-01-01T00:00:00Z' },
      required: [],
      forbidden: [],
      requiredTaps: [],
    });
    vi.mocked(readFile).mockResolvedValue(noVersion);
    await expect(loadPolicy('/path/to/policy.json')).rejects.toThrow('Invalid policy file');
  });

  it('throws on JSON missing meta.teamName', async () => {
    const noTeamName = JSON.stringify({
      version: 1,
      meta: { maintainer: 'test@test.com', createdAt: '2024-01-01T00:00:00Z' },
      required: [],
      forbidden: [],
      requiredTaps: [],
    });
    vi.mocked(readFile).mockResolvedValue(noTeamName);
    await expect(loadPolicy('/path/to/policy.json')).rejects.toThrow('Invalid policy file');
  });

  it('throws on non-object JSON', async () => {
    vi.mocked(readFile).mockResolvedValue('"just a string"');
    await expect(loadPolicy('/path/to/policy.json')).rejects.toThrow('Invalid policy file');
  });
});

describe('generatePolicyFromSnapshot', () => {
  const snapshot: BrewSnapshot = {
    capturedAt: '2024-06-01T10:00:00Z',
    formulae: [
      { name: 'git', version: '2.44.0', pinned: false },
      { name: 'node', version: '22.0.0', pinned: false },
    ],
    casks: [{ name: 'visual-studio-code', version: '1.88.0' }],
    taps: ['homebrew/core', 'homebrew/cask'],
  };

  it('creates a policy with all formulae from snapshot in required', async () => {
    const policy = await generatePolicyFromSnapshot(snapshot, 'Dev Team', 'admin@example.com');

    expect(policy.version).toBe(1);
    expect(policy.meta.teamName).toBe('Dev Team');
    expect(policy.meta.maintainer).toBe('admin@example.com');

    const formulaNames = policy.required
      .filter((r) => r.type === 'formula')
      .map((r) => r.name);
    expect(formulaNames).toContain('git');
    expect(formulaNames).toContain('node');
  });

  it('creates a policy with all casks from snapshot in required', async () => {
    const policy = await generatePolicyFromSnapshot(snapshot, 'Dev Team', 'admin@example.com');

    const caskNames = policy.required
      .filter((r) => r.type === 'cask')
      .map((r) => r.name);
    expect(caskNames).toContain('visual-studio-code');
  });

  it('includes taps in requiredTaps', async () => {
    const policy = await generatePolicyFromSnapshot(snapshot, 'Dev Team', 'admin@example.com');
    expect(policy.requiredTaps).toContain('homebrew/core');
    expect(policy.requiredTaps).toContain('homebrew/cask');
  });

  it('sets strictMode to false by default', async () => {
    const policy = await generatePolicyFromSnapshot(snapshot, 'Dev Team', 'admin@example.com');
    expect(policy.strictMode).toBe(false);
  });

  it('sets forbidden to empty array', async () => {
    const policy = await generatePolicyFromSnapshot(snapshot, 'Dev Team', 'admin@example.com');
    expect(policy.forbidden).toHaveLength(0);
  });
});
