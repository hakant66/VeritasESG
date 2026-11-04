/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_KNOWLEDGE_CHAT_ENGINE_SETTINGS,
  type KnowledgeChatEngineSettings,
} from '../../../lib/knowledgeChatEngineSettings.ts';
import { apiRequest } from '../../lib/apiClient.ts';

export type KnowledgeChatEngineSettingsResponse = {
  settings: KnowledgeChatEngineSettings;
};

export const knowledgeChatEngineSettingsQueryKey = ['admin', 'knowledge-chat-engine-settings'] as const;

export async function fetchKnowledgeChatEngineSettings(): Promise<KnowledgeChatEngineSettingsResponse> {
  return apiRequest<KnowledgeChatEngineSettingsResponse>('/api/admin/knowledge-chat-engine/settings');
}

export function useKnowledgeChatEngineSettings() {
  return useQuery({
    queryKey: knowledgeChatEngineSettingsQueryKey,
    queryFn: fetchKnowledgeChatEngineSettings,
    select: (data) => ({
      settings: { ...DEFAULT_KNOWLEDGE_CHAT_ENGINE_SETTINGS, ...data.settings },
    }),
  });
}

export function useSaveKnowledgeChatEngineSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: KnowledgeChatEngineSettings) =>
      apiRequest<KnowledgeChatEngineSettingsResponse>('/api/admin/knowledge-chat-engine/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(knowledgeChatEngineSettingsQueryKey, data);
    },
  });
}
