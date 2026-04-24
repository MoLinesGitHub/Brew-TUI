import { spawn } from 'node:child_process';
import { execBrew, streamBrew } from './brew-cli.js';
import { parseInstalledJson, parseOutdatedJson, parseServicesJson, parseFormulaInfoJson } from './parsers/json-parser.js';
import { parseSearchResults, parseDoctorOutput, parseBrewConfig, parseLeavesOutput } from './parsers/text-parser.js';
import type { Formula, Cask, OutdatedPackage, BrewService, BrewConfig, PackageListItem } from './types.js';

// EP-011: Package name validation
const PKG_PATTERN = /^[\w@./+-]+$/;

function validatePackageName(name: string): void {
  if (!PKG_PATTERN.test(name)) throw new Error('Invalid package name: ' + name);
}

export async function brewUpdate(): Promise<void> {
  // Run brew update WITHOUT HOMEBREW_NO_AUTO_UPDATE so it actually fetches
  return new Promise((resolve, reject) => {
    const proc = spawn('brew', ['update'], { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`brew update exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

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
  validatePackageName(name);
  const raw = await execBrew(['info', '--json=v2', name]);
  return parseFormulaInfoJson(raw);
}

// SCR-008: Cask-specific info endpoint
export async function getCaskInfo(name: string): Promise<Cask | null> {
  validatePackageName(name);
  try {
    const raw = await execBrew(['info', '--json=v2', '--cask', name]);
    const data = JSON.parse(raw) as { casks?: Cask[] };
    return data.casks?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function search(term: string): Promise<{ formulae: string[]; casks: string[] }> {
  // Strip leading dashes to prevent flag injection into `brew search`
  // (e.g. "--desc" would be parsed by brew as an option, not a search term).
  const safeTerm = term.replace(/^-+/, '');
  if (!safeTerm) return { formulae: [], casks: [] };
  const raw = await execBrew(['search', safeTerm]);
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
  validatePackageName(name);
  return streamBrew(['install', name]);
}

export function upgradePackage(name: string): AsyncGenerator<string> {
  validatePackageName(name);
  return streamBrew(['upgrade', name]);
}

export function upgradeAll(): AsyncGenerator<string> {
  return streamBrew(['upgrade']);
}

export async function uninstallPackage(name: string): Promise<string> {
  validatePackageName(name);
  return execBrew(['uninstall', name]);
}

export async function serviceAction(name: string, action: 'start' | 'stop' | 'restart'): Promise<string> {
  validatePackageName(name);
  return execBrew(['services', action, name]);
}

// ARQ-008: Pin/unpin operations moved from outdated view
export async function pinPackage(name: string): Promise<string> {
  validatePackageName(name);
  return execBrew(['pin', name]);
}

export async function unpinPackage(name: string): Promise<string> {
  validatePackageName(name);
  return execBrew(['unpin', name]);
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
