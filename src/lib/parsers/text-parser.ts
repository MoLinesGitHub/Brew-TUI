import type { BrewConfig } from '../types.js';

export function parseSearchResults(raw: string): { formulae: string[]; casks: string[] } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const formulae: string[] = [];
  const casks: string[] = [];
  let section: 'formulae' | 'casks' = 'formulae';

  for (const line of lines) {
    if (line.startsWith('==> Formulae')) {
      section = 'formulae';
      continue;
    }
    if (line.startsWith('==> Casks')) {
      section = 'casks';
      continue;
    }
    if (line.startsWith('==>')) continue;

    if (section === 'formulae') formulae.push(line);
    else casks.push(line);
  }

  return { formulae, casks };
}

export function parseDoctorOutput(raw: string): { warnings: string[]; isClean: boolean } {
  const cleaned = raw.trim();
  if (cleaned.includes('Your system is ready to brew')) {
    return { warnings: [], isClean: true };
  }

  const warnings: string[] = [];
  let current = '';

  for (const line of cleaned.split('\n')) {
    if (line.startsWith('Warning:')) {
      if (current) warnings.push(current.trim());
      current = line;
    } else if (current) {
      current += '\n' + line;
    }
  }
  if (current) warnings.push(current.trim());

  return { warnings, isClean: false };
}

export function parseBrewConfig(raw: string): BrewConfig {
  const lines = raw.split('\n');
  const get = (key: string): string => {
    const line = lines.find((l) => l.startsWith(key));
    return line?.split(':').slice(1).join(':').trim() ?? '';
  };

  return {
    HOMEBREW_VERSION: get('HOMEBREW_VERSION'),
    HOMEBREW_PREFIX: get('HOMEBREW_PREFIX'),
    coreUpdated: get('Core tap last commit') || get('Core tap JSON'),
  };
}

export function parseLeavesOutput(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}
