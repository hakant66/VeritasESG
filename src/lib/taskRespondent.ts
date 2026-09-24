/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Assignment } from '../types';

/** True when the signed-in user is the assignment recipient. */
export function isAssignmentRecipient(
  assignment: Assignment,
  user: { uid?: string; id?: string } | null | undefined,
  profile?: { id?: string; contactId?: string } | null,
): boolean {
  const ids = new Set(
    [user?.uid, user?.id, profile?.id, profile?.contactId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  return ids.has(assignment.recipientId);
}

/** Görevler sayfasında yanıt yazılabilir mi (atama tamamlanmamış + alıcı eşleşmesi). */
export function canRespondOnTasksPage(
  assignment: Assignment,
  user: { uid?: string; id?: string } | null | undefined,
  profile?: { id?: string } | null,
): boolean {
  if (assignment.status === 'completed') return false;
  return isAssignmentRecipient(assignment, user, profile);
}
