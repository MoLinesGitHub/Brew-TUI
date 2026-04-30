import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// integrity.ts captures a SHA-256 of its own module file at load time, then
// each call to checkBundleIntegrity() re-reads the file and compares hashes.
// The dev/prod split (SEG-006) lives in two failure modes:
//   - baseline could not be captured at module load
//   - file could not be re-read at check time
// Production (NODE_ENV !== development|test) must fail closed in both.

const mockReadFileSync = vi.fn();

vi.mock('node:fs', () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

vi.mock('node:url', () => ({
  fileURLToPath: () => '/fake/integrity.js',
}));

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return actual; // hashing must remain real to round-trip the same content
});

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

beforeEach(() => {
  mockReadFileSync.mockReset();
  vi.resetModules();
});

describe('integrity: checkBundleIntegrity', () => {
  it('returns true when the bundle is unchanged (baseline matches)', async () => {
    mockReadFileSync.mockReturnValue('stable bundle content');
    const { checkBundleIntegrity } = await import('./integrity.js');
    expect(checkBundleIntegrity()).toBe(true);
  });

  it('returns false when the bundle hash changes after load (any NODE_ENV)', async () => {
    mockReadFileSync.mockReturnValueOnce('original');
    const { checkBundleIntegrity } = await import('./integrity.js');
    mockReadFileSync.mockReturnValueOnce('tampered');
    expect(checkBundleIntegrity()).toBe(false);
  });

  describe('dev / test mode', () => {
    it('fails open when the baseline could not be captured at load', async () => {
      process.env.NODE_ENV = 'development';
      mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
      const { checkBundleIntegrity } = await import('./integrity.js');
      expect(checkBundleIntegrity()).toBe(true);
    });

    it('fails open when the file becomes unreadable after load', async () => {
      process.env.NODE_ENV = 'test';
      mockReadFileSync.mockReturnValueOnce('content');
      const { checkBundleIntegrity } = await import('./integrity.js');
      mockReadFileSync.mockImplementationOnce(() => { throw new Error('EACCES'); });
      expect(checkBundleIntegrity()).toBe(true);
    });
  });

  describe('production mode', () => {
    it('fails closed when the baseline could not be captured at load', async () => {
      process.env.NODE_ENV = 'production';
      mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
      const { checkBundleIntegrity } = await import('./integrity.js');
      expect(checkBundleIntegrity()).toBe(false);
    });

    it('fails closed when the file becomes unreadable after load', async () => {
      process.env.NODE_ENV = 'production';
      mockReadFileSync.mockReturnValueOnce('content');
      const { checkBundleIntegrity } = await import('./integrity.js');
      mockReadFileSync.mockImplementationOnce(() => { throw new Error('EACCES'); });
      expect(checkBundleIntegrity()).toBe(false);
    });

    it('returns true when the bundle is unchanged in production', async () => {
      process.env.NODE_ENV = 'production';
      mockReadFileSync.mockReturnValue('stable');
      const { checkBundleIntegrity } = await import('./integrity.js');
      expect(checkBundleIntegrity()).toBe(true);
    });
  });
});
