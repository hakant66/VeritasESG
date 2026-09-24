/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * React-query hooks for the Materiality Survey module.
 * Query keys: ['materiality-survey', <sub>, ...args]; invalidate by prefix.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/surveysApi.ts';

const ROOT = 'materiality-survey';

export const surveyKeys = {
  all: [ROOT] as const,
  list: (customerId: string) => [ROOT, 'list', customerId] as const,
  templates: [ROOT, 'templates'] as const,
  detail: (id: string) => [ROOT, 'detail', id] as const,
  iros: (id: string) => [ROOT, 'iros', id] as const,
  groups: (id: string) => [ROOT, 'groups', id] as const,
  stakeholders: (id: string) => [ROOT, 'stakeholders', id] as const,
  matrix: (id: string) => [ROOT, 'matrix', id] as const,
};

// --- Queries ---

export function useSurveys(customerId: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.list(customerId ?? ''),
    queryFn: () => api.listSurveys(customerId!),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: surveyKeys.templates,
    queryFn: () => api.listTemplates(),
    staleTime: 30_000,
  });
}

export function useSurvey(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.detail(id ?? ''),
    queryFn: () => api.getSurvey(id!),
    enabled: Boolean(id),
  });
}

export function useIros(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.iros(id ?? ''),
    queryFn: () => api.listIros(id!),
    enabled: Boolean(id),
  });
}

export function useGroups(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.groups(id ?? ''),
    queryFn: () => api.listGroups(id!),
    enabled: Boolean(id),
  });
}

export function useStakeholders(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.stakeholders(id ?? ''),
    queryFn: () => api.listStakeholders(id!),
    enabled: Boolean(id),
  });
}

export function useMatrix(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.matrix(id ?? ''),
    queryFn: () => api.getMatrix(id!),
    enabled: Boolean(id),
  });
}

// --- Mutations (invalidate the whole feature subtree for simplicity) ---

export function useSurveyMutations(customerId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: surveyKeys.all });

  const createSurvey = useMutation({
    mutationFn: (input: Parameters<typeof api.createSurvey>[0]) => api.createSurvey(input),
    onSuccess: invalidate,
  });
  const updateSurvey = useMutation({
    mutationFn: (args: { id: string; patch: Parameters<typeof api.updateSurvey>[1] }) =>
      api.updateSurvey(args.id, args.patch),
    onSuccess: invalidate,
  });
  const removeSurvey = useMutation({
    mutationFn: (id: string) => api.deleteSurvey(id),
    onSuccess: invalidate,
  });
  const cloneSurvey = useMutation({
    mutationFn: (args: { id: string; customerId: string; title: string }) =>
      api.cloneSurvey(args.id, { customerId: args.customerId, title: args.title }),
    onSuccess: invalidate,
  });

  return { createSurvey, updateSurvey, removeSurvey, cloneSurvey, customerId };
}

export function useSurveyChildMutations(surveyId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: surveyKeys.all });

  return {
    importTopics: useMutation({
      mutationFn: (csv: string) => api.importTopics(surveyId, csv),
      onSuccess: invalidate,
    }),
    createIro: useMutation({
      mutationFn: (input: Parameters<typeof api.createIro>[1]) => api.createIro(surveyId, input),
      onSuccess: invalidate,
    }),
    deleteIro: useMutation({
      mutationFn: (iroId: string) => api.deleteIro(surveyId, iroId),
      onSuccess: invalidate,
    }),
    createGroup: useMutation({
      mutationFn: (input: Parameters<typeof api.createGroup>[1]) => api.createGroup(surveyId, input),
      onSuccess: invalidate,
    }),
    deleteGroup: useMutation({
      mutationFn: (groupId: string) => api.deleteGroup(surveyId, groupId),
      onSuccess: invalidate,
    }),
    addStakeholders: useMutation({
      mutationFn: (list: api.StakeholderDraft[]) => api.addStakeholders(surveyId, list),
      onSuccess: invalidate,
    }),
    sendInvitations: useMutation({
      mutationFn: (onlyPending: boolean) => api.sendInvitations(surveyId, onlyPending),
      onSuccess: invalidate,
    }),
  };
}
