/**
 * Unit tests for the ESRS Standards catalog (Horizon review, slide 12) and
 * its admin-configurable enable/disable list.
 */
import { describe, expect, it } from 'vitest';
import {
  ESRS_STANDARDS,
  ESRS_STANDARD_CATEGORY_ORDER,
  getEsrsStandardLabel,
  getEsrsStandardsByCategory,
} from '../../src/lib/esrsStandards';
import { esrsStandardCodesFromFormData } from '../../src/lib/customerFormFields';

describe('ESRS_STANDARDS catalog', () => {
  it('includes the two foundational standards missing from the materiality ESRS_TOPICS enum', () => {
    const ids = ESRS_STANDARDS.map((s) => s.id);
    expect(ids).toContain('esrs_1');
    expect(ids).toContain('esrs_2');
  });

  it('has unique ids and covers all four categories', () => {
    const ids = ESRS_STANDARDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categoriesPresent = new Set(ESRS_STANDARDS.map((s) => s.category));
    for (const category of ESRS_STANDARD_CATEGORY_ORDER) {
      expect(categoriesPresent.has(category)).toBe(true);
    }
  });

  it('getEsrsStandardLabel formats as "code — name"', () => {
    expect(getEsrsStandardLabel('esrs_e1', 'en')).toBe('ESRS E1 — Climate Change');
    expect(getEsrsStandardLabel('esrs_1', 'tr')).toBe('ESRS 1 — Genel İlkeler');
  });

  it('getEsrsStandardsByCategory excludes disabled ids', () => {
    const all = getEsrsStandardsByCategory('environmental');
    expect(all.map((s) => s.id)).toContain('esrs_e1');

    const filtered = getEsrsStandardsByCategory('environmental', ['esrs_e1']);
    expect(filtered.map((s) => s.id)).not.toContain('esrs_e1');
    expect(filtered.length).toBe(all.length - 1);
  });
});

describe('esrsStandardCodesFromFormData', () => {
  it('reads all selected checkbox values', () => {
    const fd = new FormData();
    fd.append('esrsStandardCodes', 'esrs_1');
    fd.append('esrsStandardCodes', 'esrs_e1');
    expect(esrsStandardCodesFromFormData(fd)).toEqual(['esrs_1', 'esrs_e1']);
  });

  it('returns an empty array when nothing is selected', () => {
    expect(esrsStandardCodesFromFormData(new FormData())).toEqual([]);
  });
});
