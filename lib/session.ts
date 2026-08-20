import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

// Stateless signed session token: base64url(payload).base64url(HMAC). The payload
// carries only the account id and an expiry — roles are looked up fresh per request
// so they can't go stale. Pure functions here (no cookies) keep them unit-testable.
export const SESSION_COOKIE = 'cb_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type Payload = { sub: string; exp: number };

function sign(data: string): string {
  return createHmac('sha256', env.sessionSecret()).update(data).digest('base64url');
}

export function signSession(sub: string, ttlSeconds = SESSION_TTL_SECONDS): string {
  const payload: Payload = { sub, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): Payload | null {
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
    if (!p.sub || !p.exp || p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}
