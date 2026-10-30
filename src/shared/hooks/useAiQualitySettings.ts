/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_AI_QUALITY_SETTINGS, type AiQualitySettings } from '../../../lib/aiQualitySettings.ts';
import { apiRequest } from '../../lib/apiClient.ts';

export type AiQualitySettingsResponse = {
  settings: AiQualitySettings;
};

export const aiQualitySettingsQueryKey = ['admin', 'ai-quality-settings'] as const;

export async function fetchAiQualitySettings(): Promise<AiQualitySettingsResponse> {
  return apiRequest<AiQualitySettingsResponse>('/api/admin/ai-quality/settings');
}

export function useAiQualitySettings() {
  return useQuery({
    queryKey: aiQualitySettingsQueryKey,
    queryFn: fetchAiQualitySettings,
    select: (data) => ({
      settings: { ...DEFAULT_AI_QUALITY_SETTINGS, ...data.settings },
    }),
  });
}

export function useSaveAiQualitySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: AiQualitySettings) =>
      apiRequest<AiQualitySettingsResponse>('/api/admin/ai-quality/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(aiQualitySettingsQueryKey, data);
    },
  });
}
