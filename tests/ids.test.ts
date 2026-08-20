import { describe, it, expect } from 'vitest';
import { publicId } from '@/lib/ids';

describe('publicId', () => {
  it('uses the given prefix and default length', () => {
    const id = publicId('USR');
    expect(id).toMatch(/^USR-[0-9A-HJKMNP-TV-Z]{8}$/);
  });

  it('respects a custom length', () => {
    expect(publicId('BOX', 12).split('-')[1]).toHaveLength(12);
  });

  it('avoids ambiguous characters (I, L, O, U)', () => {
    const body = Array.from({ length: 50 }, () => publicId('CRT', 20).split('-')[1]).join('');
    expect(body).not.toMatch(/[ILOU]/);
  });

  it('is effectively unique across many draws', () => {
    const set = new Set(Array.from({ length: 5000 }, () => publicId('INV')));
    expect(set.size).toBe(5000);
  });
});
