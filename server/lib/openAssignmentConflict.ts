/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { readDateMs } from './assignmentManageAccess.ts';
import { findAssignmentsForRecipientQuestions } from '../data/workflowDataAccess.ts';

/** Açık atama: henüz e-posta/deadline yok (Görevler'e düşmemiş). */
export function isOpenAssignmentRecord(assignment: {
  sentAt?: unknown;
  deadline?: unknown;
  token?: unknown;
}): boolean {
  if (assignment.token) return false;
  const sentMs = readDateMs(assignment.sentAt);
  if (sentMs != null && sentMs > 0) return false;
  const deadlineMs = readDateMs(assignment.deadline);
  if (deadlineMs != null && deadlineMs > 0) return false;
  return true;
}

/** Yalnızca açık atama çakışması — gönderilmiş/tamamlanmış atamalar engellenmez. */
export async function findOpenAssignmentConflict(params: {
  projectId: string;
  recipientId: string;
  questionIds: string[];
  excludeAssignmentId?: unknown;
}) {
  const candidates = await findAssignmentsForRecipientQuestions({
    projectId: params.projectId,
    recipientId: params.recipientId,
    questionIds: params.questionIds,
    excludeAssignmentId: params.excludeAssignmentId
      ? String(params.excludeAssignmentId)
      : undefined,
  });
  return (
    candidates.find((doc) =>
      isOpenAssignmentRecord(
        doc as { sentAt?: unknown; deadline?: unknown; token?: unknown },
      ),
    ) ?? null
  );
}
