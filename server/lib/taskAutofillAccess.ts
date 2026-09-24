/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { findAssignmentForProject } from './assignmentManageAccess.ts';
import { findQuestionForProject } from './findProjectQuestion.ts';

function platformUserRecipientIds(user: {
  _id?: unknown;
  legacyFirebaseId?: string;
  contactId?: string;
  id?: string;
}): string[] {
  const ids: string[] = [];
  if (user._id) ids.push(String(user._id));
  if (user.id) ids.push(String(user.id));
  if (user.legacyFirebaseId) ids.push(user.legacyFirebaseId);
  if (user.contactId) ids.push(user.contactId);
  return ids;
}

function questionIdentityIds(
  doc: { _id?: unknown; legacyFirebaseId?: string; sourceQuestionId?: string; id?: string },
  inputQuestionId: string,
): string[] {
  const ids = new Set<string>([inputQuestionId]);
  if (doc._id) ids.add(String(doc._id));
  if (doc.id) ids.add(String(doc.id));
  if (doc.legacyFirebaseId) ids.add(doc.legacyFirebaseId);
  if (doc.sourceQuestionId) ids.add(doc.sourceQuestionId);
  return [...ids];
}

export async function assertTaskQuestionAutofillAccess(
  user: {
    _id?: unknown;
    legacyFirebaseId?: string;
    contactId?: string;
    id?: string;
  },
  projectId: string,
  assignmentId: string,
  questionId: string,
): Promise<void> {
  if (!projectId || !assignmentId || !questionId) {
    throw new Error('projectId, assignmentId, and questionId are required');
  }

  const assignment = (await findAssignmentForProject(projectId, assignmentId)) as {
    status?: string;
    questionIds?: string[];
    recipientId?: string;
  } | null;

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  if (assignment.status === 'completed') {
    throw new Error('Assignment is already completed');
  }

  const question = await findQuestionForProject(projectId, questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  const questionIds = questionIdentityIds(
    question.doc as {
      _id?: unknown;
      legacyFirebaseId?: string;
      sourceQuestionId?: string;
      id?: string;
    },
    questionId,
  );
  const assignedIds = new Set(assignment.questionIds || []);
  if (!questionIds.some((id) => assignedIds.has(id))) {
    throw new Error('Question is not part of this assignment');
  }

  const recipientIds = platformUserRecipientIds(user);
  if (!recipientIds.includes(String(assignment.recipientId || ''))) {
    throw new Error('Insufficient permissions');
  }
}
