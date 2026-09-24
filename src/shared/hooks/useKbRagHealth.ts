/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { fetchKbRagHealth } from '../api/kbRagHealth.ts';

export const kbRagHealthQueryKey = ['kb-rag', 'health'] as const;

export function useKbRagHealth() {
  return useQuery({
    queryKey: kbRagHealthQueryKey,
    queryFn: fetchKbRagHealth,
    staleTime: 60_000,
  });
}
