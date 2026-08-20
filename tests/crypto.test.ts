import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';

// Deterministic 32-byte keys for the test run, set before importing the module.
beforeAll(() => {
  process.env.PHONE_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  process.env.PHONE_HASH_KEY = randomBytes(32).toString('hex');
});

describe('phone crypto', () => {
  it('encrypts and decrypts round-trip', async () => {
    const { encryptPhone, decryptPhone } = await import('@/lib/crypto');
    const phone = '+32470123456';
    const blob = encryptPhone(phone);
    expect(Buffer.isBuffer(blob)).toBe(true);
    expect(blob.toString('utf8')).not.toContain('470'); // ciphertext, not plaintext
    expect(decryptPhone(blob)).toBe(phone);
  });

  it('produces a stable, keyed hash for lookup', async () => {
    const { phoneHash } = await import('@/lib/crypto');
    const a = phoneHash('+32470123456');
    const b = phoneHash('+32470123456');
    const c = phoneHash('+32470999999');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalises to E.164 and rejects malformed input', async () => {
    const { toE164 } = await import('@/lib/crypto');
    expect(toE164(' +32 470 12 34 56 ')).toBe('+32470123456');
    expect(() => toE164('0470123456')).toThrow();
    expect(() => toE164('not-a-number')).toThrow();
  });

  it('two encryptions of the same phone differ (random IV)', async () => {
    const { encryptPhone } = await import('@/lib/crypto');
    expect(encryptPhone('+32470123456').equals(encryptPhone('+32470123456'))).toBe(false);
  });
});
