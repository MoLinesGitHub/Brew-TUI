import { describe, expect, it } from 'vitest';
import { parseInstalledJson, parseOutdatedJson, parseFormulaInfoJson } from './json-parser.js';
import { parseBrewConfig, parseLeavesOutput } from './text-parser.js';

describe('json-parser: parseInstalledJson', () => {
  it('parses valid JSON with formulae and casks', () => {
    const raw = JSON.stringify({
      formulae: [{ name: 'wget', versions: { stable: '1.21' }, installed: [], outdated: false, pinned: false }],
      casks: [{ token: 'firefox', version: '120.0', installed: '120.0', outdated: false }],
    });
    const result = parseInstalledJson(raw);
    expect(result.formulae).toHaveLength(1);
    expect(result.formulae[0]!.name).toBe('wget');
    expect(result.casks).toHaveLength(1);
    expect(result.casks[0]!.token).toBe('firefox');
  });

  it('returns empty arrays when formulae/casks are missing', () => {
    const raw = JSON.stringify({});
    const result = parseInstalledJson(raw);
    expect(result.formulae).toEqual([]);
    expect(result.casks).toEqual([]);
  });

  it('returns empty arrays for non-array formulae/casks', () => {
    const raw = JSON.stringify({ formulae: 'not-an-array', casks: 123 });
    const result = parseInstalledJson(raw);
    expect(result.formulae).toEqual([]);
    expect(result.casks).toEqual([]);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseInstalledJson('not json')).toThrow('Failed to parse');
  });

  it('throws on null response', () => {
    expect(() => parseInstalledJson('null')).toThrow('returned null or empty response');
  });
});

describe('json-parser: parseOutdatedJson', () => {
  it('parses valid outdated JSON', () => {
    const raw = JSON.stringify({
      formulae: [{ name: 'node', installed_versions: ['18.0.0'], current_version: '20.0.0' }],
      casks: [{ name: 'firefox', installed_versions: '119.0', current_version: '120.0' }],
    });
    const result = parseOutdatedJson(raw);
    expect(result.formulae).toHaveLength(1);
    expect(result.casks).toHaveLength(1);
  });

  it('returns empty arrays when no packages are outdated', () => {
    const raw = JSON.stringify({ formulae: [], casks: [] });
    const result = parseOutdatedJson(raw);
    expect(result.formulae).toEqual([]);
    expect(result.casks).toEqual([]);
  });

  // --greedy returns auto-updating casks (firefox, docker-desktop, etc.) that
  // brew omits by default. These have multiple installed_versions entries and
  // the same response shape as non-greedy output, so the parser should accept
  // both transparently.
  it('parses --greedy output: only casks with auto_updates: true', () => {
    const raw = JSON.stringify({
      formulae: [],
      casks: [
        { name: 'firefox', installed_versions: ['149.0'], current_version: '150.0.1' },
        { name: 'docker-desktop', installed_versions: ['4.63.0,220185'], current_version: '4.71.0,225177' },
        { name: 'warp', installed_versions: ['0.2026.03.04.08.20.stable_02'], current_version: '0.2026.04.27.15.32.stable_03' },
      ],
    });
    const result = parseOutdatedJson(raw);
    expect(result.formulae).toEqual([]);
    expect(result.casks).toHaveLength(3);
    expect(result.casks[0]!.name).toBe('firefox');
    expect(result.casks[1]!.installed_versions).toEqual(['4.63.0,220185']);
  });
});

describe('json-parser: parseFormulaInfoJson', () => {
  it('returns the first formula from info response', () => {
    const raw = JSON.stringify({
      formulae: [{ name: 'wget', desc: 'Internet file retriever', versions: { stable: '1.21' } }],
      casks: [],
    });
    const result = parseFormulaInfoJson(raw);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('wget');
  });

  it('returns null when formulae array is empty', () => {
    const raw = JSON.stringify({ formulae: [], casks: [] });
    expect(parseFormulaInfoJson(raw)).toBeNull();
  });

  it('returns null when formulae is undefined', () => {
    const raw = JSON.stringify({ casks: [] });
    expect(parseFormulaInfoJson(raw)).toBeNull();
  });
});

describe('text-parser: parseBrewConfig', () => {
  it('extracts config values from typical brew config output', () => {
    const raw = [
      'HOMEBREW_VERSION: 4.2.0',
      'HOMEBREW_PREFIX: /opt/homebrew',
      'HOMEBREW_CASK_OPTS: []',
      'Core tap last commit: 2024-01-15',
    ].join('\n');
    const result = parseBrewConfig(raw);
    expect(result.HOMEBREW_VERSION).toBe('4.2.0');
    expect(result.HOMEBREW_PREFIX).toBe('/opt/homebrew');
    expect(result.coreUpdated).toBe('2024-01-15');
  });

  it('returns empty strings for missing keys', () => {
    const result = parseBrewConfig('');
    expect(result.HOMEBREW_VERSION).toBe('');
    expect(result.HOMEBREW_PREFIX).toBe('');
    expect(result.coreUpdated).toBe('');
  });

  it('handles Core tap JSON variant', () => {
    const raw = [
      'HOMEBREW_VERSION: 4.2.0',
      'HOMEBREW_PREFIX: /usr/local',
      'Core tap JSON: Mar 1 12:00:00 UTC 2024',
    ].join('\n');
    const result = parseBrewConfig(raw);
    expect(result.coreUpdated).toBe('Mar 1 12:00:00 UTC 2024');
  });
});

describe('text-parser: parseLeavesOutput', () => {
  it('splits lines and trims', () => {
    expect(parseLeavesOutput('wget\n  htop  \ncurl')).toEqual(['wget', 'htop', 'curl']);
  });

  it('filters empty lines', () => {
    expect(parseLeavesOutput('\n\nwget\n\n')).toEqual(['wget']);
  });

  it('returns empty array for empty input', () => {
    expect(parseLeavesOutput('')).toEqual([]);
  });
});
