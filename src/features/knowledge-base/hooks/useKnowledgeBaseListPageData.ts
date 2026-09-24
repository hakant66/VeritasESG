/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchKnowledgeBaseListBootstrap } from '../api/kbQueries.ts';

export const knowledgeBaseListQueryKey = ['knowledge-base', 'list'] as const;

export function useKnowledgeBaseListPageData() {
  return useQuery({
    queryKey: knowledgeBaseListQueryKey,
    queryFn: fetchKnowledgeBaseListBootstrap,
    staleTime: 30_000,
  });
}

export function useKnowledgeBaseInvalidate() {
  const queryClient = useQueryClient();
  return {
    invalidateList: () =>
      void queryClient.invalidateQueries({ queryKey: knowledgeBaseListQueryKey }),
    invalidateDetail: (kbId: string) =>
      void queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'detail', kbId] }),
    invalidateChat: (userId: string) =>
      void queryClient.invalidateQueries({ queryKey: ['knowledge-base', 'chat', userId] }),
    invalidateAll: () => void queryClient.invalidateQueries({ queryKey: ['knowledge-base'] }),
  };
}
