/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Answer, Assignment } from '../types';

export function answerHasSubstantiveContent(ans: Answer): boolean {
  if (ans.latestAnswer?.trim()) return true;
  if (ans.latestFileUrl?.trim()) return true;
  if (ans.evidenceName?.trim()) return true;
  if (ans.workflowStatus && ans.workflowStatus !== 'not_sent') return true;
  return false;
}

export function assignmentHasSubstantiveAnswers(
  assignment: Assignment,
  answerList: Answer[],
  recipientId?: string,
): boolean {
  const scopedRecipientId = recipientId ?? assignment.recipientId;
  for (const qid of assignment.questionIds || []) {
    const ans = answerList.find(
      (a) =>
        a.questionId === qid &&
        (a.assignmentId === assignment.id || a.contactId === scopedRecipientId),
    );
    if (ans && answerHasSubstantiveContent(ans)) return true;
  }
  return false;
}
