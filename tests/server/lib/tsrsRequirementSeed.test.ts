import { describe, expect, it } from 'vitest';
import {
  TSRS_1_REQUIREMENT_DEFS,
  TSRS_2_REQUIREMENT_DEFS,
  TSRS_FRAMEWORK_REQUIREMENTS_SEED,
} from '../../../server/lib/tsrsRequirementSeed.ts';
import { makeTsrsDataPointKey } from '../../../server/lib/tsrsDataPointKey.ts';

const KIMYA_TSRS1_REFS = [
  'Ek D',
  'Par.20',
  'Par.21',
  'Par.26',
  'Par.27a-v',
  'Par.27b',
  'Par.28',
  'Par.32',
  'Par.33',
  'Par.43',
  'Par.44',
  'Par.45',
  'Par.64',
  'Par.83',
];

const KIMYA_TSRS2_REFS = [
  'Par.10',
  'Par.14a',
  'Par.14a-ii',
  'Par.29a',
  'Par.29a-i1',
  'Par.29a-i2',
  'Par.29a-ii',
  'Par.29a-iii',
  'Par.29a-v',
  'Par.29a-vi',
  'Par.29e',
  'Par.29g',
  'Par.6a-ii',
  'Par.B27',
];

describe('TSRS framework requirement seed', () => {
  it('covers every Kimya template TSRS 1 paragraph ref', () => {
    const seededRefs = TSRS_1_REQUIREMENT_DEFS.map((item) => item.paragraphRef).sort();
    expect(seededRefs).toEqual([...KIMYA_TSRS1_REFS].sort());
  });

  it('covers every Kimya template TSRS 2 paragraph ref', () => {
    const seededRefs = TSRS_2_REQUIREMENT_DEFS.map((item) => item.paragraphRef).sort();
    expect(seededRefs).toEqual([...KIMYA_TSRS2_REFS].sort());
  });

  it('builds tsrs-prefixed data point keys for each requirement', () => {
    for (const req of TSRS_FRAMEWORK_REQUIREMENTS_SEED) {
      expect(req.dataPointKeys).toHaveLength(1);
      expect(req.dataPointKeys[0]).toBe(
        makeTsrsDataPointKey(req.frameworkId, req.paragraphRef)
      );
      expect(req.disclosureId).toMatch(/^tsrs_[12]_/);
      expect(req.mandatory).toBe(true);
    }
  });

  it('includes emission fallbacks for scope disclosure paragraphs', () => {
    const scope1 = TSRS_FRAMEWORK_REQUIREMENTS_SEED.find(
      (item) => item.disclosureId === 'tsrs_2_par_29a_i1'
    );
    expect(scope1?.alternateDataKeys).toContain('scope1_emissions');
  });
});
