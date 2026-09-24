import { describe, expect, it } from 'vitest';
import { normalizeReportingFrameworkKeys } from '../../../lib/reportingFrameworkKeys.ts';

describe('normalizeReportingFrameworkKeys', () => {
  it('normalizes aliases and dedupes', () => {
    expect(normalizeReportingFrameworkKeys(['GRI', 'esrs', 'gri', 'TCFD'])).toEqual([
      'gri',
      'esrs_csrd',
      'tcfd',
    ]);
  });

  it('parses comma-separated strings', () => {
    expect(normalizeReportingFrameworkKeys('cdp, IFRS S2')).toEqual(['cdp', 'ifrs_s2']);
  });
});
