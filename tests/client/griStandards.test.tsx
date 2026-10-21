/**
 * Unit tests for the GRI Standards catalog (Horizon review, slide 11) and its
 * form-data parsing into Customer.griStandardCodes.
 */
import { describe, expect, it } from 'vitest';
import {
  GRI_STANDARDS,
  GRI_STANDARD_CATEGORY_ORDER,
  getGriStandardLabel,
  getGriStandardsByCategory,
} from '../../src/lib/griStandards';
import { griStandardCodesFromFormData } from '../../src/lib/customerFormFields';

describe('GRI_STANDARDS catalog', () => {
  it('has unique ids and covers all five categories', () => {
    const ids = GRI_STANDARDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    const categoriesPresent = new Set(GRI_STANDARDS.map((s) => s.category));
    for (const category of GRI_STANDARD_CATEGORY_ORDER) {
      expect(categoriesPresent.has(category)).toBe(true);
    }
  });

  it('distinguishes the two GRI 306 versions by id and year', () => {
    const gri306s = GRI_STANDARDS.filter((s) => s.code === 'GRI 306');
    expect(gri306s).toHaveLength(2);
    expect(gri306s.map((s) => s.year).sort()).toEqual(['2016', '2020']);
    expect(gri306s[0].id).not.toBe(gri306s[1].id);
  });

  it('getGriStandardsByCategory filters correctly', () => {
    const universal = getGriStandardsByCategory('universal');
    expect(universal.map((s) => s.code)).toEqual(['GRI 1', 'GRI 2', 'GRI 3']);
  });

  it('getGriStandardLabel formats as "code — name (year)"', () => {
    expect(getGriStandardLabel('gri_305_2016', 'en')).toBe('GRI 305 — Emissions (2016)');
    expect(getGriStandardLabel('gri_305_2016', 'tr')).toBe('GRI 305 — Emisyonlar (2016)');
  });

  it('getGriStandardLabel falls back to the raw id for an unknown code', () => {
    expect(getGriStandardLabel('not-a-real-id', 'en')).toBe('not-a-real-id');
  });
});

describe('griStandardCodesFromFormData', () => {
  it('reads all selected checkbox values', () => {
    const fd = new FormData();
    fd.append('griStandardCodes', 'gri_2_2021');
    fd.append('griStandardCodes', 'gri_305_2016');
    expect(griStandardCodesFromFormData(fd)).toEqual(['gri_2_2021', 'gri_305_2016']);
  });

  it('returns an empty array when nothing is selected', () => {
    expect(griStandardCodesFromFormData(new FormData())).toEqual([]);
  });
});
