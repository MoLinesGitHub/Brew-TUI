import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Formula } from '../types.js';

const mockExecBrew = vi.fn();
const mockExecFile = vi.fn();

vi.mock('../brew-cli.js', () => ({
  execBrew: (...args: unknown[]) => mockExecBrew(...args),
}));

vi.mock('node:child_process', () => ({
  execFile: (file: string, args: string[], cb: (err: Error | null, out: { stdout: string; stderr: string }) => void) => {
    mockExecFile(file, args)
      .then((stdout: string) => cb(null, { stdout, stderr: '' }))
      .catch((err: Error) => cb(err, { stdout: '', stderr: '' }));
  },
}));

beforeEach(() => {
  mockExecBrew.mockReset();
  mockExecFile.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

function makeFormula(name: string, opts: {
  installedAsDependency?: boolean;
  installedOnRequest?: boolean;
  dependencies?: string[];
} = {}): Formula {
  return {
    name,
    full_name: name,
    desc: '',
    homepage: '',
    versions: { stable: '1.0', head: null, bottle: false },
    dependencies: opts.dependencies ?? [],
    build_dependencies: [],
    installed: [{
      version: '1.0',
      installed_as_dependency: opts.installedAsDependency ?? false,
      installed_on_request: opts.installedOnRequest ?? true,
    }],
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

describe('cleanup-analyzer: gating', () => {
  it('throws when Pro is not active', async () => {
    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    await expect(analyzeCleanup(false, [], [])).rejects.toThrow(/Pro/i);
  });
});

describe('cleanup-analyzer: orphan detection', () => {
  it('flags a dep-installed formula with zero reverse deps as orphan', async () => {
    mockExecBrew.mockResolvedValue('/opt/homebrew/Cellar/orphan');
    mockExecFile.mockResolvedValue('1024\t/opt/homebrew/Cellar/orphan'); // 1MB

    const orphan = makeFormula('orphan', { installedAsDependency: true, installedOnRequest: false });
    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    const summary = await analyzeCleanup(true, [orphan], []);

    expect(summary.candidates).toHaveLength(1);
    expect(summary.candidates[0]!.name).toBe('orphan');
    expect(summary.candidates[0]!.reason).toBe('orphan');
    expect(summary.totalReclaimableBytes).toBeGreaterThan(0);
  });

  it('does not flag formulas listed as leaves (user-installed)', async () => {
    const f = makeFormula('wget', { installedOnRequest: true });
    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    const summary = await analyzeCleanup(true, [f], ['wget']);
    expect(summary.candidates).toHaveLength(0);
  });

  it('does not flag a dep that another installed formula still requires', async () => {
    mockExecBrew.mockResolvedValue('/opt/homebrew/Cellar/needed');
    mockExecFile.mockResolvedValue('512\t/opt/homebrew/Cellar/needed');

    const dep = makeFormula('needed', { installedAsDependency: true, installedOnRequest: false });
    const consumer = makeFormula('consumer', { dependencies: ['needed'] });
    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    const summary = await analyzeCleanup(true, [dep, consumer], ['consumer']);

    // 'needed' is still required by 'consumer' so it must NOT be a candidate.
    expect(summary.candidates.find((c) => c.name === 'needed')).toBeUndefined();
  });

  it('sorts candidates by disk usage descending', async () => {
    // Each call to execBrew returns a path; execFile returns a different size per path.
    mockExecBrew.mockImplementation((args: string[]) => Promise.resolve(`/opt/homebrew/Cellar/${args[1]}`));
    mockExecFile.mockImplementation((_file: string, args: string[]) => {
      const name = args[1]!.split('/').pop();
      const sizes: Record<string, string> = { small: '100', big: '10000', medium: '1000' };
      return Promise.resolve(`${sizes[name!] ?? '0'}\t${args[1]}`);
    });

    const formulae = ['small', 'big', 'medium'].map((n) =>
      makeFormula(n, { installedAsDependency: true, installedOnRequest: false }),
    );

    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    const summary = await analyzeCleanup(true, formulae, []);

    expect(summary.candidates.map((c) => c.name)).toEqual(['big', 'medium', 'small']);
  });

  it('returns 0 disk usage when du fails (cellar missing or unreadable)', async () => {
    mockExecBrew.mockResolvedValue('/opt/homebrew/Cellar/orphan');
    mockExecFile.mockRejectedValue(new Error('du: not found'));

    const orphan = makeFormula('orphan', { installedAsDependency: true, installedOnRequest: false });
    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    const summary = await analyzeCleanup(true, [orphan], []);

    expect(summary.candidates[0]!.diskUsageBytes).toBe(0);
    expect(summary.totalReclaimableBytes).toBe(0);
  });

  it('returns an empty summary when no formulae are installed as dependencies', async () => {
    const f = makeFormula('user', { installedOnRequest: true });
    const { analyzeCleanup } = await import('./cleanup-analyzer.js');
    const summary = await analyzeCleanup(true, [f], []);
    expect(summary.candidates).toEqual([]);
    expect(summary.totalReclaimableBytes).toBe(0);
  });
});
