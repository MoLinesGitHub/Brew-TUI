import React from 'react';
import { render } from 'ink';
import { App } from './app.js';
import { activate, deactivate } from './lib/license/license-manager.js';
import { ensureDataDirs } from './lib/data-dir.js';
import { loadLicense } from './lib/license/license-manager.js';

const [,, command, arg] = process.argv;

async function runCli() {
  await ensureDataDirs();

  if (command === 'activate') {
    if (!arg) {
      console.error('Usage: brew-tui activate <license-key>');
      process.exit(1);
    }
    try {
      const license = await activate(arg);
      console.log(`\u2714 Pro activated for ${license.customerEmail}`);
      console.log(`  Plan: ${license.plan}`);
      if (license.expiresAt) {
        console.log(`  Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
      }
    } catch (err) {
      console.error(`\u2718 Activation failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    return;
  }

  if (command === 'deactivate') {
    const license = await loadLicense();
    if (!license) {
      console.log('No active license found.');
      return;
    }
    await deactivate(license);
    console.log('\u2714 License deactivated.');
    return;
  }

  if (command === 'status') {
    const license = await loadLicense();
    if (!license) {
      console.log('Plan: Free');
      console.log('Run `brew-tui activate <key>` to upgrade to Pro.');
    } else {
      console.log(`Plan: Pro (${license.plan})`);
      console.log(`Email: ${license.customerEmail}`);
      console.log(`Status: ${license.status}`);
      if (license.expiresAt) {
        console.log(`Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
      }
    }
    return;
  }

  // Default: launch TUI
  render(<App />);
}

runCli();
