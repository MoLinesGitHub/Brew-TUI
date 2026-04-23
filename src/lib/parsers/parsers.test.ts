import { describe, expect, it } from 'vitest';
import { parseDoctorOutput, parseLeavesOutput, parseSearchResults } from './text-parser.js';
import { parseServicesJson } from './json-parser.js';

describe('text-parser', () => {
  it('splits search results into formulae and casks', () => {
    const raw = [
      'ack',
      'bat',
      '==> Casks',
      'docker',
      'visual-studio-code',
    ].join('\n');

    expect(parseSearchResults(raw)).toEqual({
      formulae: ['ack', 'bat'],
      casks: ['docker', 'visual-studio-code'],
    });
  });

  it('extracts doctor warnings', () => {
    const raw = [
      'Warning: Unbrewed dylibs were found in /usr/local/lib.',
      'If you did not put them there on purpose they could cause problems when',
      'building Homebrew formulae, and may need to be deleted.',
      'Warning: Some other issue',
    ].join('\n');

    expect(parseDoctorOutput(raw)).toEqual({
      isClean: false,
      warnings: [
        'Warning: Unbrewed dylibs were found in /usr/local/lib.\nIf you did not put them there on purpose they could cause problems when\nbuilding Homebrew formulae, and may need to be deleted.',
        'Warning: Some other issue',
      ],
    });
  });

  it('parses leaves output into trimmed names', () => {
    expect(parseLeavesOutput('wget\nhtop\n\n')).toEqual(['wget', 'htop']);
  });
});

describe('json-parser', () => {
  it('normalizes missing service fields', () => {
    const raw = JSON.stringify([
      { name: 'nginx', status: 'started', user: 'me' },
      { name: 'dnsmasq' },
    ]);

    expect(parseServicesJson(raw)).toEqual([
      { name: 'nginx', status: 'started', user: 'me', file: null, exit_code: null },
      { name: 'dnsmasq', status: 'none', user: null, file: null, exit_code: null },
    ]);
  });
});
