/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Keeps task assignments in sync when project questions are removed.
 */

import { documentPublicId } from './questionIds.ts';
import {
  deleteAnswersForAssignment,
  deleteAssignment,
  deleteAnswersByProjectKeysAndQuestions,
  listAssignmentsByProjectKeys,
  resolveProjectIdKeys as resolveProjectKeys,
  updateAssignmentQuestionIds,
} from '../data/workflowDataAccess.ts';
import { collectValidQuestionIds, deleteProjectQuestionnaireData as deleteQuestionnaireData } from '../data/projectLibDataAccess.ts';

export async function resolveProjectIdKeys(projectId: string): Promise<string[]> {
  return resolveProjectKeys(projectId);
}

function assignmentIdMatchers(assignment: {
  _id?: unknown;
  id?: string;
  legacyFirebaseId?: string;
}) {
  const id = documentPublicId(assignment as { legacyFirebaseId?: string; _id?: unknown });
  const clauses: string[] = [id];
  const legacy = assignment.legacyFirebaseId;
  if (legacy && legacy !== id) clauses.push(legacy);
  const internal = assignment._id || assignment.id;
  if (internal && String(internal) !== id) clauses.push(String(internal));
  return clauses;
}

/** Deletes pages, questions, answers, assignments, and audit logs for all project id aliases. */
export async function deleteProjectQuestionnaireData(projectId: string) {
  await deleteQuestionnaireData(projectId);
}

/**
 * Removes deleted question ids from assignments, deletes assignments with no questions left,
 * and deletes orphaned answers for removed questions.
 */
export async function syncAssignmentsAfterQuestionDeletion(
  projectId: string,
  options?: { deletedQuestionIds?: string[] },
): Promise<{
  assignmentsDeleted: number;
  assignmentsUpdated: number;
  answersDeleted: number;
}> {
  const projectKeys = await resolveProjectIdKeys(projectId);
  if (projectKeys.length === 0) {
    return { assignmentsDeleted: 0, assignmentsUpdated: 0, answersDeleted: 0 };
  }

  const validIds = await collectValidQuestionIds(projectKeys);
  const explicitlyDeleted = new Set(
    (options?.deletedQuestionIds || []).map((id) => id.trim()).filter(Boolean),
  );

  const assignments = await listAssignmentsByProjectKeys(projectKeys);
  let assignmentsDeleted = 0;
  let assignmentsUpdated = 0;
  let answersDeleted = 0;

  for (const assignment of assignments) {
    const questionIds = Array.isArray(assignment.questionIds)
      ? assignment.questionIds.map(String)
      : [];

    const remaining = questionIds.filter(
      (qid) => !explicitlyDeleted.has(qid) && validIds.has(qid),
    );

    if (remaining.length === 0) {
      await deleteAssignment(String(assignment._id || assignment.id));
      assignmentsDeleted += 1;

      answersDeleted += await deleteAnswersForAssignment(
        projectKeys,
        assignmentIdMatchers(assignment),
      );
      continue;
    }

    if (remaining.length === questionIds.length) continue;

    await updateAssignmentQuestionIds(String(assignment._id || assignment.id), remaining);
    assignmentsUpdated += 1;

    const removed = questionIds.filter((qid) => !remaining.includes(qid));
    if (removed.length > 0) {
      answersDeleted += await deleteAnswersByProjectKeysAndQuestions(projectKeys, removed);
    }
  }

  return { assignmentsDeleted, assignmentsUpdated, answersDeleted };
}

export function questionIdsForDeletedProjectQuestion(doc: {
  _id?: unknown;
  id?: string;
  legacyFirebaseId?: string;
  sourceQuestionId?: string;
}): string[] {
  const ids = new Set<string>();
  if (doc._id) ids.add(String(doc._id));
  if (doc.id) ids.add(String(doc.id));
  const legacy = doc.legacyFirebaseId;
  if (legacy) ids.add(legacy);
  const source = doc.sourceQuestionId;
  if (source) ids.add(source);
  return [...ids];
}
