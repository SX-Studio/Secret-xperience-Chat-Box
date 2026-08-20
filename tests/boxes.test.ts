import { describe, it, expect } from 'vitest';
import { validateBoxName } from '@/lib/boxes';

describe('validateBoxName', () => {
  it('trims and accepts a normal name', () => {
    expect(validateBoxName('  African Girls  ')).toBe('African Girls');
  });

  it('rejects empty / whitespace-only', () => {
    expect(() => validateBoxName('')).toThrow();
    expect(() => validateBoxName('   ')).toThrow();
  });

  it('rejects names over 120 chars', () => {
    expect(() => validateBoxName('x'.repeat(121))).toThrow();
    expect(validateBoxName('x'.repeat(120))).toHaveLength(120);
  });
});
