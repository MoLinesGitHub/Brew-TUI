import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrewSnapshot } from '../state-snapshot/snapshot.js';

// Mock modules before importing the tested module
vi.mock('../brew-cli.js', () => ({
  execBrew: vi.fn(),
  streamBrew: vi.fn(),
}));
vi.mock('../state-snapshot/snapshot.js', () => ({
  captureSnapshot: vi.fn(),
  loadSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
}));
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
}));

import { buildRollbackPlan } from './rollback-engine.js';
import { execBrew } from '../brew-cli.js';
import { captureSnapshot, saveSnapshot } from '../state-snapshot/snapshot.js';
import { readdir } from 'node:fs/promises';

const mockExecBrew = vi.mocked(execBrew);
const mockCaptureSnapshot = vi.mocked(captureSnapshot);
const mockSaveSnapshot = vi.mocked(saveSnapshot);
const mockReaddir = vi.mocked(readdir);

function makeSnapshot(overrides: Partial<BrewSnapshot> = {}): BrewSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    formulae: [],
    casks: [],
    taps: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: versioned formula not found, no bottle cache, brew --cache returns tmp path
  mockExecBrew.mockImplementation(async (args) => {
    if (args[0] === '--cache') return '/tmp/homebrew-cache\n';
    throw new Error('not found');
  });
  mockReaddir.mockResolvedValue([]);
  mockSaveSnapshot.mockResolvedValue(undefined);
});

describe('buildRollbackPlan', () => {
  it('throws if not Pro', async () => {
    const snapshot = makeSnapshot();
    mockCaptureSnapshot.mockResolvedValue(makeSnapshot());
    await expect(buildRollbackPlan(snapshot, false)).rejects.toThrow('Pro license required');
  });

  it('returns empty actions when snapshots are identical', async () => {
    const formulae = [{ name: 'git', version: '2.44.0', pinned: false }];
    const snapshot = makeSnapshot({ formulae });
    mockCaptureSnapshot.mockResolvedValue(makeSnapshot({ formulae }));

    const plan = await buildRollbackPlan(snapshot, true);
    expect(plan.actions).toHaveLength(0);
    expect(plan.canExecute).toBe(false);
  });

  it('detects downgrade for upgraded packages using versioned formula', async () => {
    const snapshot = makeSnapshot({
      formulae: [{ name: 'node', version: '20.0.0', pinned: false }],
    });
    const current = makeSnapshot({
      formulae: [{ name: 'node', version: '21.0.0', pinned: false }],
    });
    mockCaptureSnapshot.mockResolvedValue(current);
    // node@20 exists
    mockExecBrew.mockImplementation(async (args) => {
      if (args[0] === '--cache') return '/tmp/homebrew-cache\n';
      if (args[0] === 'info' && args[2] === 'node@20') return '{}';
      throw new Error('not found');
    });

    const plan = await buildRollbackPlan(snapshot, true);
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]!.action).toBe('downgrade');
    expect(plan.actions[0]!.strategy).toBe('versioned-formula');
    expect(plan.actions[0]!.versionedFormula).toBe('node@20');
    expect(plan.canExecute).toBe(true);
  });

  it('uses bottle-cache strategy when versioned formula is absent but cache file exists', async () => {
    const snapshot = makeSnapshot({
      formulae: [{ name: 'wget', version: '1.21.0', pinned: false }],
    });
    const current = makeSnapshot({
      formulae: [{ name: 'wget', version: '1.22.0', pinned: false }],
    });
    mockCaptureSnapshot.mockResolvedValue(current);
    mockExecBrew.mockImplementation(async (args) => {
      if (args[0] === '--cache') return '/tmp/homebrew-cache\n';
      throw new Error('not found');
    });
    mockReaddir.mockResolvedValue(['wget--1.21.0.bottle.tar.gz'] as unknown as Awaited<ReturnType<typeof readdir>>);

    const plan = await buildRollbackPlan(snapshot, true);
    expect(plan.actions[0]!.strategy).toBe('bottle-cache');
    expect(plan.canExecute).toBe(true);
  });

  it('marks casks as pin-only regardless of availability', async () => {
    const snapshot = makeSnapshot({
      casks: [{ name: 'alfred', version: '5.0.0' }],
    });
    const current = makeSnapshot({
      casks: [{ name: 'alfred', version: '5.1.0' }],
    });
    mockCaptureSnapshot.mockResolvedValue(current);

    const plan = await buildRollbackPlan(snapshot, true);
    expect(plan.actions[0]!.strategy).toBe('pin-only');
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it('marks added packages (not in snapshot) as unavailable remove', async () => {
    const snapshot = makeSnapshot({ formulae: [] });
    const current = makeSnapshot({
      formulae: [{ name: 'curl', version: '8.0.0', pinned: false }],
    });
    mockCaptureSnapshot.mockResolvedValue(current);

    const plan = await buildRollbackPlan(snapshot, true);
    expect(plan.actions[0]!.action).toBe('remove');
    expect(plan.actions[0]!.strategy).toBe('unavailable');
    expect(plan.canExecute).toBe(false);
  });

  it('falls back to pin-only when neither versioned formula nor bottle cache available', async () => {
    const snapshot = makeSnapshot({
      formulae: [{ name: 'obscure-pkg', version: '1.0.0', pinned: false }],
    });
    const current = makeSnapshot({
      formulae: [{ name: 'obscure-pkg', version: '2.0.0', pinned: false }],
    });
    mockCaptureSnapshot.mockResolvedValue(current);

    const plan = await buildRollbackPlan(snapshot, true);
    expect(plan.actions[0]!.strategy).toBe('pin-only');
    expect(plan.canExecute).toBe(true);
  });
});
