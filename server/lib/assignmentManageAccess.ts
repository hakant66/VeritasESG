/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { documentPublicId } from './questionIds.ts';
import {
  findAssignmentForProject as findAssignment,
  findProjectUserAssignment,
  findRecipientExists as recipientExists,
  resolveRecipientLabel as recipientLabel,
} from '../data/workflowDataAccess.ts';

type LeanUser = {
  _id?: unknown;
  legacyFirebaseId?: string;
  role?: string;
};

function actorPublicIds(user: LeanUser): Set<string> {
  const ids = new Set<string>();
  if (user._id) ids.add(String(user._id));
  const legacy = user.legacyFirebaseId?.trim();
  if (legacy) ids.add(legacy);
  const pub = documentPublicId(user as { legacyFirebaseId?: string; _id?: unknown });
  if (pub) ids.add(pub);
  return ids;
}

export async function canManageProjectAssignment(
  user: LeanUser,
  assignment: { projectId?: string; assignedBy?: string } | null | undefined,
): Promise<boolean> {
  const role = normalizePlatformRole(user.role);
  // Platform / consultant side may edit assignment dates and recipients.
  if (
    role === 'platform_admin' ||
    role === 'consultant_manager' ||
    role === 'consultant'
  ) {
    return true;
  }

  if (!assignment?.projectId) return false;

  const actorIds = actorPublicIds(user);
  if (assignment.assignedBy && actorIds.has(assignment.assignedBy)) {
    return true;
  }

  const projectId = String(assignment.projectId).trim();
  const projectAdmin = await findProjectUserAssignment(projectId, [...actorIds]);
  return projectAdmin?.role === 'admin' || projectAdmin?.role === 'editor';
}

export async function findAssignmentForProject(projectId: string, assignmentId: string) {
  return findAssignment(projectId, assignmentId);
}

export function readDateMs(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const ms = new Date(value as string | Date).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

export async function findRecipientExists(
  recipientId: string,
  recipientType: 'contact' | 'user',
): Promise<boolean> {
  return recipientExists(recipientId, recipientType);
}

export async function resolveRecipientLabel(
  recipientId: string,
  recipientType: 'contact' | 'user',
): Promise<string> {
  return recipientLabel(recipientId, recipientType);
}
