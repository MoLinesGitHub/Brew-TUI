import { describe, it, expect } from 'vitest';
import { serializeBrewfile, parseBrewfile } from './yaml-serializer.js';
import type { BrewfileSchema } from './types.js';

const BASE_SCHEMA: BrewfileSchema = {
  version: 1,
  meta: {
    name: 'Test Environment',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  formulae: [{ name: 'git' }, { name: 'node' }],
  casks: [{ name: 'visual-studio-code' }],
  taps: ['homebrew/core'],
};

describe('yaml-serializer', () => {
  describe('round-trip', () => {
    it('round-trips a minimal schema', () => {
      const minimal: BrewfileSchema = {
        version: 1,
        meta: {
          name: 'Minimal',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        formulae: [],
        casks: [],
        taps: [],
      };
      const serialized = serializeBrewfile(minimal);
      const parsed = parseBrewfile(serialized);
      expect(parsed.version).toBe(1);
      expect(parsed.meta.name).toBe('Minimal');
      expect(parsed.formulae).toHaveLength(0);
      expect(parsed.casks).toHaveLength(0);
      expect(parsed.taps).toHaveLength(0);
    });

    it('round-trips the base schema', () => {
      const serialized = serializeBrewfile(BASE_SCHEMA);
      const parsed = parseBrewfile(serialized);
      expect(parsed).toEqual(BASE_SCHEMA);
    });

    it('round-trips schema without description and without formula version', () => {
      const schema: BrewfileSchema = {
        version: 1,
        meta: {
          name: 'Work Setup',
          createdAt: '2024-06-15T10:30:00.000Z',
          updatedAt: '2024-06-15T10:30:00.000Z',
        },
        formulae: [
          { name: 'git' },
          { name: 'node' },
        ],
        casks: [],
        taps: [],
      };
      const parsed = parseBrewfile(serializeBrewfile(schema));
      expect(parsed.meta.name).toBe('Work Setup');
      expect(parsed.meta.description).toBeUndefined();
      expect(parsed.formulae[0]?.version).toBeUndefined();
    });

    it('round-trips complex schema with versions, options, and strictMode', () => {
      const schema: BrewfileSchema = {
        version: 1,
        meta: {
          name: 'Complex Setup',
          description: 'A setup with all the bells & whistles',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-03-15T12:00:00.000Z',
        },
        formulae: [
          { name: 'git', version: '2.44.0' },
          { name: 'node', version: '20.0.0' },
          { name: 'openssl@3', options: ['--with-ssl', '--HEAD'] },
        ],
        casks: [
          { name: 'visual-studio-code', version: '1.88.0' },
          { name: 'docker' },
        ],
        taps: ['homebrew/core', 'homebrew/cask-fonts'],
        strictMode: true,
      };
      const parsed = parseBrewfile(serializeBrewfile(schema));
      expect(parsed.version).toBe(1);
      expect(parsed.meta.name).toBe('Complex Setup');
      expect(parsed.meta.description).toBe('A setup with all the bells & whistles');
      expect(parsed.formulae).toHaveLength(3);
      expect(parsed.formulae[0]).toEqual({ name: 'git', version: '2.44.0' });
      expect(parsed.formulae[2]?.options).toEqual(['--with-ssl', '--HEAD']);
      expect(parsed.casks[0]).toEqual({ name: 'visual-studio-code', version: '1.88.0' });
      expect(parsed.taps).toEqual(['homebrew/core', 'homebrew/cask-fonts']);
      expect(parsed.strictMode).toBe(true);
    });

    it('round-trips schema with strictMode false', () => {
      const schema: BrewfileSchema = { ...BASE_SCHEMA, strictMode: false };
      const parsed = parseBrewfile(serializeBrewfile(schema));
      expect(parsed.strictMode).toBe(false);
    });

    it('round-trips name with special characters needing quotes', () => {
      const schema: BrewfileSchema = {
        ...BASE_SCHEMA,
        meta: {
          ...BASE_SCHEMA.meta,
          name: 'My Dev: Setup',
        },
      };
      const parsed = parseBrewfile(serializeBrewfile(schema));
      expect(parsed.meta.name).toBe('My Dev: Setup');
    });
  });

  describe('parseBrewfile errors', () => {
    it('throws when version is not 1', () => {
      const yaml = `version: 2\nmeta:\n  name: test\n  createdAt: '2024-01-01T00:00:00.000Z'\n  updatedAt: '2024-01-01T00:00:00.000Z'\nformulae:\n  []\ncasks:\n  []\ntaps:\n  []\n`;
      expect(() => parseBrewfile(yaml)).toThrow(/version/i);
    });

    it('throws when meta.name is missing', () => {
      const yaml = `version: 1\nmeta:\n  createdAt: '2024-01-01T00:00:00.000Z'\n  updatedAt: '2024-01-01T00:00:00.000Z'\nformulae:\n  []\ncasks:\n  []\ntaps:\n  []\n`;
      expect(() => parseBrewfile(yaml)).toThrow(/meta\.name/i);
    });

    it('throws when version is missing entirely', () => {
      const yaml = `meta:\n  name: test\n  createdAt: '2024-01-01T00:00:00.000Z'\n  updatedAt: '2024-01-01T00:00:00.000Z'\nformulae:\n  []\ncasks:\n  []\ntaps:\n  []\n`;
      expect(() => parseBrewfile(yaml)).toThrow();
    });
  });

  describe('serializeBrewfile', () => {
    it('produces valid YAML string', () => {
      const yaml = serializeBrewfile(BASE_SCHEMA);
      expect(yaml).toContain('version: 1');
      expect(yaml).toContain('name: Test Environment');
      expect(yaml).toContain("createdAt: '2024-01-01T00:00:00.000Z'");
      expect(yaml).toContain('  - name: git');
      expect(yaml).toContain('  - homebrew/core');
    });

    it('omits strictMode when undefined', () => {
      const yaml = serializeBrewfile(BASE_SCHEMA);
      expect(yaml).not.toContain('strictMode');
    });

    it('includes strictMode when defined', () => {
      const yaml = serializeBrewfile({ ...BASE_SCHEMA, strictMode: true });
      expect(yaml).toContain('strictMode: true');
    });

    it('omits description when undefined', () => {
      const yaml = serializeBrewfile(BASE_SCHEMA);
      expect(yaml).not.toContain('description:');
    });
  });
});
