/**
 * Seed data for framework mappings (equivalence relationships)
 */

import { makeTsrsDataPointKey } from './tsrsDataPointKey.ts';

export const FRAMEWORK_MAPPING_SEED = [
  {
    mappingId: 'emissions_scope1',
    mappingName: 'Scope 1 GHG Emissions Across Frameworks',
    equivalenceLevel: 'exact',
    varianceThresholdPercent: 5,
    varianceReasonGuide: [
      'Equity stake consolidation (subsidiaries >50%)',
      'Leased facility scope (lessee vs lessor)',
      'Excluded materials or operations',
      'Data quality / timing differences',
      'TSRS narrative answer vs structured emission ledger mismatch',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_1',
        indicatorName: 'Scope 1 GHG Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_1',
        indicatorName: 'Direct GHG Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'tcfd',
        indicatorId: 'tcfd_m1',
        indicatorName: 'Scope 1 Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'esrs_e1',
        indicatorId: 'esrs_e1_1',
        indicatorName: 'Scope 1 Emissions',
        dataPointKey: 'scope1_emissions',
      },
      {
        frameworkId: 'tsrs_2',
        indicatorId: 'tsrs_2_par_29a_i1',
        indicatorName: 'Par.29(a)(i) — Scope 1 GHG Emissions',
        dataPointKey: makeTsrsDataPointKey('tsrs_2', 'Par.29a-i1'),
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'tsrs_2', 'gri_305', 'esrs_e1', 'tcfd'],
      fallbackLogic: 'average',
    },
  },

  {
    mappingId: 'emissions_scope2',
    mappingName: 'Scope 2 GHG Emissions Across Frameworks',
    equivalenceLevel: 'near',
    varianceThresholdPercent: 8,
    varianceReasonGuide: [
      'Location-based vs market-based methodology',
      'Electricity grid mix changes',
      'Green power contract timing',
      'Renewable energy credits expiry',
      'TSRS Par.29(a)(v) location-based vs market-based Scope 2 split',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_2',
        indicatorName: 'Scope 2 GHG Emissions',
        dataPointKey: 'scope2_emissions',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_2',
        indicatorName: 'Indirect GHG Emissions',
        dataPointKey: 'scope2_emissions',
      },
      {
        frameworkId: 'tcfd',
        indicatorId: 'tcfd_m1',
        indicatorName: 'Scope 2 Emissions',
        dataPointKey: 'scope2_emissions',
      },
      {
        frameworkId: 'esrs_e1',
        indicatorId: 'esrs_e1_2',
        indicatorName: 'Scope 2 Emissions',
        dataPointKey: 'scope2_emissions',
      },
      {
        frameworkId: 'tsrs_2',
        indicatorId: 'tsrs_2_par_29a_i2',
        indicatorName: 'Par.29(a)(ii) — Scope 2 GHG Emissions',
        dataPointKey: makeTsrsDataPointKey('tsrs_2', 'Par.29a-i2'),
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'tsrs_2', 'gri_305', 'esrs_e1', 'tcfd'],
      fallbackLogic: 'average',
    },
  },

  {
    mappingId: 'emissions_scope3',
    mappingName: 'Scope 3 GHG Emissions Across Frameworks',
    equivalenceLevel: 'near',
    varianceThresholdPercent: 10,
    varianceReasonGuide: [
      'Incomplete Scope 3 category coverage',
      'Supplier data quality differences',
      'Reporting period alignment',
      'TSRS Par.29(a)(vi) boundary vs corporate inventory',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_3',
        indicatorName: 'Scope 3 GHG Emissions',
        dataPointKey: 'scope3_emissions',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_3',
        indicatorName: 'Other Indirect GHG Emissions',
        dataPointKey: 'scope3_emissions',
      },
      {
        frameworkId: 'tcfd',
        indicatorId: 'tcfd_m2',
        indicatorName: 'Scope 3 Emissions',
        dataPointKey: 'scope3_emissions',
      },
      {
        frameworkId: 'esrs_e1',
        indicatorId: 'esrs_e1_3',
        indicatorName: 'Scope 3 Emissions',
        dataPointKey: 'scope3_emissions',
      },
      {
        frameworkId: 'tsrs_2',
        indicatorId: 'tsrs_2_par_29a_vi',
        indicatorName: 'Par.29(a)(vi) — Scope 3 GHG Emissions',
        dataPointKey: makeTsrsDataPointKey('tsrs_2', 'Par.29a-vi'),
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'tsrs_2', 'gri_305', 'esrs_e1', 'tcfd'],
      fallbackLogic: 'average',
    },
  },

  {
    mappingId: 'emissions_intensity',
    mappingName: 'Emissions Intensity (per Revenue)',
    equivalenceLevel: 'near',
    varianceThresholdPercent: 8,
    varianceReasonGuide: [
      'Revenue definition (adjusted vs reported)',
      'Currency conversion differences',
      'Reporting period alignment',
      'Organic growth vs acquisition impacts',
      'TSRS 1 Par.45 aggregate metrics vs calculated intensity',
    ],
    frameworks: [
      {
        frameworkId: 'ifrs_s2',
        indicatorId: 'ifrs_s2_m1_4',
        indicatorName: 'Emissions Intensity',
        dataPointKey: 'emissions_intensity',
      },
      {
        frameworkId: 'gri_305',
        indicatorId: 'gri_305_4',
        indicatorName: 'GHG Emissions Intensity',
        dataPointKey: 'emissions_intensity',
      },
      {
        frameworkId: 'tsrs_2',
        indicatorId: 'tsrs_2_par_29a_ii',
        indicatorName: 'Par.29(a)(ii) — Emissions Intensity',
        dataPointKey: makeTsrsDataPointKey('tsrs_2', 'Par.29a-ii'),
      },
      {
        frameworkId: 'tsrs_1',
        indicatorId: 'tsrs_1_par_45',
        indicatorName: 'Par.45 — Sustainability Performance Metrics',
        dataPointKey: makeTsrsDataPointKey('tsrs_1', 'Par.45'),
      },
    ],
    reconciliationLogic: {
      priority: ['ifrs_s2', 'tsrs_2', 'gri_305', 'tsrs_1'],
      fallbackLogic: 'average',
    },
  },
];

export async function seedFrameworkMappings(): Promise<void> {
  try {
    const { upsertFrameworkMappingById } = await import('../data/seedDataAccess.ts');
    console.log('Upserting framework mappings...');
    for (const mapping of FRAMEWORK_MAPPING_SEED) {
      await upsertFrameworkMappingById(mapping.mappingId, mapping as Record<string, unknown>);
    }
    console.log(`✓ Upserted ${FRAMEWORK_MAPPING_SEED.length} framework mappings`);
  } catch (error) {
    console.error('Failed to seed framework mappings:', error);
    throw error;
  }
}
