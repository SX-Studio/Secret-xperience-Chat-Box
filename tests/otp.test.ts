import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';

beforeAll(() => {
  process.env.SESSION_SECRET = randomBytes(32).toString('hex');
});

describe('otp', () => {
  it('generates a 6-digit numeric code', async () => {
    const { generateOtp } = await import('@/lib/auth/otp');
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it('hashes deterministically per phone+code', async () => {
    const { hashOtp } = await import('@/lib/auth/otp');
    const h = 'phonehash-abc';
    expect(hashOtp(h, '123456')).toBe(hashOtp(h, '123456'));
    expect(hashOtp(h, '123456')).not.toBe(hashOtp(h, '654321'));
    expect(hashOtp('other', '123456')).not.toBe(hashOtp(h, '123456'));
  });

  it('matches the right code and rejects the wrong one', async () => {
    const { hashOtp, otpMatches } = await import('@/lib/auth/otp');
    const stored = hashOtp('ph', '123456');
    expect(otpMatches('ph', '123456', stored)).toBe(true);
    expect(otpMatches('ph', '000000', stored)).toBe(false);
    expect(otpMatches('other', '123456', stored)).toBe(false);
  });
});
