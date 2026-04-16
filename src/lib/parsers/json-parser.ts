import type { BrewInfoResponse, BrewOutdatedResponse, BrewService, Formula, Cask, OutdatedPackage } from '../types.js';

function safeParse<T>(raw: string, context: string): T {
  try {
    const result = JSON.parse(raw);
    if (result === null || result === undefined) {
      throw new Error(`${context} returned null or empty response`);
    }
    return result as T;
  } catch (err) {
    throw new Error(`Failed to parse ${context} JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function parseInstalledJson(raw: string): { formulae: Formula[]; casks: Cask[] } {
  const data = safeParse<BrewInfoResponse>(raw, 'brew info --installed');
  return {
    formulae: Array.isArray(data.formulae) ? data.formulae : [],
    casks: Array.isArray(data.casks) ? data.casks : [],
  };
}

export function parseOutdatedJson(raw: string): { formulae: OutdatedPackage[]; casks: OutdatedPackage[] } {
  const data = safeParse<BrewOutdatedResponse>(raw, 'brew outdated');
  return {
    formulae: Array.isArray(data.formulae) ? data.formulae : [],
    casks: Array.isArray(data.casks) ? data.casks : [],
  };
}

export function parseServicesJson(raw: string): BrewService[] {
  const data = safeParse<BrewService[]>(raw, 'brew services list');
  if (!Array.isArray(data)) return [];
  return data.map((s) => ({
    name: s.name,
    status: s.status ?? 'none',
    user: s.user ?? null,
    file: s.file ?? null,
    exit_code: s.exit_code ?? null,
  }));
}

export function parseFormulaInfoJson(raw: string): Formula | null {
  const data = safeParse<BrewInfoResponse>(raw, 'brew info');
  return data.formulae?.[0] ?? null;
}
