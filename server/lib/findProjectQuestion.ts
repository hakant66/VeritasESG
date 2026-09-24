/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { findQuestionForProject as findQuestion } from '../data/workflowDataAccess.ts';

export async function findQuestionForProject(
  projectId: string,
  questionId: string,
) {
  return findQuestion(projectId, questionId);
}

export function questionKodLabel(
  doc: { kod?: string } | null,
  questionId: string,
): string {
  const kod = doc?.kod?.trim();
  return kod || questionId;
}
