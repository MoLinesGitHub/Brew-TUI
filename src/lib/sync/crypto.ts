import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { SyncPayload } from './types.js';

// Cross-machine sync encryption — shared secret (no machine binding by design,
// the same user's machines must decrypt each other's payloads).
const ENCRYPTION_SECRET = 'brew-tui-sync-aes256gcm-v1';
const SCRYPT_SALT = 'brew-tui-sync-salt-v1';

// Lazy derivation — scryptSync is CPU-intensive and should not block on import.
let _derivedKey: Buffer | null = null;

function deriveEncryptionKey(): Buffer {
  if (!_derivedKey) {
    _derivedKey = scryptSync(ENCRYPTION_SECRET, SCRYPT_SALT, 32, {
      N: 16384,
      r: 8,
      p: 1,
    });
  }
  return _derivedKey;
}

export function encryptPayload(data: SyncPayload): { encrypted: string; iv: string; tag: string } {
  const key = deriveEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
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

export function decryptPayload(encrypted: string, iv: string, tag: string): SyncPayload {
  const key = deriveEncryptionKey();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf-8')) as SyncPayload;
}
