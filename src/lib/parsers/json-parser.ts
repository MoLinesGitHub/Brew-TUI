import type { BrewInfoResponse, BrewOutdatedResponse, BrewService, Formula, Cask, OutdatedPackage } from '../types.js';

export function parseInstalledJson(raw: string): { formulae: Formula[]; casks: Cask[] } {
  const data = JSON.parse(raw) as BrewInfoResponse;
  return {
    formulae: data.formulae ?? [],
    casks: data.casks ?? [],
  };
}

export function parseOutdatedJson(raw: string): { formulae: OutdatedPackage[]; casks: OutdatedPackage[] } {
  const data = JSON.parse(raw) as BrewOutdatedResponse;
  return {
    formulae: data.formulae ?? [],
    casks: data.casks ?? [],
  };
}

export function parseServicesJson(raw: string): BrewService[] {
  const data = JSON.parse(raw) as BrewService[];
  return data.map((s) => ({
    name: s.name,
    status: s.status ?? 'none',
    user: s.user ?? null,
    file: s.file ?? null,
    exit_code: s.exit_code ?? null,
  }));
}

export function parseFormulaInfoJson(raw: string): Formula | null {
  const data = JSON.parse(raw) as BrewInfoResponse;
  return data.formulae?.[0] ?? null;
}

export function parseCaskInfoJson(raw: string): Cask | null {
  const data = JSON.parse(raw) as BrewInfoResponse;
  return data.casks?.[0] ?? null;
}
