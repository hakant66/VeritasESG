/**
 * Seed data for GFANZ climate pathways
 */

export const GFANZ_PATHWAYS = [
  {
    pathwayId: '1_5_degree',
    pathwayName: '1.5°C Net-Zero by 2050',
    description: 'Most ambitious pathway aligned with Paris Agreement 1.5°C limit',
    emissionsReduction2030: 45,
    emissionsReduction2050: 100,
    characteristics: {
      capexRequired: 'Very High',
      adoptionChallenge: 'High',
      technicalFeasibility: 'Medium (some tech still emerging)',
      economicFeasibility: 'Medium-High (long payback, but costs declining)',
    },
    sectorTargets: {
      power: '86% zero-carbon electricity by 2030',
      heavyIndustry: '23% emissions reduction by 2030',
      transport: '45% zero-emission vehicles by 2030',
    },
  },
  {
    pathwayId: '2_degree',
    pathwayName: '2°C Aligned (Net-Zero by 2070)',
    description: 'Balanced pathway meeting Paris Agreement 2°C target',
    emissionsReduction2030: 25,
    emissionsReduction2050: 75,
    characteristics: {
      capexRequired: 'High',
      adoptionChallenge: 'Medium',
      technicalFeasibility: 'High (mature technologies)',
      economicFeasibility: 'Medium (moderate payback)',
    },
    sectorTargets: {
      power: '69% zero-carbon by 2030',
      heavyIndustry: '10% reduction by 2030',
      transport: '25% zero-emission by 2030',
    },
  },
  {
    pathwayId: '3_plus_degree',
    pathwayName: '3°C+ (Business-as-Usual + Some Action)',
    description: 'Minimal decarbonization, warming 3°C+ by 2100',
    emissionsReduction2030: 5,
    emissionsReduction2050: 20,
    characteristics: {
      capexRequired: 'Low',
      adoptionChallenge: 'Low',
      technicalFeasibility: 'Very High',
      economicFeasibility: 'High (minimal investment)',
    },
    sectorTargets: {
      power: 'Minimal zero-carbon target',
      heavyIndustry: 'Minimal reduction',
      transport: 'Incremental improvements',
    },
  },
];

export async function seedGFANZPathways(): Promise<void> {
  try {
    const { countClimateScenarios, upsertClimateScenarioByPathwayId } = await import('../data/seedDataAccess.ts');
    const count = await countClimateScenarios();
    if (count > 0) {
      console.log(`✓ GFANZ pathways already seeded (${count} records). Skipping seed.`);
      return;
    }

    console.log('Seeding GFANZ pathways...');
    for (const pathway of GFANZ_PATHWAYS) {
      await upsertClimateScenarioByPathwayId(pathway.pathwayId, pathway as Record<string, unknown>);
    }
    console.log(`✓ Seeded ${GFANZ_PATHWAYS.length} GFANZ pathways`);
  } catch (error) {
    console.error('Failed to seed GFANZ pathways:', error);
    throw error;
  }
}
