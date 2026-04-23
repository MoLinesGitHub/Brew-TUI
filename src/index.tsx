import React from 'react';
import { createInterface } from 'node:readline/promises';
import { render } from 'ink';
import { App } from './app.js';
import { activate, deactivate, loadLicense } from './lib/license/license-manager.js';
import { ensureDataDirs } from './lib/data-dir.js';
import { t } from './i18n/index.js';

const [,, command, arg] = process.argv;

async function runCli() {
  await ensureDataDirs();

  if (command === 'activate') {
    const key = arg?.trim() ?? '';
    if (!key) {
      console.error(t('cli_usageActivate'));
      process.exit(1);
    }
    try {
      const license = await activate(key);
      console.log(t('cli_activated', { email: license.customerEmail }));
      console.log(t('cli_planPro'));
      if (license.expiresAt) {
        console.log(t('cli_expires', { date: new Date(license.expiresAt).toLocaleDateString() }));
      }
    } catch (err) {
      console.error(t('cli_activationFailed', { error: err instanceof Error ? err.message : String(err) }));
      process.exit(1);
    }
    return;
  }

  if (command === 'deactivate') {
    const license = await loadLicense();
    if (!license) {
      console.log(t('cli_noLicense'));
      return;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(t('cli_confirmDeactivate'));
    rl.close();
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 's') {
      console.log(t('cli_deactivateCancelled'));
      return;
    }
    const { remoteSuccess } = await deactivate(license);
    console.log(t('cli_deactivated'));
    if (!remoteSuccess) {
      console.warn(t('cli_deactivateRemoteFailed'));
    }
    return;
  }

  if (command === 'status') {
    const license = await loadLicense();
    if (!license) {
      console.log(t('cli_planFree'));
      console.log(t('cli_upgradeHint'));
    } else {
      console.log(t('cli_planPro'));
      console.log(t('cli_email', { email: license.customerEmail }));
      console.log(t('cli_status', { status: license.status }));
      if (license.expiresAt) {
        console.log(t('cli_expires', { date: new Date(license.expiresAt).toLocaleDateString() }));
      }
    }
    return;
  }

  if (command === 'install-brewbar') {
    const { installBrewBar } = await import('./lib/brewbar-installer.js');
    try {
      await installBrewBar(arg === '--force');
      console.log(t('cli_brewbarInstalled'));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (command === 'uninstall-brewbar') {
    const { uninstallBrewBar } = await import('./lib/brewbar-installer.js');
    try {
      await uninstallBrewBar();
      console.log(t('cli_brewbarUninstalled'));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  // Default: launch TUI
  render(<App />);
}

runCli().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
