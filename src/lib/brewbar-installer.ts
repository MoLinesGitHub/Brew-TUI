import { rm, access, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { t } from '../i18n/index.js';
import { verifyPro } from './license/pro-guard.js';
import { useLicenseStore } from '../stores/license-store.js';
import { fetchWithTimeout } from './fetch-timeout.js';
import { getDegradationLevel } from './license/license-manager.js';

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

  // Ensure the license store is populated in one-shot CLI processes.
  const initial = useLicenseStore.getState();
  if (initial.status === 'validating' && initial.license === null) {
    await initial.initialize();
  }

  // Pro check
  const { license, status } = useLicenseStore.getState();
  if (!verifyPro(license, status)) {
    if (license && (status === 'expired' || getDegradationLevel(license) !== 'none')) {
      throw new Error(t('cli_brewbarRevalidateRequired'));
    }
    throw new Error(t('cli_brewbarProRequired'));
  }

  // Already installed check
  if (!force && await isBrewBarInstalled()) {
    throw new Error(t('cli_brewbarAlreadyInstalled'));
  }

  console.log(t('cli_brewbarInstalling'));

  // Download zip (120s timeout for large binary)
  const res = await fetchWithTimeout(DOWNLOAD_URL, {}, 120_000);
  if (!res.ok || !res.body) {
    throw new Error(t('cli_brewbarDownloadFailed', { error: `HTTP ${res.status}` }));
  }

  // Reject downloads larger than 200 MB
  const contentLength = Number(res.headers.get('content-length') ?? '0');
  if (contentLength > 200 * 1024 * 1024) {
    throw new Error(t('cli_brewbarDownloadFailed', { error: 'Download exceeds 200 MB size limit' }));
  }

  // Write to tmp file
  const fileStream = createWriteStream(TMP_ZIP);
  await pipeline(res.body as any, fileStream);

  // SHA-256 integrity check
  try {
    const checksumRes = await fetchWithTimeout(`${DOWNLOAD_URL}.sha256`, {}, 15_000);
    if (checksumRes.ok) {
      const expected = (await checksumRes.text()).trim().split(/\s+/)[0]!.toLowerCase();
      const fileBuffer = await readFile(TMP_ZIP);
      const actual = createHash('sha256').update(fileBuffer).digest('hex');
      if (actual !== expected) {
        await rm(TMP_ZIP, { force: true }).catch(() => {});
        throw new Error(t('cli_brewbarDownloadFailed', { error: 'SHA-256 checksum mismatch' }));
      }
    }
  } catch (err) {
    // Re-throw checksum mismatch errors; ignore network errors fetching the checksum file
    if (err instanceof Error && err.message.includes('checksum mismatch')) throw err;
  }

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
