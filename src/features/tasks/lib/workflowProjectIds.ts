/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Assignment, PlatformUser, ProjectUserAssignment } from '../../../types';
import { isTasksPageFilterAdmin } from '../../../lib/userRoles';
import { canManageAssignment } from '../../../lib/assignmentManageAccess';
import { isAssignmentLinkSent } from '../../../lib/questionWorkflow';
import type { TasksPageBootstrap } from '../api/tasksQueries.ts';

export function selectWorkflowAssignments(
  bootstrap: TasksPageBootstrap,
  user: { uid: string },
  profile: PlatformUser | null | undefined,
): Assignment[] {
  const sent = bootstrap.assignments.filter(
    (a) => a.recipientId === user.uid && isAssignmentLinkSent(a),
  );

  if (isTasksPageFilterAdmin(profile?.role)) {
    const manageProjects = new Set(
      bootstrap.assignments
        .filter((a) =>
          canManageAssignment(a, user, profile, bootstrap.myProjectAssignments),
        )
        .map((a) => a.projectId),
    );
    if (manageProjects.size > 0) {
      return bootstrap.assignments.filter((a) => manageProjects.has(a.projectId));
    }
    return sent;
  }

  return sent;
}

export function workflowProjectIdsFromAssignments(assignments: Assignment[]): string[] {
  return [...new Set(assignments.map((a) => a.projectId).filter(Boolean))];
}
