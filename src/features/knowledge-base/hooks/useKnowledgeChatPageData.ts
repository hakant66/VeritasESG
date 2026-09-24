/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import type { PlatformUser } from '../../../types';
import { fetchKnowledgeChatPageData } from '../lib/filterAccessibleKbs.ts';

export function knowledgeChatQueryKey(userId: string) {
  return ['knowledge-base', 'chat', userId] as const;
}

export function useKnowledgeChatPageData(
  userId: string | undefined,
  profile: PlatformUser | null | undefined,
) {
  return useQuery({
    queryKey: knowledgeChatQueryKey(userId ?? ''),
    queryFn: () => fetchKnowledgeChatPageData(userId!, profile),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
