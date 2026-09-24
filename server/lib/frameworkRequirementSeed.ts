/**
 * Seed data for framework requirements.
 * References IFRS S2, GRI 305, ESRS E1, TCFD standards.
 */

import { seedTsrsFrameworkRequirements } from './tsrsRequirementSeed.ts';

export const FRAMEWORK_REQUIREMENTS_SEED = [
  // ============================================
  // IFRS S2 REQUIREMENTS (Climate-Related)
  // ============================================
  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'governance',
    topicName: 'Governance',
    disclosureId: 'ifrs_s2_g1_1',
    disclosureName: 'Board oversight of climate-related risks and opportunities',
    dataPointKeys: ['board_climate_committee'],
    description:
      'Describe the board-level governance structure for overseeing climate-related risks and opportunities.',
    guidance:
      'Provide details of board committee responsibilities, committee composition, ' +
      'how the board is informed, frequency of discussions, etc.',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'governance',
    topicName: 'Governance',
    disclosureId: 'ifrs_s2_g1_2',
    disclosureName: 'Management-level governance structure',
    dataPointKeys: ['governance_structure'],
    description: 'Describe the management-level roles and responsibilities for climate matters.',
    guidance: 'Explain which executive has responsibility, reporting lines, compensation links, etc.',
    materiality: false,
    priority: 'high',
    mandatory: true
  },

  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'strategy',
    topicName: 'Strategy',
    disclosureId: 'ifrs_s2_s1_1',
    disclosureName: 'Climate-related risks and opportunities identified',
    dataPointKeys: [],
    description: 'Describe climate-related risks and opportunities identified over short, medium, and long term.',
    guidance:
      'Consider transition risks (policy, technology, market, reputational) and physical risks. ' +
      'Reference climate scenario analysis (1.5°C, 2°C, 3°C+).',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'ifrs_s2_m1_1',
    disclosureName: 'Scope 1 GHG emissions',
    dataPointKeys: ['scope1_emissions'],
    description: 'Disclose absolute Scope 1 GHG emissions (tCO2e) for the reporting period.',
    guidance: 'Use GHG Protocol or local standard. Include all direct emissions from operations.',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'ifrs_s2_m1_2',
    disclosureName: 'Scope 2 GHG emissions',
    dataPointKeys: ['scope2_emissions'],
    description: 'Disclose absolute Scope 2 GHG emissions (tCO2e) for the reporting period.',
    guidance:
      'Include both location-based and market-based if applicable. ' +
      'Scope 2 = indirect emissions from purchased electricity, steam, etc.',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'ifrs_s2_m1_3',
    disclosureName: 'Emissions intensity',
    dataPointKeys: ['emissions_intensity'],
    description: 'Disclose GHG emissions intensity (emissions per unit of revenue or production).',
    guidance: 'Normalize by revenue, production volume, or other relevant unit.',
    materiality: false,
    priority: 'high',
    mandatory: true
  },

  {
    frameworkId: 'ifrs_s2',
    frameworkName: 'IFRS S2 (Climate-Related)',
    version: '2023',
    topicId: 'risk_management',
    topicName: 'Risk Management',
    disclosureId: 'ifrs_s2_rm1_1',
    disclosureName: 'Climate risk identification and assessment process',
    dataPointKeys: [],
    description:
      'Describe processes used to identify, assess, and manage climate-related risks and opportunities.',
    guidance: 'Include time horizons (short/medium/long term), methodologies, and integration with enterprise risk.',
    materiality: false,
    priority: 'high',
    mandatory: true
  },

  // ============================================
  // GRI 305 REQUIREMENTS (Emissions)
  // ============================================
  {
    frameworkId: 'gri_305',
    frameworkName: 'GRI 305 (Emissions)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'gri_305_1',
    disclosureName: 'Direct (Scope 1) GHG emissions',
    dataPointKeys: ['scope1_emissions'],
    description: 'Report direct GHG emissions from owned or controlled sources.',
    guidance: 'Must use GHG Protocol Scope 1 definition. Report in metric tCO2e.',
    materiality: true,
    materialityTopic: 'emissions',
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'gri_305',
    frameworkName: 'GRI 305 (Emissions)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'gri_305_2',
    disclosureName: 'Scope 2 GHG emissions',
    dataPointKeys: ['scope2_emissions'],
    description: 'Report indirect GHG emissions from purchased electricity, steam, heating, cooling.',
    guidance: 'Report both location-based and market-based. Use GHG Protocol Scope 2 definition.',
    materiality: true,
    materialityTopic: 'emissions',
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'gri_305',
    frameworkName: 'GRI 305 (Emissions)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'gri_305_3',
    disclosureName: 'Scope 3 GHG emissions',
    dataPointKeys: ['scope3_emissions'],
    description: 'Report indirect GHG emissions from business activities not owned/controlled.',
    guidance: 'Include supply chain, logistics, business travel, employee commuting per GHG Protocol.',
    materiality: true,
    materialityTopic: 'emissions',
    priority: 'high',
    mandatory: true
  },

  {
    frameworkId: 'gri_305',
    frameworkName: 'GRI 305 (Emissions)',
    version: '2023',
    topicId: 'emissions',
    topicName: 'Emissions',
    disclosureId: 'gri_305_4',
    disclosureName: 'GHG emissions intensity',
    dataPointKeys: ['emissions_intensity'],
    description: 'Report emissions intensity (gross Scope 1+2 per unit of activity).',
    guidance: 'Normalize by production volume, revenue, or number of employees.',
    materiality: true,
    materialityTopic: 'emissions',
    priority: 'high',
    mandatory: true
  },

  // ============================================
  // ESRS E1 REQUIREMENTS (Climate Change)
  // ============================================
  {
    frameworkId: 'esrs_e1',
    frameworkName: 'ESRS E1 (Climate Change)',
    version: '2023',
    topicId: 'climate_mitigation',
    topicName: 'Climate Mitigation',
    disclosureId: 'esrs_e1_1',
    disclosureName: 'GHG emissions (Scope 1, 2, 3)',
    dataPointKeys: ['scope1_emissions', 'scope2_emissions', 'scope3_emissions'],
    description:
      'Report GHG emissions by scope following GHG Protocol. ' + 'Scope 1 + 2 required; Scope 3 if material.',
    guidance: 'Report absolute emissions and intensity. Include base year and targets.',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'esrs_e1',
    frameworkName: 'ESRS E1 (Climate Change)',
    version: '2023',
    topicId: 'climate_mitigation',
    topicName: 'Climate Mitigation',
    disclosureId: 'esrs_e1_2',
    disclosureName: 'Climate transition plan',
    dataPointKeys: [],
    description:
      'Describe transition plan aligned with Paris Agreement 1.5°C or 2°C targets. ' +
      'Include targets, timelines, and governance.',
    guidance: 'Cover Scope 1, 2, and material Scope 3. Detail decarbonization strategies and financial impact.',
    materiality: false,
    priority: 'high',
    mandatory: true
  },

  {
    frameworkId: 'esrs_e1',
    frameworkName: 'ESRS E1 (Climate Change)',
    version: '2023',
    topicId: 'climate_adaptation',
    topicName: 'Climate Adaptation',
    disclosureId: 'esrs_e1_3',
    disclosureName: 'Physical climate risks and adaptation',
    dataPointKeys: [],
    description: 'Describe physical climate risks to operations and value chain. Detail adaptation measures.',
    guidance: 'Assess acute risks (extreme weather) and chronic risks (sea level rise, changing precipitation).',
    materiality: true,
    materialityTopic: 'climate_change',
    priority: 'high',
    mandatory: true
  },

  // ============================================
  // TCFD RECOMMENDATIONS
  // ============================================
  {
    frameworkId: 'tcfd',
    frameworkName: 'TCFD (Climate-Related Financial Disclosures)',
    version: '2023',
    topicId: 'governance',
    topicName: 'Governance',
    disclosureId: 'tcfd_g1',
    disclosureName: 'Board oversight of climate issues',
    dataPointKeys: ['board_climate_committee'],
    description: 'Describe board-level governance of climate-related risks and opportunities.',
    guidance: 'Explain how governance structure oversees and manages climate issues.',
    materiality: false,
    priority: 'high',
    mandatory: true
  },

  {
    frameworkId: 'tcfd',
    frameworkName: 'TCFD (Climate-Related Financial Disclosures)',
    version: '2023',
    topicId: 'governance',
    topicName: 'Governance',
    disclosureId: 'tcfd_g2',
    disclosureName: 'Management roles and responsibilities',
    dataPointKeys: [],
    description: 'Describe management roles in assessing and managing climate-related risks.',
    guidance: 'Include C-suite accountability and integration with company strategy.',
    materiality: false,
    priority: 'high',
    mandatory: true
  },

  {
    frameworkId: 'tcfd',
    frameworkName: 'TCFD (Climate-Related Financial Disclosures)',
    version: '2023',
    topicId: 'strategy',
    topicName: 'Strategy',
    disclosureId: 'tcfd_s1',
    disclosureName: 'Climate-related risks and opportunities identified',
    dataPointKeys: [],
    description: 'Describe climate-related risks and opportunities identified and their impact on business.',
    guidance: 'Include transition and physical risks across value chain.',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'tcfd',
    frameworkName: 'TCFD (Climate-Related Financial Disclosures)',
    version: '2023',
    topicId: 'metrics',
    topicName: 'Metrics & Targets',
    disclosureId: 'tcfd_m1',
    disclosureName: 'GHG emissions (Scope 1 & 2)',
    dataPointKeys: ['scope1_emissions', 'scope2_emissions'],
    description: 'Disclose Scope 1 and 2 GHG emissions and intensity.',
    guidance: 'Report in absolute tCO2e and per unit of revenue/production.',
    materiality: false,
    priority: 'critical',
    mandatory: true
  },

  {
    frameworkId: 'tcfd',
    frameworkName: 'TCFD (Climate-Related Financial Disclosures)',
    version: '2023',
    topicId: 'metrics',
    topicName: 'Metrics & Targets',
    disclosureId: 'tcfd_m2',
    disclosureName: 'Emissions reduction targets',
    dataPointKeys: [],
    description: 'Describe climate-related targets aligned with science (e.g., 1.5°C, 2°C pathway).',
    guidance: 'Include 2030 and longer-term targets. Document SBT status if applicable.',
    materiality: false,
    priority: 'high',
    mandatory: true
  }
];

/**
 * Helper: Import and seed in startup or migration
 */
export async function seedFrameworkRequirements(): Promise<void> {
  try {
    const {
      countFrameworkRequirements,
      upsertFrameworkRequirementByDisclosureId,
    } = await import('../data/seedDataAccess.ts');
    const count = await countFrameworkRequirements();
    if (count === 0) {
      console.log('Seeding framework requirements...');
      for (const req of FRAMEWORK_REQUIREMENTS_SEED) {
        await upsertFrameworkRequirementByDisclosureId(req.disclosureId, req as Record<string, unknown>);
      }
      console.log(`✓ Seeded ${FRAMEWORK_REQUIREMENTS_SEED.length} framework requirements`);
    } else {
      console.log(`✓ Framework requirements already seeded (${count} records). Skipping base seed.`);
    }

    const tsrsCount = await seedTsrsFrameworkRequirements();
    console.log(`✓ TSRS framework requirements upserted (${tsrsCount} records)`);
  } catch (error) {
    console.error('Failed to seed framework requirements:', error);
    throw error;
  }
}
