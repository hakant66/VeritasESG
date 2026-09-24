/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Question } from '../types';

export function questionMatchesAssignmentIds(
  q: Pick<Question, 'id' | 'sourceQuestionId'>,
  questionIds: string[],
): boolean {
  if (questionIds.includes(q.id)) return true;
  if (q.sourceQuestionId && questionIds.includes(q.sourceQuestionId)) return true;
  return false;
}
