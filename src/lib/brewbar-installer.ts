import { rm, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { t } from '../i18n/index.js';
import { verifyPro } from './license/pro-guard.js';

const execFileAsync = promisify(execFile);
const BREWBAR_APP_PATH = '/Applications/BrewBar.app';
const DOWNLOAD_URL = 'https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip';
const TMP_ZIP = '/tmp/BrewBar.app.zip';

export async function isBrewBarInstalled(): Promise<boolean> {
  try {
    await access(BREWBAR_APP_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function installBrewBar(force = false): Promise<void> {
  // macOS only
  if (process.platform !== 'darwin') {
    throw new Error(t('cli_brewbarMacOnly'));
  }

  // Pro check
  if (!verifyPro()) {
    throw new Error(t('cli_brewbarProRequired'));
  }

  // Already installed check
  if (!force && await isBrewBarInstalled()) {
    throw new Error(t('cli_brewbarAlreadyInstalled'));
  }

  console.log(t('cli_brewbarInstalling'));

  // Download zip
  const res = await fetch(DOWNLOAD_URL);
  if (!res.ok || !res.body) {
    throw new Error(t('cli_brewbarDownloadFailed', { error: `HTTP ${res.status}` }));
  }

  // Write to tmp file
  const fileStream = createWriteStream(TMP_ZIP);
  await pipeline(res.body as any, fileStream);

  // Remove old app if force reinstall
  if (force && await isBrewBarInstalled()) {
    await rm(BREWBAR_APP_PATH, { recursive: true, force: true });
  }

  // Unzip to /Applications
  try {
    await execFileAsync('ditto', ['-xk', TMP_ZIP, '/Applications/']);
  } catch (err) {
    throw new Error(t('cli_brewbarDownloadFailed', { error: err instanceof Error ? err.message : String(err) }));
  } finally {
    // Clean up tmp zip
    await rm(TMP_ZIP, { force: true }).catch(() => {});
  }
}

export async function uninstallBrewBar(): Promise<void> {
  if (!await isBrewBarInstalled()) {
    throw new Error(t('cli_brewbarNotInstalled'));
  }

  await rm(BREWBAR_APP_PATH, { recursive: true, force: true });
}
