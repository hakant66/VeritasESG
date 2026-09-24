/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * API layer for the Materiality Survey module (Phase 2 admin CRUD).
 * Thin typed wrappers over apiRequest; the server unwraps { success, data }.
 */

import { apiRequest } from '../../../lib/apiClient.ts';

export type SurveyStatus = 'draft' | 'collecting' | 'scoring' | 'finalized';
export type IroType = 'impact' | 'risk' | 'opportunity';
export type ValueChainPosition = 'own_operations' | 'upstream' | 'downstream';
export type Polarity = 'positive' | 'negative';

export interface MaterialitySurvey {
  id: string;
  customerId: string;
  subeId?: string | null;
  title: string;
  standardRef: string;
  year?: number | null;
  status: SurveyStatus;
  deadline?: string | null;
  scaleMax: number;
  topicRollup: 'max' | 'weighted_avg';
  materialThreshold?: number | null;
  reminderCadence: number[];
  reminderCutoffDays: number;
  maxReminders: number;
  isTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
  counts?: { iros: number; groups: number; stakeholders: number };
}

export interface MaterialityIro {
  id: string;
  surveyId: string;
  topicRef: string;
  description: string;
  iroType: IroType;
  valueChainPosition: ValueChainPosition;
  polarity: Polarity;
  sasbRef?: string | null;
  esrsRef?: string | null;
  sortOrder: number;
}

export interface StakeholderGroup {
  id: string;
  surveyId: string;
  name: string;
  weight: number;
  sortOrder: number;
}

export interface Stakeholder {
  id: string;
  groupId: string;
  name: string;
  email: string;
  phone?: string | null;
  locale: 'tr' | 'en';
  inviteToken: string;
  status: 'invited' | 'reminded' | 'completed' | 'expired';
  invitedAt?: string | null;
  completedAt?: string | null;
}

const BASE = '/api/materiality/surveys';

// --- Surveys ---
export const listSurveys = (customerId: string) =>
  apiRequest<MaterialitySurvey[]>(`${BASE}?customerId=${encodeURIComponent(customerId)}`);

export const getSurvey = (id: string) => apiRequest<MaterialitySurvey>(`${BASE}/${id}`);

export const createSurvey = (input: Partial<MaterialitySurvey> & { customerId: string; title: string }) =>
  apiRequest<MaterialitySurvey>(BASE, { method: 'POST', body: JSON.stringify(input) });

export const updateSurvey = (id: string, patch: Partial<MaterialitySurvey>) =>
  apiRequest<MaterialitySurvey>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteSurvey = (id: string) =>
  apiRequest<{ id: string; deleted: boolean }>(`${BASE}/${id}`, { method: 'DELETE' });

/** Surveys flagged as reusable templates, across all customers. */
export const listTemplates = () => apiRequest<MaterialitySurvey[]>(`${BASE}?templates=true`);

/** Clone a survey's topics + IROs into a new draft survey for `customerId`. */
export const cloneSurvey = (id: string, input: { customerId: string; title: string }) =>
  apiRequest<MaterialitySurvey>(`${BASE}/${id}/clone`, { method: 'POST', body: JSON.stringify(input) });

export const importTopics = (id: string, csv: string) =>
  apiRequest<{ imported: number }>(`${BASE}/${id}/topics/import`, {
    method: 'POST',
    body: JSON.stringify({ csv }),
  });

// --- IROs ---
export const listIros = (id: string) => apiRequest<MaterialityIro[]>(`${BASE}/${id}/iros`);

export const createIro = (id: string, input: Partial<MaterialityIro> & { topicRef: string }) =>
  apiRequest<MaterialityIro>(`${BASE}/${id}/iros`, { method: 'POST', body: JSON.stringify(input) });

export const updateIro = (id: string, iroId: string, patch: Partial<MaterialityIro>) =>
  apiRequest<MaterialityIro>(`${BASE}/${id}/iros/${iroId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteIro = (id: string, iroId: string) =>
  apiRequest<{ id: string; deleted: boolean }>(`${BASE}/${id}/iros/${iroId}`, { method: 'DELETE' });

// --- Stakeholder groups ---
export const listGroups = (id: string) => apiRequest<StakeholderGroup[]>(`${BASE}/${id}/stakeholder-groups`);

export const createGroup = (id: string, input: { name: string; weight?: number; sortOrder?: number }) =>
  apiRequest<StakeholderGroup>(`${BASE}/${id}/stakeholder-groups`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateGroup = (id: string, groupId: string, patch: Partial<StakeholderGroup>) =>
  apiRequest<StakeholderGroup>(`${BASE}/${id}/stakeholder-groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteGroup = (id: string, groupId: string) =>
  apiRequest<{ id: string; deleted: boolean }>(`${BASE}/${id}/stakeholder-groups/${groupId}`, {
    method: 'DELETE',
  });

// --- Stakeholders ---
export interface StakeholderDraft {
  groupId: string;
  name?: string;
  email: string;
  phone?: string;
  locale?: 'tr' | 'en';
}

export const listStakeholders = (id: string) => apiRequest<Stakeholder[]>(`${BASE}/${id}/stakeholders`);

export const addStakeholders = (id: string, stakeholders: StakeholderDraft[]) =>
  apiRequest<{ added: number }>(`${BASE}/${id}/stakeholders`, {
    method: 'POST',
    body: JSON.stringify({ stakeholders }),
  });

// --- Invitations ---
export const sendInvitations = (id: string, onlyPending = false) =>
  apiRequest<{ sent: number; failed: number; total: number }>(`${BASE}/${id}/invite`, {
    method: 'POST',
    body: JSON.stringify({ onlyPending }),
  });

// --- Matrix / results ---
export interface MatrixTopic {
  topicRef: string;
  subject: string;
  griMapping: string;
  disclosures: string;
  financial: number;
  impact: number;
  responseCount: number;
  isMaterial: boolean;
  financialAvg: number;
  severityAvg: number;
  scopeAvg: number;
  probabilityAvg: number;
}

export interface MatrixResponse {
  survey: { id: string; title: string; scaleMax: number; topicRollup: string; materialThreshold: number | null };
  topics: MatrixTopic[];
  iros: Array<{ iroId: string; topicRef: string; responseCount: number; financial: number; impact: number }>;
}

export const getMatrix = (id: string) => apiRequest<MatrixResponse>(`${BASE}/${id}/matrix`);
