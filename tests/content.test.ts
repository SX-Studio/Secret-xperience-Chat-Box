import { describe, it, expect } from 'vitest';
import { validateContentInput, extForMime } from '@/lib/content';

describe('validateContentInput', () => {
  it('trims title and coerces integer price', () => {
    expect(validateContentInput('  Nairobi Weekend ', '250')).toEqual({ title: 'Nairobi Weekend', price: 250 });
    expect(validateContentInput('Free set', 0)).toEqual({ title: 'Free set', price: 0 });
  });

  it('rejects empty / overlong titles', () => {
    expect(() => validateContentInput('', 10)).toThrow();
    expect(() => validateContentInput('x'.repeat(121), 10)).toThrow();
  });

  it('rejects invalid prices', () => {
    expect(() => validateContentInput('ok', -1)).toThrow();
    expect(() => validateContentInput('ok', 1.5)).toThrow();
    expect(() => validateContentInput('ok', 'abc')).toThrow();
    expect(() => validateContentInput('ok', 100001)).toThrow();
  });
});

describe('extForMime', () => {
  it('maps mime types to extensions', () => {
    expect(extForMime('image/png')).toBe('png');
    expect(extForMime('image/webp')).toBe('webp');
    expect(extForMime('image/jpeg')).toBe('jpg');
  });
});
