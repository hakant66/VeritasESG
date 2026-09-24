import { describe, expect, it } from 'vitest';
import { parseNumericDataPointValue } from '../../../server/services/compliance/ConsistencyValidator.ts';

describe('parseNumericDataPointValue', () => {
  it('parses plain numbers', () => {
    expect(parseNumericDataPointValue(12500)).toBe(12500);
    expect(parseNumericDataPointValue('14200.5')).toBe(14200.5);
  });

  it('extracts numbers from narrative answers', () => {
    expect(parseNumericDataPointValue('12,500 tCO2e (2024)')).toBe(12500);
    expect(parseNumericDataPointValue('Scope 1: 980 tCO2e')).toBe(980);
  });

  it('returns null for non-numeric text', () => {
    expect(parseNumericDataPointValue('Metodoloji açıklaması')).toBeNull();
    expect(parseNumericDataPointValue('')).toBeNull();
  });
});
