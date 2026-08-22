import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

// Short-lived, HMAC-signed proof of a fresh fingerprint (WebAuthn) unlock for a
// specific account. Mirrors lib/session.ts (pure, unit-testable) but namespaced so
// a session token can never be replayed as a step-up token.
export const STEPUP_COOKIE = 'cb_stepup';
export const STEPUP_TTL_SECONDS = 30 * 60; // 30 minutes

type Payload = { sub: string; exp: number };

function sign(data: string): string {
  return createHmac('sha256', env.sessionSecret()).update(`stepup:${data}`).digest('base64url');
}

export function signStepUp(sub: string, ttlSeconds = STEPUP_TTL_SECONDS): string {
  const payload: Payload = { sub, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

// Valid only if the signature checks out, it hasn't expired, AND it belongs to the
// expected account.
export function verifyStepUp(token: string | undefined | null, expectedSub: string): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
    if (!p.sub || !p.exp || p.exp < Math.floor(Date.now() / 1000)) return false;
    return p.sub === expectedSub;
  } catch {
    return false;
  }
}
