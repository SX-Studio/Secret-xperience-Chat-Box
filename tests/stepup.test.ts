import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';

beforeAll(() => {
  process.env.SESSION_SECRET = randomBytes(32).toString('hex');
});

describe('admin step-up token', () => {
  it('signs and verifies for the right account', async () => {
    const { signStepUp, verifyStepUp } = await import('@/lib/stepup');
    const token = signStepUp('acc-1');
    expect(verifyStepUp(token, 'acc-1')).toBe(true);
  });

  it('rejects a token for a different account', async () => {
    const { signStepUp, verifyStepUp } = await import('@/lib/stepup');
    const token = signStepUp('acc-1');
    expect(verifyStepUp(token, 'acc-2')).toBe(false);
  });

  it('rejects expired, garbage, and missing tokens', async () => {
    const { signStepUp, verifyStepUp } = await import('@/lib/stepup');
    expect(verifyStepUp(signStepUp('acc-1', -10), 'acc-1')).toBe(false);
    expect(verifyStepUp('not-a-token', 'acc-1')).toBe(false);
    expect(verifyStepUp(undefined, 'acc-1')).toBe(false);
    expect(verifyStepUp('', 'acc-1')).toBe(false);
  });

  it('is not interchangeable with a session token (namespaced)', async () => {
    const { signSession } = await import('@/lib/session');
    const { verifyStepUp } = await import('@/lib/stepup');
    // A valid session token must NOT pass as a step-up token.
    expect(verifyStepUp(signSession('acc-1'), 'acc-1')).toBe(false);
  });
});
