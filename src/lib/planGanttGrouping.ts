/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Assignment, Question } from '../types';

export type PlanGanttViewMode = 'assignment' | 'person' | 'page';

export type PlanGanttAggregatedRow = {
  assignments: Assignment[];
  questionIds: string[];
  bDate: number;
  dDate: number;
  isOverdue: boolean;
  barStatus: 'completed' | 'overdue' | 'active';
};

export type PlanGanttPersonRow = PlanGanttAggregatedRow & {
  recipientId: string;
};

export type PlanGanttPageRow = PlanGanttAggregatedRow & {
  pageId: string;
  pageTitle: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const UNASSIGNED_PAGE_ID = '__plan_unassigned_page__';

function assignmentDeadlineMs(assignment: Assignment, projectStart: number): number {
  const begin = assignment.beginDate ?? projectStart;
  return assignment.deadline ?? begin + 7 * MS_PER_DAY;
}

function assignmentIsOverdue(assignment: Assignment, now: number, projectStart: number): boolean {
  if (assignment.status === 'completed') return false;
  if (assignment.status === 'overdue') return true;
  return assignmentDeadlineMs(assignment, projectStart) < now;
}

function aggregateAssignments(
  group: Assignment[],
  projectStart: number,
  now: number,
): PlanGanttAggregatedRow {
  const questionIds = [
    ...new Set(group.flatMap((a) => a.questionIds ?? []).filter(Boolean)),
  ];
  const bDate = Math.min(...group.map((a) => a.beginDate ?? projectStart));
  const dDate = Math.max(...group.map((a) => assignmentDeadlineMs(a, projectStart)));

  const allCompleted = group.every((a) => a.status === 'completed');
  const isOverdue =
    !allCompleted && group.some((a) => assignmentIsOverdue(a, now, projectStart));

  let barStatus: PlanGanttAggregatedRow['barStatus'] = 'active';
  if (allCompleted) barStatus = 'completed';
  else if (isOverdue) barStatus = 'overdue';

  return {
    assignments: group,
    questionIds,
    bDate,
    dDate,
    isOverdue,
    barStatus,
  };
}

/** One Gantt row per recipient; date range and questions are unions across assignments. */
export function buildPlanGanttPersonRows(
  assignments: Assignment[],
  projectStart: number,
  now = Date.now(),
): PlanGanttPersonRow[] {
  const byRecipient = new Map<string, Assignment[]>();

  for (const assignment of assignments) {
    const list = byRecipient.get(assignment.recipientId) ?? [];
    list.push(assignment);
    byRecipient.set(assignment.recipientId, list);
  }

  const rows: PlanGanttPersonRow[] = [];

  for (const [recipientId, group] of byRecipient) {
    rows.push({
      recipientId,
      ...aggregateAssignments(group, projectStart, now),
    });
  }

  return rows;
}

/** One Gantt row per project page; unions assignments/questions assigned on that page. */
export function buildPlanGanttPageRows(
  assignments: Assignment[],
  questions: Question[],
  pages: { id: string; title: string }[],
  projectStart: number,
  unassignedPageTitle: string,
  now = Date.now(),
): PlanGanttPageRow[] {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const pageTitleById = new Map(pages.map((p) => [p.id, p.title]));
  const assignmentsByPage = new Map<string, Assignment[]>();
  const questionIdsByPage = new Map<string, Set<string>>();

  const touchPage = (pageId: string, assignment: Assignment, questionId: string) => {
    const group = assignmentsByPage.get(pageId) ?? [];
    if (!group.some((a) => a.id === assignment.id)) {
      group.push(assignment);
      assignmentsByPage.set(pageId, group);
    }
    const qSet = questionIdsByPage.get(pageId) ?? new Set<string>();
    qSet.add(questionId);
    questionIdsByPage.set(pageId, qSet);
  };

  for (const assignment of assignments) {
    for (const qid of assignment.questionIds ?? []) {
      if (!qid) continue;
      const q = questionById.get(qid);
      const pageId = q?.pageId?.trim() || UNASSIGNED_PAGE_ID;
      touchPage(pageId, assignment, qid);
    }
  }

  const orderedPageIds = [
    ...pages.map((p) => p.id).filter((id) => assignmentsByPage.has(id)),
    ...(assignmentsByPage.has(UNASSIGNED_PAGE_ID) ? [UNASSIGNED_PAGE_ID] : []),
  ];

  return orderedPageIds.map((pageId) => {
    const group = assignmentsByPage.get(pageId) ?? [];
    const questionIds = [...(questionIdsByPage.get(pageId) ?? [])];
    const aggregated = aggregateAssignments(group, projectStart, now);
    return {
      pageId,
      pageTitle:
        pageId === UNASSIGNED_PAGE_ID
          ? unassignedPageTitle
          : pageTitleById.get(pageId) || unassignedPageTitle,
      assignments: group,
      questionIds,
      bDate: aggregated.bDate,
      dDate: aggregated.dDate,
      isOverdue: aggregated.isOverdue,
      barStatus: aggregated.barStatus,
    };
  });
}
