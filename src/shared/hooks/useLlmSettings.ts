/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_LLM_SETTINGS,
  type LlmEmbeddingProviderId,
  type LlmProviderId,
  type LlmSettings,
} from '../../../lib/llmSettings.ts';
import { apiRequest } from '../../lib/apiClient.ts';
import { kbRagHealthQueryKey } from './useKbRagHealth.ts';

export type LlmSettingsResponse = {
  settings: LlmSettings;
  summary?: {
    textProvider: LlmProviderId;
    embeddingProvider: LlmEmbeddingProviderId;
    textConfigured: boolean;
    embeddingConfigured: boolean;
  };
};

export const llmSettingsQueryKey = ['admin', 'llm-settings'] as const;

export async function fetchLlmSettings(): Promise<LlmSettingsResponse> {
  return apiRequest<LlmSettingsResponse>('/api/admin/llm-settings');
}

export function useLlmSettings() {
  return useQuery({
    queryKey: llmSettingsQueryKey,
    queryFn: fetchLlmSettings,
    select: (data) => ({
      settings: { ...DEFAULT_LLM_SETTINGS, ...data.settings },
      summary: data.summary,
    }),
  });
}

export function useSaveLlmSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: LlmSettings) =>
      apiRequest<LlmSettingsResponse>('/api/admin/llm-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(llmSettingsQueryKey, data);
      void queryClient.invalidateQueries({ queryKey: kbRagHealthQueryKey });
    },
  });
}

export type OllamaHealthResult = {
  ok: boolean;
  models?: string[];
  runningModels?: Array<{ name: string; processor?: string }>;
  error?: string;
};

export function useOllamaHealthCheck() {
  return useMutation({
    mutationFn: (baseUrl: string) =>
      apiRequest<OllamaHealthResult>('/api/admin/llm-settings/ollama-health', {
        method: 'POST',
        body: JSON.stringify({ baseUrl }),
      }),
  });
}
