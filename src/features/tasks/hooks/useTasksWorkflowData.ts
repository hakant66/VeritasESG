/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTasksWorkflowData } from '../api/tasksQueries.ts';

export const tasksWorkflowQueryKey = (projectIds: string[]) =>
  ['tasks', 'workflow', ...projectIds.sort()] as const;

export function useTasksWorkflowData(projectIds: string[]) {
  const stableIds = useMemo(
    () => [...new Set(projectIds.filter(Boolean))].sort(),
    [projectIds],
  );

  return useQuery({
    queryKey: tasksWorkflowQueryKey(stableIds),
    queryFn: () => fetchTasksWorkflowData(stableIds),
    enabled: stableIds.length > 0,
    staleTime: 20_000,
  });
}
