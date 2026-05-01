import { describe, it, expect } from 'vitest';
import { encryptPayload, decryptPayload } from './crypto.js';
import type { SyncPayload } from './types.js';

const SAMPLE_PAYLOAD: SyncPayload = {
  machines: {
    'machine-1': {
      machineId: 'machine-1',
      machineName: 'MacBook Pro',
      updatedAt: '2024-01-01T00:00:00.000Z',
      snapshot: {
        capturedAt: '2024-01-01T00:00:00.000Z',
        formulae: [{ name: 'git', version: '2.43.0', pinned: false }],
        casks: [{ name: 'visual-studio-code', version: '1.85.0' }],
        taps: ['homebrew/core'],
      },
    },
  },
};

const LICENSE_KEY = 'BTUI-TEST-1234-5678';

describe('sync crypto', () => {
  it('round-trip: encrypt then decrypt returns identical payload', () => {
    const { encrypted, iv, tag } = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);
    const decrypted = decryptPayload(encrypted, iv, tag, LICENSE_KEY);

    expect(decrypted).toEqual(SAMPLE_PAYLOAD);
  });

  it('round-trip preserves nested structures', () => {
    const { encrypted, iv, tag } = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);
    const decrypted = decryptPayload(encrypted, iv, tag, LICENSE_KEY);

    expect(decrypted.machines['machine-1']?.snapshot.formulae[0]?.name).toBe('git');
    expect(decrypted.machines['machine-1']?.snapshot.casks[0]?.name).toBe('visual-studio-code');
    expect(decrypted.machines['machine-1']?.snapshot.taps).toEqual(['homebrew/core']);
  });

  it('each encryption produces different ciphertext (random IV)', () => {
    const result1 = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);
    const result2 = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);

    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.encrypted).not.toBe(result2.encrypted);
  });

  it('tampered ciphertext throws on decryption (GCM tag mismatch)', () => {
    const { encrypted, iv, tag } = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);

    // Flip a byte in the ciphertext
    const buf = Buffer.from(encrypted, 'base64');
    buf[0] = buf[0]! ^ 0xff;
    const tampered = buf.toString('base64');

    expect(() => decryptPayload(tampered, iv, tag, LICENSE_KEY)).toThrow();
  });

  it('tampered tag throws on decryption', () => {
    const { encrypted, iv, tag } = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);

    // Flip a byte in the tag
    const tagBuf = Buffer.from(tag, 'base64');
    tagBuf[0] = tagBuf[0]! ^ 0xff;
    const tamperedTag = tagBuf.toString('base64');

    expect(() => decryptPayload(encrypted, iv, tamperedTag, LICENSE_KEY)).toThrow();
  });

  it('empty machines object round-trips correctly', () => {
    const empty: SyncPayload = { machines: {} };
    const { encrypted, iv, tag } = encryptPayload(empty, LICENSE_KEY);
    const decrypted = decryptPayload(encrypted, iv, tag, LICENSE_KEY);
    expect(decrypted).toEqual(empty);
  });

  it('a different license key cannot decrypt the same envelope', () => {
    const { encrypted, iv, tag } = encryptPayload(SAMPLE_PAYLOAD, LICENSE_KEY);
    expect(() => decryptPayload(encrypted, iv, tag, 'BTUI-OTHER-USER-9999')).toThrow();
  });
});
