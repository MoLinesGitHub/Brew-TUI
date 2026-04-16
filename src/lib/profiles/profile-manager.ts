import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PROFILES_DIR, ensureDataDirs } from '../data-dir.js';
import { execBrew, streamBrew } from '../brew-cli.js';
import { getInstalled, getLeaves } from '../brew-api.js';
import type { Profile, ProfileFile } from './types.js';

function profilePath(name: string): string {
  return join(PROFILES_DIR, `${name}.json`);
}

export async function listProfiles(): Promise<string[]> {
  await ensureDataDirs();
  try {
    const files = await readdir(PROFILES_DIR);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function loadProfile(name: string): Promise<Profile> {
  const raw = await readFile(profilePath(name), 'utf-8');
  const file = JSON.parse(raw) as ProfileFile;
  return file.profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await ensureDataDirs();
  const file: ProfileFile = { version: 1, profile };
  await writeFile(profilePath(profile.name), JSON.stringify(file, null, 2), 'utf-8');
}

export async function deleteProfile(name: string): Promise<void> {
  try {
    await rm(profilePath(name));
  } catch { /* may not exist */ }
}

export async function exportCurrentSetup(name: string, description: string): Promise<Profile> {
  const [installed, leaves, tapsRaw] = await Promise.all([
    getInstalled(),
    getLeaves(),
    execBrew(['tap']),
  ]);

  const taps = tapsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
  const casks = installed.casks
    .filter((c) => c.installed)
    .map((c) => c.token);

  const now = new Date().toISOString();
  const profile: Profile = {
    name,
    description,
    createdAt: now,
    updatedAt: now,
    formulae: leaves,
    casks,
    taps,
  };

  await saveProfile(profile);
  return profile;
}

export async function* importProfile(profile: Profile): AsyncGenerator<string> {
  const installed = await getInstalled();
  const installedFormulae = new Set(installed.formulae.map((f) => f.name));
  const installedCasks = new Set(installed.casks.filter((c) => c.installed).map((c) => c.token));

  // Add missing taps
  for (const tap of profile.taps) {
    yield `Tapping ${tap}...`;
    try {
      await execBrew(['tap', tap]);
    } catch { /* may already be tapped */ }
  }

  // Install missing formulae
  const missingFormulae = profile.formulae.filter((f) => !installedFormulae.has(f));
  for (const name of missingFormulae) {
    yield `Installing ${name}...`;
    for await (const line of streamBrew(['install', name])) {
      yield line;
    }
  }

  // Install missing casks
  const missingCasks = profile.casks.filter((c) => !installedCasks.has(c));
  for (const name of missingCasks) {
    yield `Installing cask ${name}...`;
    for await (const line of streamBrew(['install', '--cask', name])) {
      yield line;
    }
  }

  const totalInstalled = missingFormulae.length + missingCasks.length;
  yield `Done! Installed ${totalInstalled} packages.`;
}
