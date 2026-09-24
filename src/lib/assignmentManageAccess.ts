/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Assignment, ProjectUserAssignment } from '../types';
import { normalizePlatformRole } from './platformRoles';
import { isTasksPageFilterAdmin } from './userRoles';

export function canManageAssignment(
  assignment: Assignment,
  user: { uid?: string } | null | undefined,
  profile?: { role?: string; id?: string } | null,
  myProjectAssignments: ProjectUserAssignment[] = [],
): boolean {
  if (isTasksPageFilterAdmin(profile?.role)) return true;

  const role = normalizePlatformRole(profile?.role);
  if (role === 'consultant') return true;

  const actorIds = new Set(
    [user?.uid, profile?.id].filter((id): id is string => Boolean(id)),
  );
  if (assignment.assignedBy && actorIds.has(assignment.assignedBy)) {
    return true;
  }

  const projectAdmin = myProjectAssignments.some(
    (pua) =>
      pua.projectId === assignment.projectId &&
      (pua.role === 'admin' || pua.role === 'editor'),
  );
  return projectAdmin;
}
