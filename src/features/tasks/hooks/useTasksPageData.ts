/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { fetchTasksPageBootstrap } from '../api/tasksQueries.ts';

export const tasksPageBootstrapQueryKey = (userId: string) =>
  ['tasks', 'page-bootstrap', userId] as const;

export function useTasksPageData(userId: string | undefined) {
  return useQuery({
    queryKey: tasksPageBootstrapQueryKey(userId ?? ''),
    queryFn: () => fetchTasksPageBootstrap(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
