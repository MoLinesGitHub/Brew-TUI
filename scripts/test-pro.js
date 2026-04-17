#!/usr/bin/env node

/**
 * Generate a test Pro license for local development/testing.
 * Creates a valid encrypted license.json in ~/.brew-tui/
 *
 * Usage:
 *   node scripts/test-pro.js          # Create test Pro license
 *   node scripts/test-pro.js --clear  # Remove test license (back to Free)
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DATA_DIR = join(homedir(), '.brew-tui');
const LICENSE_PATH = join(DATA_DIR, 'license.json');

// Same encryption constants as src/lib/license/license-manager.ts
const ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1';
const SCRYPT_SALT = 'brew-tui-salt-v1';

function deriveKey() {
  return scryptSync(ENCRYPTION_SECRET, SCRYPT_SALT, 32);
}

function encrypt(data) {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

if (process.argv.includes('--clear')) {
  try {
    rmSync(LICENSE_PATH);
    console.log('\u2714 Test license removed. Back to Free tier.');
  } catch {
    console.log('No license file found.');
  }
  process.exit(0);
}

const license = {
  key: 'TEST-PRO-' + randomBytes(16).toString('hex'),
  instanceId: 'test-instance-' + randomBytes(8).toString('hex'),
  status: 'active',
  customerEmail: 'test@molinesdesigns.com',
  customerName: 'Test User',
  plan: 'pro',
  activatedAt: new Date().toISOString(),
  expiresAt: null,
  lastValidatedAt: new Date().toISOString(),
};

mkdirSync(DATA_DIR, { recursive: true });

const { encrypted, iv, tag } = encrypt(license);
const file = { version: 1, encrypted, iv, tag };
writeFileSync(LICENSE_PATH, JSON.stringify(file, null, 2), { mode: 0o600 });

console.log('\u2714 Test Pro license created');
console.log('');
console.log('  Email:     ' + license.customerEmail);
console.log('  Key:       ' + license.key.slice(0, 12) + '...');
console.log('  Path:      ' + LICENSE_PATH);
console.log('');
console.log('Now you can:');
console.log('  1. npm run dev           \u2192 TUI with all Pro features');
console.log('  2. Open BrewBar.app      \u2192 Should pass license check');
console.log('  3. brew-tui status       \u2192 Should show Plan: Pro');
console.log('');
console.log('To remove: node scripts/test-pro.js --clear');
