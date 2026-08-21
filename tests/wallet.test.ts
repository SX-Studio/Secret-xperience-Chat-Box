import { describe, it, expect } from 'vitest';
import { validateTopUpAmount } from '@/lib/wallet';

describe('validateTopUpAmount', () => {
  it('accepts whole positive amounts', () => {
    expect(validateTopUpAmount('1000')).toBe(1000);
    expect(validateTopUpAmount(1)).toBe(1);
    expect(validateTopUpAmount(100000)).toBe(100000);
  });

  it('rejects zero, negatives, fractions, junk, and over-cap', () => {
    expect(() => validateTopUpAmount(0)).toThrow();
    expect(() => validateTopUpAmount(-5)).toThrow();
    expect(() => validateTopUpAmount(10.5)).toThrow();
    expect(() => validateTopUpAmount('abc')).toThrow();
    expect(() => validateTopUpAmount(100001)).toThrow();
  });
});
