import { createHmac, timingSafeEqual, randomInt } from 'crypto';
import { env } from '@/lib/env';

// A 6-digit numeric code. Stored only as a keyed HMAC, bound to the phone_hash so a
// code for one number can't be replayed against another.
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtp(phoneHash: string, code: string): string {
  return createHmac('sha256', env.sessionSecret()).update(`${phoneHash}:${code}`).digest('hex');
}

export function otpMatches(phoneHash: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(phoneHash, code));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
