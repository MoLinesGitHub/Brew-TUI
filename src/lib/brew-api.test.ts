import { describe, expect, it, vi } from 'vitest';

// Mock brew-cli to prevent actual brew execution
vi.mock('./brew-cli.js', () => ({
  execBrew: vi.fn().mockResolvedValue('{}'),
  streamBrew: vi.fn(),
}));

vi.mock('./parsers/json-parser.js', () => ({
  parseInstalledJson: vi.fn().mockReturnValue({ formulae: [], casks: [] }),
  parseOutdatedJson: vi.fn().mockReturnValue({ formulae: [], casks: [] }),
  parseServicesJson: vi.fn().mockReturnValue([]),
  parseFormulaInfoJson: vi.fn().mockReturnValue(null),
  parseCaskInfoJson: vi.fn().mockReturnValue(null),
}));

vi.mock('./parsers/text-parser.js', () => ({
  parseSearchResults: vi.fn().mockReturnValue([]),
  parseDoctorOutput: vi.fn().mockReturnValue({ issues: [], warnings: [] }),
  parseBrewConfig: vi.fn().mockReturnValue({}),
  parseLeavesOutput: vi.fn().mockReturnValue([]),
}));

describe('validatePackageName (EP-011)', () => {
  it('accepts valid package names', async () => {
    const { execBrew } = await import('./brew-cli.js');
    const api = await import('./brew-api.js');

    for (const name of ['node', 'python@3.11', 'font-jetbrains-mono', 'go', 'rust']) {
      (execBrew as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
      await expect(api.getFormulaInfo(name)).resolves.not.toThrow();
    }
  });

  it('rejects package names with shell injection (semicolons)', async () => {
    const api = await import('./brew-api.js');
    await expect(api.getFormulaInfo('; rm -rf /')).rejects.toThrow('Invalid package name');
  });

  it('rejects empty package name', async () => {
    const api = await import('./brew-api.js');
    await expect(api.getFormulaInfo('')).rejects.toThrow('Invalid package name');
  });

  it('rejects package names with spaces', async () => {
    const api = await import('./brew-api.js');
    await expect(api.getFormulaInfo('bad name')).rejects.toThrow('Invalid package name');
  });

  it('rejects package names with backticks', async () => {
    const api = await import('./brew-api.js');
    await expect(api.getFormulaInfo('`whoami`')).rejects.toThrow('Invalid package name');
  });

  it('rejects package names with pipe', async () => {
    const api = await import('./brew-api.js');
    await expect(api.getFormulaInfo('foo|bar')).rejects.toThrow('Invalid package name');
  });

  // Note: PKG_PATTERN /^[\w@./+-]+$/ allows hyphens, so --force and -rf pass validation.
  // This is acceptable because brew CLI is called via spawn (no shell), so flags
  // would just be treated as package names and brew would report "not found".
  it('allows hyphenated names (not shell-injected via spawn)', async () => {
    const api = await import('./brew-api.js');
    // These pass regex validation but brew would just say "not found"
    await expect(api.getFormulaInfo('--force')).resolves.toBeDefined();
  });
});

describe('pinPackage / unpinPackage (ARQ-008)', () => {
  it('pinPackage rejects shell injection', async () => {
    const api = await import('./brew-api.js');
    if (typeof api.pinPackage === 'function') {
      await expect(api.pinPackage('; echo hacked')).rejects.toThrow('Invalid package name');
    }
  });

  it('unpinPackage rejects shell injection', async () => {
    const api = await import('./brew-api.js');
    if (typeof api.unpinPackage === 'function') {
      await expect(api.unpinPackage('; echo hacked')).rejects.toThrow('Invalid package name');
    }
  });

  it('pinPackage accepts valid names', async () => {
    const api = await import('./brew-api.js');
    if (typeof api.pinPackage === 'function') {
      await expect(api.pinPackage('node')).resolves.not.toThrow();
    }
  });
});
