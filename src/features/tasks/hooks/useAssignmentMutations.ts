/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteProjectAssignment,
  resendAssignmentEmail,
  updateProjectAssignment,
  type UpdateAssignmentPayload,
} from '../api/assignmentManage.ts';

export function useAssignmentMutations() {
  const queryClient = useQueryClient();

  const invalidateTasks = () =>
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const deleteAssignment = useMutation({
    mutationFn: (args: { projectId: string; assignmentId: string }) =>
      deleteProjectAssignment(args.projectId, args.assignmentId),
    onSuccess: invalidateTasks,
  });

  const resendEmail = useMutation({
    mutationFn: (args: { projectId: string; assignmentId: string }) =>
      resendAssignmentEmail(args.projectId, args.assignmentId),
  });

  const updateAssignment = useMutation({
    mutationFn: (args: {
      projectId: string;
      assignmentId: string;
      payload: UpdateAssignmentPayload;
    }) => updateProjectAssignment(args.projectId, args.assignmentId, args.payload),
    onSuccess: invalidateTasks,
  });

  return { deleteAssignment, resendEmail, updateAssignment };
}
