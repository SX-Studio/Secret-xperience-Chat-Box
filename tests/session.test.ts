import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';

beforeAll(() => {
  process.env.SESSION_SECRET = randomBytes(32).toString('hex');
});

describe('session token', () => {
  it('signs and verifies a round-trip', async () => {
    const { signSession, verifySessionToken } = await import('@/lib/session');
    const token = signSession('account-123');
    const payload = verifySessionToken(token);
    expect(payload?.sub).toBe('account-123');
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a tampered payload', async () => {
    const { signSession, verifySessionToken } = await import('@/lib/session');
    const token = signSession('account-123');
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'attacker', exp: 9999999999 })).toString('base64url') + '.' + sig;
    expect(verifySessionToken(forged)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const { signSession, verifySessionToken } = await import('@/lib/session');
    const token = signSession('account-123', -10); // already expired
    expect(verifySessionToken(token)).toBeNull();
  });

  it('rejects garbage', async () => {
    const { verifySessionToken } = await import('@/lib/session');
    expect(verifySessionToken('not-a-token')).toBeNull();
    expect(verifySessionToken('')).toBeNull();
  });
});
