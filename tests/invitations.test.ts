import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';

beforeAll(() => {
  process.env.SESSION_SECRET = randomBytes(32).toString('hex');
});

describe('invitation token', () => {
  it('generates URL-safe, unique tokens', async () => {
    const { generateInviteToken } = await import('@/lib/invitations');
    const set = new Set(Array.from({ length: 2000 }, () => generateInviteToken()));
    expect(set.size).toBe(2000);
    for (const t of set) expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes deterministically and distinctly', async () => {
    const { generateInviteToken, hashInviteToken } = await import('@/lib/invitations');
    const t = generateInviteToken();
    expect(hashInviteToken(t)).toBe(hashInviteToken(t));
    expect(hashInviteToken(t)).not.toBe(hashInviteToken(generateInviteToken()));
    expect(hashInviteToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });
});
