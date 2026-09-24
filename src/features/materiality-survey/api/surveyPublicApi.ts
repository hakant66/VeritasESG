/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public (tokenized, no-login) API for the survey runner (Phase 3).
 */

import { apiRequest } from '../../../lib/apiClient.ts';

export interface PublicSurveyIro {
  id: string;
  topicRef: string;
  description: string;
  iroType: string;
  polarity: string;
}

export interface PublicSurveyResponse {
  id: string;
  iroId: string;
  stakeholderId: string;
  financialMaterialityScore: number;
  impactSeverityScore: number;
  impactScopeScore: number;
  impactProbabilityScore: number;
  irremediabilityScore?: number | null;
  freeTextComment: string;
}

export interface PublicSurveyContext {
  survey: { id: string; title: string; standardRef: string; scaleMax: number; status: string; deadline?: string | null };
  group: { name: string };
  stakeholder: { id: string; name: string; locale: 'tr' | 'en'; status: string; completedAt?: string | null };
  iros: PublicSurveyIro[];
  responses: PublicSurveyResponse[];
}

export interface ResponseDraft {
  iroId: string;
  financialMaterialityScore: number;
  impactSeverityScore: number;
  impactScopeScore: number;
  impactProbabilityScore: number;
  freeTextComment?: string;
}

export const getPublicSurvey = (token: string) =>
  apiRequest<PublicSurveyContext>(`/api/materiality/survey/${encodeURIComponent(token)}`);

export const submitResponses = (token: string, responses: ResponseDraft[], complete: boolean) =>
  apiRequest<{ saved: number; completed: boolean }>(
    `/api/materiality/survey/${encodeURIComponent(token)}/responses`,
    { method: 'POST', body: JSON.stringify({ responses, complete }) },
  );
