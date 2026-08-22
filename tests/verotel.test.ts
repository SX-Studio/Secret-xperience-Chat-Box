import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

describe('verotel signature', () => {
  it('matches the documented algorithm (case-insensitive sort, empties excluded)', async () => {
    const { signParams } = await import('@/lib/verotel');
    const params = { shopID: '136440', priceAmount: '5.00', type: 'purchase', Zeta: 'z', alpha: 'a', blank: '' };
    const expected = createHash('sha256')
      .update('KEY:alpha=a:priceAmount=5.00:shopID=136440:type=purchase:Zeta=z', 'utf8')
      .digest('hex')
      .toLowerCase();
    expect(signParams(params, 'KEY')).toBe(expected);
  });

  it('verifies a valid postback and rejects a tampered one', async () => {
    const { signParams, verifyPostback } = await import('@/lib/verotel');
    const p: Record<string, string> = { shopID: '136440', type: 'purchase', saleID: 'S1' };
    p.signature = signParams(p, 'KEY');
    expect(verifyPostback(p, 'KEY')).toBe(true);
    expect(verifyPostback({ ...p, saleID: 'TAMPERED' }, 'KEY')).toBe(false);
    expect(verifyPostback({ ...p, signature: '' }, 'KEY')).toBe(false);
  });
});
