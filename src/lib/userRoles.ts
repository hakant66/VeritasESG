/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizePlatformRole } from './platformRoles.ts';

/** Legacy project member role stored before rename to contributor. */
export const LEGACY_PROJECT_VIEWER_ROLE = 'viewer';

export const PROJECT_CONTRIBUTOR_ROLE = 'contributor';

/** Platform users with access limited to Görevler + Profil only. */
export const PLATFORM_AUDITOR_ROLE = 'auditor';
export const PROJECT_AUDITOR_ROLE = 'auditor';

export function isAuditorPlatformUser(role: string | undefined): boolean {
  return normalizePlatformRole(role) === PLATFORM_AUDITOR_ROLE;
}

export function isAuditorProjectRole(role: string | undefined): boolean {
  return role === PROJECT_AUDITOR_ROLE;
}

export function isTasksOnlyPlatformUser(role: string | undefined): boolean {
  return normalizePlatformRole(role) === PROJECT_CONTRIBUTOR_ROLE;
}

/** Customer portal: dashboard + assigned projects (not tasks-only contributors). */
export function isCustomerPortalPlatformUser(role: string | undefined): boolean {
  return normalizePlatformRole(role) === 'customer';
}

/** Project team roles that unlock full customer portal navigation. */
export function isElevatedProjectMemberRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'editor';
}

export function hasElevatedProjectMembership(
  assignments: Array<{ role?: string }> | null | undefined,
): boolean {
  return (assignments ?? []).some((a) => isElevatedProjectMemberRole(a.role));
}

/**
 * Customer platform user without admin/editor on any project — Görevler + Profil only.
 */
export function isCustomerParticipantOnlyUser(
  role: string | undefined,
  projectAssignments: Array<{ role?: string }> | null | undefined,
): boolean {
  if (!isCustomerPortalPlatformUser(role)) return false;
  return !hasElevatedProjectMembership(projectAssignments);
}

/** Contributor, or customer without elevated project role — limited nav. */
export function isTasksAndProfileOnlyUser(
  role: string | undefined,
  projectAssignments?: Array<{ role?: string }> | null,
): boolean {
  if (isTasksOnlyPlatformUser(role)) return true;
  return isCustomerParticipantOnlyUser(role, projectAssignments);
}

export function isProjectContributorRole(role: string | undefined): boolean {
  return (
    role === PROJECT_CONTRIBUTOR_ROLE ||
    role === LEGACY_PROJECT_VIEWER_ROLE
  );
}

/** Platform admin or consultant manager — full tasks page filters (project + search). */
export function isTasksPageFilterAdmin(role: string | undefined): boolean {
  const canonical = normalizePlatformRole(role);
  return canonical === 'platform_admin' || canonical === 'consultant_manager';
}

/** Platform roles that use OTP login from assignment emails (not consultants/admins). */
export function isAssignmentOtpPlatformUser(role: string | undefined): boolean {
  const canonical = normalizePlatformRole(role);
  return (
    canonical === PROJECT_CONTRIBUTOR_ROLE ||
    canonical === 'customer'
  );
}

/** Normalize stored project member role for UI selects (legacy viewer → contributor). */
export function projectMemberRoleForSelect(
  role: string | undefined,
): 'admin' | 'editor' | 'contributor' | 'auditor' {
  if (role === 'admin' || role === 'editor' || role === 'auditor') return role;
  if (role === LEGACY_PROJECT_VIEWER_ROLE) return PROJECT_CONTRIBUTOR_ROLE;
  return PROJECT_CONTRIBUTOR_ROLE;
}

export function isPlatformAdminRole(role: string | undefined): boolean {
  return normalizePlatformRole(role) === 'platform_admin';
}

/** Platform admin or consultant manager — full project catalog (not assignment-scoped). */
export function canListAllProjects(role: string | undefined): boolean {
  const canonical = normalizePlatformRole(role);
  return canonical === 'platform_admin' || canonical === 'consultant_manager';
}

/** Customer platform users are scoped to the project's customer company; other roles are not. */
export function platformUserVisibleForProject(
  user: { role: string; customerId?: string | null },
  projectCustomerId?: string | null,
): boolean {
  if (normalizePlatformRole(user.role) !== 'customer') return true;
  if (!projectCustomerId) return true;
  return user.customerId === projectCustomerId;
}

/** Customer platform user belongs to another company than the project. */
export function platformUserCustomerIdMismatchForProject(
  user: { role: string; customerId?: string | null },
  projectCustomerId?: string | null,
): boolean {
  if (!projectCustomerId) return false;
  if (normalizePlatformRole(user.role) !== 'customer') return false;
  if (!user.customerId) return false;
  return user.customerId !== projectCustomerId;
}

/** Display order for unassigned platform users on project detail (Users tab). */
const UNASSIGNED_PLATFORM_USER_ROLE_ORDER = [
  'customer',
  'consultant',
  'consultant_manager',
  'auditor',
] as const;

/**
 * Links a platform user to a customer contact (stakeholder) for display / dedup.
 * When both have emails they must match exactly; contactId alone is not enough.
 */
export function platformUserLinkedToStakeholderContact(
  user: { email?: string | null; contactId?: string | null },
  contact: { id: string; email?: string | null },
): boolean {
  const contactEmail = (contact.email || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (contactEmail && userEmail) {
    return contactEmail === userEmail;
  }
  if (user.contactId && user.contactId === contact.id) {
    return true;
  }
  return false;
}

export function comparePlatformUsersForProjectUnassignedList(
  a: { role: string; name?: string },
  b: { role: string; name?: string },
  locale = 'tr',
): number {
  const roleA = normalizePlatformRole(a.role);
  const roleB = normalizePlatformRole(b.role);
  const idxA = UNASSIGNED_PLATFORM_USER_ROLE_ORDER.indexOf(
    roleA as (typeof UNASSIGNED_PLATFORM_USER_ROLE_ORDER)[number],
  );
  const idxB = UNASSIGNED_PLATFORM_USER_ROLE_ORDER.indexOf(
    roleB as (typeof UNASSIGNED_PLATFORM_USER_ROLE_ORDER)[number],
  );
  const orderA =
    idxA === -1 ? UNASSIGNED_PLATFORM_USER_ROLE_ORDER.length : idxA;
  const orderB =
    idxB === -1 ? UNASSIGNED_PLATFORM_USER_ROLE_ORDER.length : idxB;
  if (orderA !== orderB) return orderA - orderB;
  return (a.name || '').localeCompare(b.name || '', locale, {
    sensitivity: 'base',
  });
}
