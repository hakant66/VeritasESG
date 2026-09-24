/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ESG_MATERIALITY_TOPIC_IDS = [
  'biodiversity',
  'businessEthics',
  'climateChange',
  'laborPractices',
  'communityImpact',
  'dataPrivacy',
  'energyManagement',
  'humanRights',
  'productSafety',
  'supplyChain',
  'wasteManagement',
  'waterManagement',
] as const;

export type EsgMaterialityTopicId = (typeof ESG_MATERIALITY_TOPIC_IDS)[number];

/** Demo / yeni firma için başlangıç puanları (ekran görüntüsü ile uyumlu). */
export const MATERIALITY_TOPIC_DEFAULT_SCORES: Record<
  EsgMaterialityTopicId,
  {
    financialImpact: number;
    impactSeverity: number;
    probability: number;
    stakeholderConcern: number;
  }
> = {
  biodiversity: { financialImpact: 3, impactSeverity: 4, probability: 1, stakeholderConcern: 5 },
  businessEthics: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  climateChange: { financialImpact: 5, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  laborPractices: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 4 },
  communityImpact: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  dataPrivacy: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  energyManagement: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  humanRights: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  productSafety: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  supplyChain: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  wasteManagement: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
  waterManagement: { financialImpact: 3, impactSeverity: 3, probability: 3, stakeholderConcern: 3 },
};
