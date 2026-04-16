import { execBrew, streamBrew } from './brew-cli.js';
import { parseInstalledJson, parseOutdatedJson, parseServicesJson, parseFormulaInfoJson } from './parsers/json-parser.js';
import { parseSearchResults, parseDoctorOutput, parseBrewConfig, parseLeavesOutput } from './parsers/text-parser.js';
import type { Formula, Cask, OutdatedPackage, BrewService, BrewConfig, PackageListItem } from './types.js';

export async function getInstalled(): Promise<{ formulae: Formula[]; casks: Cask[] }> {
  const raw = await execBrew(['info', '--json=v2', '--installed']);
  return parseInstalledJson(raw);
}

export async function getOutdated(): Promise<{ formulae: OutdatedPackage[]; casks: OutdatedPackage[] }> {
  const raw = await execBrew(['outdated', '--json=v2']);
  return parseOutdatedJson(raw);
}

export async function getServices(): Promise<BrewService[]> {
  const raw = await execBrew(['services', 'list', '--json']);
  return parseServicesJson(raw);
}

export async function getFormulaInfo(name: string): Promise<Formula | null> {
  const raw = await execBrew(['info', '--json=v2', name]);
  return parseFormulaInfoJson(raw);
}

export async function search(term: string): Promise<{ formulae: string[]; casks: string[] }> {
  const raw = await execBrew(['search', term]);
  return parseSearchResults(raw);
}

export async function getDoctor(): Promise<{ warnings: string[]; isClean: boolean }> {
  try {
    const raw = await execBrew(['doctor']);
    return parseDoctorOutput(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return parseDoctorOutput(msg);
  }
}

export async function getConfig(): Promise<BrewConfig> {
  const raw = await execBrew(['config']);
  return parseBrewConfig(raw);
}

export async function getLeaves(): Promise<string[]> {
  const raw = await execBrew(['leaves']);
  return parseLeavesOutput(raw);
}

export function installPackage(name: string): AsyncGenerator<string> {
  return streamBrew(['install', name]);
}

export function upgradePackage(name: string): AsyncGenerator<string> {
  return streamBrew(['upgrade', name]);
}

export function upgradeAll(): AsyncGenerator<string> {
  return streamBrew(['upgrade']);
}

export async function uninstallPackage(name: string): Promise<string> {
  return execBrew(['uninstall', name]);
}

export async function pinPackage(name: string): Promise<void> {
  await execBrew(['pin', name]);
}

export async function unpinPackage(name: string): Promise<void> {
  await execBrew(['unpin', name]);
}

export async function serviceAction(name: string, action: 'start' | 'stop' | 'restart'): Promise<string> {
  return execBrew(['services', action, name]);
}

export function formulaeToListItems(formulae: Formula[]): PackageListItem[] {
  return formulae.map((f) => {
    const installed = f.installed[0];
    return {
      name: f.name,
      version: installed?.version ?? f.versions.stable,
      desc: f.desc,
      type: 'formula',
      outdated: f.outdated,
      pinned: f.pinned,
      kegOnly: f.keg_only,
      installedAsDependency: installed?.installed_as_dependency ?? false,
      installedTime: installed?.time ?? null,
    };
  });
}

export function casksToListItems(casks: Cask[]): PackageListItem[] {
  return casks.map((c) => ({
    name: c.token,
    version: c.installed ?? c.version,
    desc: c.desc,
    type: 'cask',
    outdated: c.outdated,
    pinned: false,
    kegOnly: false,
    installedAsDependency: false,
    installedTime: c.installed_time ?? null,
  }));
}
