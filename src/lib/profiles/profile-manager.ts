import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { PROFILES_DIR, ensureDataDirs } from '../data-dir.js';
import { execBrew, streamBrew } from '../brew-cli.js';
import { getInstalled, getLeaves } from '../brew-api.js';
import { t } from '../../i18n/index.js';
import { requirePro } from '../license/pro-guard.js';
import { getWatermark } from '../license/watermark.js';
import type { Profile, ProfileFile } from './types.js';

/**
 * Validate a profile name to prevent path traversal.
 * Only allows alphanumeric characters, hyphens, underscores, and spaces.
 * Throws if the name contains path separators or traversal sequences.
 */
const MAX_PROFILE_NAME_LENGTH = 100;

function validateProfileName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Profile name cannot be empty');
  }
  if (name.length > MAX_PROFILE_NAME_LENGTH) {
    throw new Error(`Profile name is too long (max ${MAX_PROFILE_NAME_LENGTH} characters)`);
  }
  if (!/^[\w\s-]+$/.test(name)) {
    throw new Error(`Invalid profile name: "${name}". Only letters, numbers, spaces, hyphens, and underscores are allowed.`);
  }
}

function profilePath(name: string): string {
  validateProfileName(name);
  // Use basename as an additional defense-in-depth guard: strips any directory
  // component that might survive the regex check on edge-case OS behavior.
  return join(PROFILES_DIR, `${basename(name)}.json`);
}

export async function listProfiles(): Promise<string[]> {
  requirePro();
  await ensureDataDirs();
  try {
    const files = await readdir(PROFILES_DIR);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function loadProfile(name: string): Promise<Profile> {
  requirePro();
  const raw = await readFile(profilePath(name), 'utf-8');
  let file: ProfileFile;
  try {
    file = JSON.parse(raw) as ProfileFile;
  } catch (err) {
    throw new Error(`Profile "${name}" is corrupted: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!file.profile) {
    throw new Error(`Profile "${name}" is missing required data`);
  }
  return file.profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  requirePro();
  await ensureDataDirs();
  const file: ProfileFile = { version: 1, profile };
  await writeFile(profilePath(profile.name), JSON.stringify(file, null, 2), 'utf-8');
}

export async function deleteProfile(name: string): Promise<void> {
  requirePro();
  try {
    await rm(profilePath(name));
  } catch { /* may not exist */ }
}

export async function exportCurrentSetup(name: string, description: string): Promise<Profile> {
  requirePro();

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
    exportedBy: getWatermark(), // Layer 16: Watermark — who exported this profile
  };

  await saveProfile(profile);
  return profile;
}

export async function updateProfile(oldName: string, newName: string, newDescription: string): Promise<void> {
  requirePro();
  const profile = await loadProfile(oldName);
  if (oldName !== newName) {
    await deleteProfile(oldName);
  }
  const updated: Profile = {
    ...profile,
    name: newName,
    description: newDescription,
    updatedAt: new Date().toISOString(),
  };
  await saveProfile(updated);
}

export async function* importProfile(profile: Profile): AsyncGenerator<string> {
  requirePro();

  const installed = await getInstalled();
  const installedFormulae = new Set(installed.formulae.map((f) => f.name));
  const installedCasks = new Set(installed.casks.filter((c) => c.installed).map((c) => c.token));

  // Add missing taps
  for (const tap of profile.taps) {
    yield t('profileMgr_tapping', { name: tap });
    try {
      await execBrew(['tap', tap]);
    } catch { /* may already be tapped */ }
  }

  // Install missing formulae
  const missingFormulae = profile.formulae.filter((f) => !installedFormulae.has(f));
  for (const name of missingFormulae) {
    yield t('profileMgr_installing', { name });
    for await (const line of streamBrew(['install', name])) {
      yield line;
    }
  }

  // Install missing casks
  const missingCasks = profile.casks.filter((c) => !installedCasks.has(c));
  for (const name of missingCasks) {
    yield t('profileMgr_installingCask', { name });
    for await (const line of streamBrew(['install', '--cask', name])) {
      yield line;
    }
  }

  const totalInstalled = missingFormulae.length + missingCasks.length;
  yield t('profileMgr_importDone', { count: totalInstalled });
}
