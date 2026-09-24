/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Answer, Assignment, Question, QuestionWorkflowStatus } from '../types';

export function isAssignmentLinkSent(a: Assignment): boolean {
  return (typeof a.sentAt === 'number' && a.sentAt > 0) || !!a.token;
}

export function assignmentsCoveringQuestion(
  q: Question,
  assignmentList: Assignment[],
): Assignment[] {
  return (assignmentList || []).filter((as) => (as.questionIds || []).includes(q.id));
}

export function getQuestionWorkflowState(
  q: Question,
  answerList: Answer[],
  assignmentList: Assignment[],
): QuestionWorkflowStatus {
  const ans = answerList.find((a) => a.questionId === q.id);
  if (ans?.workflowStatus) return ans.workflowStatus;

  if (ans?.adminReviewStatus === 'sent_back') return 'sent_back';
  if (ans?.adminReviewStatus === 'received') return 'customer_responded';
  if (ans?.adminReviewStatus === 'pending') return 'sent_pending';

  const covering = assignmentsCoveringQuestion(q, assignmentList);
  const anySent = covering.some(isAssignmentLinkSent);

  if (!anySent) {
    if (ans?.latestAnswer) return 'customer_responded';
    return 'not_sent';
  }
  if (ans?.latestAnswer) return 'customer_responded';
  return 'sent_pending';
}

export function isWorkflowProgressCounted(
  q: Question,
  answerList: Answer[],
  assignmentList: Assignment[],
): boolean {
  const s = getQuestionWorkflowState(q, answerList, assignmentList);
  return s === 'customer_responded' || s === 'approved';
}

export type TasksWorkflowFilterId = Exclude<QuestionWorkflowStatus, 'not_sent'>;

/** Görevler üst çubuk: filtre sekmesi + tüm iş akışı durumları */
export type TasksToolbarTabId = 'questions_filter' | TasksWorkflowFilterId;

export const TASKS_TOOLBAR_TAB_HEIGHT_CLASS = 'h-10';

const TOOLBAR_WORKFLOW_TABS: TasksWorkflowFilterId[] = [
  'sent_pending',
  'customer_responded',
  'sent_back',
  'approved',
];

export function isTasksToolbarTabId(value: string): value is TasksToolbarTabId {
  return (
    value === 'questions_filter' ||
    value === 'sent_pending' ||
    value === 'customer_responded' ||
    value === 'sent_back' ||
    value === 'approved'
  );
}

export function questionMatchesToolbarTab(
  q: Question,
  answerRecords: Answer[],
  assignment: Assignment,
  tab: TasksToolbarTabId,
): boolean {
  const state = getQuestionWorkflowState(q, answerRecords, [assignment]);
  if (tab === 'questions_filter') {
    return state !== 'not_sent';
  }
  return state === tab;
}

export function assignmentHasQuestionInToolbarTab(
  assignment: Assignment,
  tab: TasksToolbarTabId,
  questionsByProject: Record<string, Question[]>,
  answersByProject: Record<string, Answer[]>,
): boolean {
  const questions = questionsByProject[assignment.projectId] || [];
  const allAnswers = answersByProject[assignment.projectId] || [];
  const scopedAnswers = allAnswers.filter(
    (a) =>
      a.assignmentId === assignment.id || a.contactId === assignment.recipientId,
  );
  for (const qid of assignment.questionIds || []) {
    const q = questions.find((item) => item.id === qid);
    if (!q) continue;
    if (questionMatchesToolbarTab(q, scopedAnswers, assignment, tab)) return true;
  }
  return false;
}

export function countToolbarTabItems(
  items: AssignmentQuestionWorkflowItem[],
  tab: TasksToolbarTabId,
): number {
  if (tab === 'questions_filter') {
    return items.filter((item) => item.workflowStatus !== 'not_sent').length;
  }
  return items.filter((item) => item.workflowStatus === tab).length;
}

export { TOOLBAR_WORKFLOW_TABS };

export type AssignmentQuestionWorkflowItem = {
  assignmentId: string;
  projectId: string;
  questionId: string;
  workflowStatus: QuestionWorkflowStatus;
};

export function buildAssignmentQuestionWorkflowItems(
  recipientAssignments: Assignment[],
  questionsByProject: Record<string, Question[]>,
  answersByProject: Record<string, Answer[]>,
): AssignmentQuestionWorkflowItem[] {
  const items: AssignmentQuestionWorkflowItem[] = [];
  const seen = new Set<string>();

  for (const assignment of recipientAssignments) {
    if (!isAssignmentLinkSent(assignment)) continue;
    const questions = questionsByProject[assignment.projectId] || [];
    const allAnswers = answersByProject[assignment.projectId] || [];
    const scopedAnswers = allAnswers.filter(
      (a) =>
        a.assignmentId === assignment.id ||
        a.contactId === assignment.recipientId,
    );

    for (const qid of assignment.questionIds || []) {
      const key = `${assignment.id}:${qid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const q = questions.find((item) => item.id === qid);
      if (!q) continue;
      const workflowStatus = getQuestionWorkflowState(q, scopedAnswers, [assignment]);
      if (workflowStatus === 'not_sent') continue;
      items.push({
        assignmentId: assignment.id,
        projectId: assignment.projectId,
        questionId: qid,
        workflowStatus,
      });
    }
  }

  return items;
}

/** Görevler proje başlığı: Tümü paydası, pay = Yanıt Verildi + Onaylandı (sekmeden bağımsız). */
export function computeTasksProjectWorkflowProgress(
  assignments: Assignment[],
  questionsByProject: Record<string, Question[]>,
  answersByProject: Record<string, Answer[]>,
): { answered: number; total: number; percent: number } {
  const items = buildAssignmentQuestionWorkflowItems(
    assignments,
    questionsByProject,
    answersByProject,
  );
  const total = items.length;
  const answered = items.filter(
    (item) =>
      item.workflowStatus === 'customer_responded' ||
      item.workflowStatus === 'approved',
  ).length;
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return { answered, total, percent };
}

export function countWorkflowItemsByStatus(
  items: AssignmentQuestionWorkflowItem[],
): Record<QuestionWorkflowStatus, number> {
  const counts: Record<QuestionWorkflowStatus, number> = {
    not_sent: 0,
    sent_pending: 0,
    customer_responded: 0,
    sent_back: 0,
    approved: 0,
  };
  for (const item of items) {
    counts[item.workflowStatus] += 1;
  }
  return counts;
}

export function assignmentHasQuestionInWorkflowStatus(
  assignment: Assignment,
  status: QuestionWorkflowStatus,
  questionsByProject: Record<string, Question[]>,
  answersByProject: Record<string, Answer[]>,
): boolean {
  const questions = questionsByProject[assignment.projectId] || [];
  const allAnswers = answersByProject[assignment.projectId] || [];
  const scopedAnswers = allAnswers.filter(
    (a) =>
      a.assignmentId === assignment.id || a.contactId === assignment.recipientId,
  );
  for (const qid of assignment.questionIds || []) {
    const q = questions.find((item) => item.id === qid);
    if (!q) continue;
    if (getQuestionWorkflowState(q, scopedAnswers, [assignment]) === status) return true;
  }
  return false;
}

type WorkflowLabelSource = {
  workflowStatusNotSent: string;
  workflowStatusSentPending: string;
  workflowStatusCustomerResponded: string;
  workflowStatusSentBack: string;
  workflowStatusApproved: string;
};

export function workflowStatusLabel(
  status: QuestionWorkflowStatus,
  labels: WorkflowLabelSource,
): string {
  switch (status) {
    case 'not_sent':
      return labels.workflowStatusNotSent;
    case 'sent_pending':
      return labels.workflowStatusSentPending;
    case 'customer_responded':
      return labels.workflowStatusCustomerResponded;
    case 'sent_back':
      return labels.workflowStatusSentBack;
    case 'approved':
      return labels.workflowStatusApproved;
    default:
      return status;
  }
}
