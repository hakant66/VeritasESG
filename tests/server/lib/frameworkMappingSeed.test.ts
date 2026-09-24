import { describe, expect, it } from 'vitest';
import { FRAMEWORK_MAPPING_SEED } from '../../../server/lib/frameworkMappingSeed.ts';

describe('FRAMEWORK_MAPPING_SEED', () => {
  it('includes TSRS frameworks in emissions mappings', () => {
    const scope1 = FRAMEWORK_MAPPING_SEED.find((m) => m.mappingId === 'emissions_scope1');
    const scope2 = FRAMEWORK_MAPPING_SEED.find((m) => m.mappingId === 'emissions_scope2');
    const scope3 = FRAMEWORK_MAPPING_SEED.find((m) => m.mappingId === 'emissions_scope3');
    const intensity = FRAMEWORK_MAPPING_SEED.find((m) => m.mappingId === 'emissions_intensity');

    expect(scope1?.frameworks.some((f) => f.frameworkId === 'tsrs_2')).toBe(true);
    expect(scope2?.frameworks.some((f) => f.frameworkId === 'tsrs_2')).toBe(true);
    expect(scope3?.frameworks.some((f) => f.frameworkId === 'tsrs_2')).toBe(true);
    expect(intensity?.frameworks.some((f) => f.frameworkId === 'tsrs_1')).toBe(true);
    expect(intensity?.frameworks.some((f) => f.frameworkId === 'tsrs_2')).toBe(true);
  });

  it('uses TSRS paragraph data point keys for climate metrics', () => {
    const scope1 = FRAMEWORK_MAPPING_SEED.find((m) => m.mappingId === 'emissions_scope1');
    const tsrs2 = scope1?.frameworks.find((f) => f.frameworkId === 'tsrs_2');
    expect(tsrs2?.dataPointKey).toBe('tsrs_2:Par.29a-i1');
  });
});
