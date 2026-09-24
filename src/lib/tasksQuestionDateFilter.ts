/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Answer, Assignment, Question } from '../types';

export type TasksRecentActivityFilterId =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month';

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

/** Local Monday 00:00 of the week containing `d`. */
function startOfLocalWeek(d: Date): number {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return startOfLocalDay(monday);
}

export function getDateRangeForActivityFilter(
  filter: TasksRecentActivityFilterId,
  now = new Date(),
): { start: number; end: number } | null {
  if (filter === 'all') return null;

  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  switch (filter) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: startOfLocalDay(y), end: endOfLocalDay(y) };
    }
    case 'this_week':
      return { start: startOfLocalWeek(now), end: todayEnd };
    case 'this_month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { start: monthStart, end: todayEnd };
    }
    default:
      return null;
  }
}

export function getQuestionActivityTimestamp(
  questionId: string,
  answerRecords: Answer[],
  assignment?: Assignment,
): number {
  const scoped = answerRecords.filter((a) => {
    if (a.questionId !== questionId) return false;
    if (!assignment) return true;
    return (
      a.assignmentId === assignment.id || a.contactId === assignment.recipientId
    );
  });
  if (scoped.length === 0) return 0;
  return Math.max(
    ...scoped.map((a) => Math.max(a.updatedAt || 0, a.submittedAt || 0)),
  );
}

export function questionMatchesActivityFilter(
  questionId: string,
  answerRecords: Answer[],
  assignment: Assignment | undefined,
  filter: TasksRecentActivityFilterId,
): boolean {
  if (filter === 'all') return true;
  const ts = getQuestionActivityTimestamp(questionId, answerRecords, assignment);
  if (ts <= 0) return false;
  const range = getDateRangeForActivityFilter(filter);
  if (!range) return true;
  return ts >= range.start && ts <= range.end;
}

export function filterAndSortQuestionsByRecentActivity(
  questions: Question[],
  answerRecords: Answer[],
  assignmentByQuestionId: Map<string, Assignment>,
  filter: TasksRecentActivityFilterId,
  pageOrder?: Map<string, number>,
): Question[] {
  let list = questions.filter((q) => {
    const assignment = assignmentByQuestionId.get(q.id);
    return questionMatchesActivityFilter(q.id, answerRecords, assignment, filter);
  });

  list = [...list].sort((a, b) => {
    const ta = getQuestionActivityTimestamp(
      a.id,
      answerRecords,
      assignmentByQuestionId.get(a.id),
    );
    const tb = getQuestionActivityTimestamp(
      b.id,
      answerRecords,
      assignmentByQuestionId.get(b.id),
    );
    if (tb !== ta) return tb - ta;
    if (pageOrder) {
      const pa = pageOrder.get(a.pageId) ?? 999;
      const pb = pageOrder.get(b.pageId) ?? 999;
      if (pa !== pb) return pa - pb;
    }
    return String(a.kod || '').localeCompare(String(b.kod || ''), undefined, {
      numeric: true,
    });
  });

  return list;
}
