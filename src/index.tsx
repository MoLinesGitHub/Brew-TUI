import React from 'react';
import { render } from 'ink';
import { App } from './app.js';
import { activate, deactivate, loadLicense } from './lib/license/license-manager.js';
import { ensureDataDirs } from './lib/data-dir.js';
import { t } from './i18n/index.js';

const [,, command, arg] = process.argv;

async function runCli() {
  await ensureDataDirs();

  if (command === 'activate') {
    if (!arg) {
      console.error(t('cli_usageActivate'));
      process.exit(1);
    }
    try {
      const license = await activate(arg);
      console.log(t('cli_activated', { email: license.customerEmail }));
      console.log(t('cli_plan', { plan: license.plan }));
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
    await deactivate(license);
    console.log(t('cli_deactivated'));
    return;
  }

  if (command === 'status') {
    const license = await loadLicense();
    if (!license) {
      console.log(t('cli_planFree'));
      console.log(t('cli_upgradeHint'));
    } else {
      console.log(t('cli_planPro', { plan: license.plan }));
      console.log(t('cli_email', { email: license.customerEmail }));
      console.log(t('cli_status', { status: license.status }));
      if (license.expiresAt) {
        console.log(t('cli_expires', { date: new Date(license.expiresAt).toLocaleDateString() }));
      }
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
