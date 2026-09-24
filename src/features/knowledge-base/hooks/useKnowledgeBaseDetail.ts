/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchKnowledgeBaseDetail,
  type KbIngestErrorMessages,
} from '../api/kbQueries.ts';

export function knowledgeBaseDetailQueryKey(kbId: string) {
  return ['knowledge-base', 'detail', kbId] as const;
}

export function useKnowledgeBaseDetail(
  kbId: string | undefined,
  ingestErrorMessages: KbIngestErrorMessages,
) {
  return useQuery({
    queryKey: knowledgeBaseDetailQueryKey(kbId ?? ''),
    queryFn: () => fetchKnowledgeBaseDetail(kbId!, ingestErrorMessages),
    enabled: Boolean(kbId),
    staleTime: 15_000,
  });
}
