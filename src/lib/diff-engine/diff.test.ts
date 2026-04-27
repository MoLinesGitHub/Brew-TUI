import { describe, expect, it } from 'vitest';
import { diffSnapshots } from './diff.js';
import type { BrewSnapshot } from '../state-snapshot/snapshot.js';

function makeSnapshot(overrides: Partial<BrewSnapshot> = {}): BrewSnapshot {
  return {
    capturedAt: '2026-04-27T00:00:00.000Z',
    formulae: [],
    casks: [],
    taps: [],
    ...overrides,
  };
}

describe('diffSnapshots() — formulae', () => {
  it('detects added formulae', () => {
    const base = makeSnapshot({ formulae: [{ name: 'git', version: '2.44.0', pinned: false }] });
    const current = makeSnapshot({
      formulae: [
        { name: 'git', version: '2.44.0', pinned: false },
        { name: 'node', version: '22.0.0', pinned: false },
      ],
    });

    const diff = diffSnapshots(base, current);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({ name: 'node', version: '22.0.0', type: 'formula' });
    expect(diff.removed).toHaveLength(0);
    expect(diff.upgraded).toHaveLength(0);
    expect(diff.downgraded).toHaveLength(0);
  });

  it('detects removed formulae', () => {
    const base = makeSnapshot({
      formulae: [
        { name: 'git', version: '2.44.0', pinned: false },
        { name: 'wget', version: '1.21.4', pinned: false },
      ],
    });
    const current = makeSnapshot({ formulae: [{ name: 'git', version: '2.44.0', pinned: false }] });

    const diff = diffSnapshots(base, current);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toMatchObject({ name: 'wget', version: '1.21.4', type: 'formula' });
    expect(diff.added).toHaveLength(0);
  });

  it('detects upgraded formulae', () => {
    const base = makeSnapshot({ formulae: [{ name: 'git', version: '2.44.0', pinned: false }] });
    const current = makeSnapshot({ formulae: [{ name: 'git', version: '2.45.0', pinned: false }] });

    const diff = diffSnapshots(base, current);

    expect(diff.upgraded).toHaveLength(1);
    expect(diff.upgraded[0]).toMatchObject({ name: 'git', from: '2.44.0', to: '2.45.0', type: 'formula' });
    expect(diff.downgraded).toHaveLength(0);
  });

  it('detects downgraded formulae', () => {
    const base = makeSnapshot({ formulae: [{ name: 'git', version: '2.45.0', pinned: false }] });
    const current = makeSnapshot({ formulae: [{ name: 'git', version: '2.44.0', pinned: false }] });

    const diff = diffSnapshots(base, current);

    expect(diff.downgraded).toHaveLength(1);
    expect(diff.downgraded[0]).toMatchObject({ name: 'git', from: '2.45.0', to: '2.44.0', type: 'formula' });
    expect(diff.upgraded).toHaveLength(0);
  });

  it('correctly handles Homebrew revision suffix (x.y.z_N)', () => {
    // 1.2.3_1 > 1.2.3 → should be upgraded
    const base = makeSnapshot({ formulae: [{ name: 'openssl', version: '3.3.0', pinned: false }] });
    const current = makeSnapshot({ formulae: [{ name: 'openssl', version: '3.3.0_1', pinned: false }] });

    const diff = diffSnapshots(base, current);

    expect(diff.upgraded).toHaveLength(1);
    expect(diff.upgraded[0]?.name).toBe('openssl');
  });

  it('produces empty diff when snapshots are identical', () => {
    const formulae = [{ name: 'git', version: '2.44.0', pinned: false }];
    const base = makeSnapshot({ formulae });
    const current = makeSnapshot({ formulae });

    const diff = diffSnapshots(base, current);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.upgraded).toHaveLength(0);
    expect(diff.downgraded).toHaveLength(0);
  });
});

describe('diffSnapshots() — casks', () => {
  it('detects added casks', () => {
    const base = makeSnapshot({ casks: [] });
    const current = makeSnapshot({ casks: [{ name: 'firefox', version: '125.0' }] });

    const diff = diffSnapshots(base, current);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({ name: 'firefox', version: '125.0', type: 'cask' });
  });

  it('detects removed casks', () => {
    const base = makeSnapshot({ casks: [{ name: 'slack', version: '4.36.140.0' }] });
    const current = makeSnapshot({ casks: [] });

    const diff = diffSnapshots(base, current);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toMatchObject({ name: 'slack', type: 'cask' });
  });

  it('detects upgraded casks', () => {
    const base = makeSnapshot({ casks: [{ name: 'firefox', version: '124.0' }] });
    const current = makeSnapshot({ casks: [{ name: 'firefox', version: '125.0' }] });

    const diff = diffSnapshots(base, current);

    expect(diff.upgraded).toHaveLength(1);
    expect(diff.upgraded[0]).toMatchObject({ name: 'firefox', from: '124.0', to: '125.0', type: 'cask' });
  });
});

describe('diffSnapshots() — taps', () => {
  it('detects added taps', () => {
    const base = makeSnapshot({ taps: ['homebrew/core'] });
    const current = makeSnapshot({ taps: ['homebrew/core', 'homebrew/cask-fonts'] });

    const diff = diffSnapshots(base, current);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toMatchObject({ name: 'homebrew/cask-fonts', version: '', type: 'tap' });
  });

  it('detects removed taps', () => {
    const base = makeSnapshot({ taps: ['homebrew/core', 'homebrew/cask'] });
    const current = makeSnapshot({ taps: ['homebrew/core'] });

    const diff = diffSnapshots(base, current);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toMatchObject({ name: 'homebrew/cask', version: '', type: 'tap' });
  });

  it('produces no tap changes when taps are identical', () => {
    const taps = ['homebrew/core', 'homebrew/cask'];
    const diff = diffSnapshots(makeSnapshot({ taps }), makeSnapshot({ taps }));

    expect(diff.added.filter((e) => e.type === 'tap')).toHaveLength(0);
    expect(diff.removed.filter((e) => e.type === 'tap')).toHaveLength(0);
  });
});

describe('diffSnapshots() — mixed changes', () => {
  it('handles simultaneous adds, removes, and upgrades', () => {
    const base = makeSnapshot({
      formulae: [
        { name: 'git', version: '2.44.0', pinned: false },
        { name: 'wget', version: '1.21.4', pinned: false },
      ],
      casks: [{ name: 'firefox', version: '124.0' }],
      taps: ['homebrew/core'],
    });

    const current = makeSnapshot({
      formulae: [
        { name: 'git', version: '2.45.0', pinned: false }, // upgraded
        { name: 'node', version: '22.0.0', pinned: false }, // added
        // wget removed
      ],
      casks: [
        { name: 'firefox', version: '125.0' }, // upgraded
        { name: 'slack', version: '4.36.140.0' }, // added
      ],
      taps: ['homebrew/core', 'homebrew/cask'], // homebrew/cask added
    });

    const diff = diffSnapshots(base, current);

    expect(diff.added.map((e) => e.name)).toContain('node');
    expect(diff.added.map((e) => e.name)).toContain('slack');
    expect(diff.added.map((e) => e.name)).toContain('homebrew/cask');
    expect(diff.removed.map((e) => e.name)).toContain('wget');
    expect(diff.upgraded.map((e) => e.name)).toContain('git');
    expect(diff.upgraded.map((e) => e.name)).toContain('firefox');
    expect(diff.downgraded).toHaveLength(0);
  });
});
