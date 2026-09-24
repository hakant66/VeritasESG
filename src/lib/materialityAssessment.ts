/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ESG_MATERIALITY_TOPIC_IDS,
  MATERIALITY_TOPIC_DEFAULT_SCORES,
  type EsgMaterialityTopicId,
} from '../data/esgMaterialityTopics';
import type { MaterialityAssessment, MaterialityTopicScore } from '../types';

export const MATERIALITY_SCORE_MIN = 1;
export const MATERIALITY_SCORE_MAX = 5;
export const DEFAULT_MATERIALITY_SCORE = 3;

export function clampMaterialityScore(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MATERIALITY_SCORE;
  return Math.min(MATERIALITY_SCORE_MAX, Math.max(MATERIALITY_SCORE_MIN, Math.round(value)));
}

export function parseMaterialityScoreInput(value: string): number {
  return clampMaterialityScore(Number(value));
}

export function isTopicMaterial(score: MaterialityTopicScore): boolean {
  return (
    score.financialImpact >= 4 ||
    score.impactSeverity >= 4 ||
    score.stakeholderConcern >= 4
  );
}

/** X: finansal etki, Y: etki şiddeti (matris görseli). */
export function matrixCoordinates(score: MaterialityTopicScore): { x: number; y: number } {
  return {
    x: clampMaterialityScore(score.financialImpact),
    y: clampMaterialityScore(score.impactSeverity),
  };
}

export function defaultMaterialityScores(): Record<EsgMaterialityTopicId, MaterialityTopicScore> {
  return ESG_MATERIALITY_TOPIC_IDS.reduce(
    (acc, id) => {
      const preset = MATERIALITY_TOPIC_DEFAULT_SCORES[id];
      acc[id] = {
        financialImpact: clampMaterialityScore(preset.financialImpact),
        impactSeverity: clampMaterialityScore(preset.impactSeverity),
        probability: clampMaterialityScore(preset.probability),
        stakeholderConcern: clampMaterialityScore(preset.stakeholderConcern),
      };
      return acc;
    },
    {} as Record<EsgMaterialityTopicId, MaterialityTopicScore>,
  );
}

export function materialityScoresFromCustomer(
  assessment?: MaterialityAssessment | null,
): Record<EsgMaterialityTopicId, MaterialityTopicScore> {
  const base = defaultMaterialityScores();
  if (!assessment?.scores) return base;
  for (const id of ESG_MATERIALITY_TOPIC_IDS) {
    const saved = assessment.scores[id];
    if (saved) {
      base[id] = {
        financialImpact: clampMaterialityScore(saved.financialImpact),
        impactSeverity: clampMaterialityScore(saved.impactSeverity),
        probability: clampMaterialityScore(saved.probability),
        stakeholderConcern: clampMaterialityScore(saved.stakeholderConcern),
      };
    }
  }
  return base;
}

export function materialityAssessmentFromFormData(formData: FormData): MaterialityAssessment {
  const scores: MaterialityAssessment['scores'] = {};
  for (const id of ESG_MATERIALITY_TOPIC_IDS) {
    scores[id] = {
      financialImpact: parseMaterialityScoreInput(String(formData.get(`mat_${id}_financial`) ?? '')),
      impactSeverity: parseMaterialityScoreInput(String(formData.get(`mat_${id}_severity`) ?? '')),
      probability: parseMaterialityScoreInput(String(formData.get(`mat_${id}_probability`) ?? '')),
      stakeholderConcern: parseMaterialityScoreInput(String(formData.get(`mat_${id}_stakeholder`) ?? '')),
    };
  }
  return { scores, updatedAt: Date.now() };
}
