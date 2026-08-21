import { describe, it, expect } from 'vitest';
import { validateReportReason } from '@/lib/reports';

describe('validateReportReason', () => {
  it('trims and accepts a normal reason', () => {
    expect(validateReportReason('  Underage-looking  ')).toBe('Underage-looking');
  });
  it('rejects too short / too long', () => {
    expect(() => validateReportReason('ab')).toThrow();
    expect(() => validateReportReason('')).toThrow();
    expect(() => validateReportReason('x'.repeat(81))).toThrow();
  });
});
