/**
 * Assignment urgency (user-selected) and derived display status (deadline-aware).
 * Shared by client UI, emails, and server notification templates.
 */

export type AssignmentUrgencyLevel = 'urgent' | 'normal';

/** Derived badge / email label key (not the persisted workflow status). */
export type AssignmentDisplayStatus =
  | 'completed'
  | 'awaiting_approval'
  | 'overdue'
  | 'no_deadline'
  | 'urgent'
  | 'approaching'
  | 'normal';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeAssignmentUrgency(value: unknown): AssignmentUrgencyLevel {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'urgent' || raw === 'acil') return 'urgent';
  return 'normal';
}

function toDeadlineMs(deadline: unknown): number | null {
  if (deadline == null || deadline === '') return null;
  if (typeof deadline === 'number') {
    return Number.isFinite(deadline) && deadline > 0 ? deadline : null;
  }
  const ms = new Date(deadline as string | Date).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Priority: completed → awaiting_approval → overdue → no deadline → urgent → approaching → normal.
 */
export function resolveAssignmentDisplayStatus(input: {
  status?: string | null;
  urgency?: unknown;
  deadline?: number | Date | string | null;
  now?: number;
}): AssignmentDisplayStatus {
  const status = String(input.status || '');
  if (status === 'completed') return 'completed';
  if (status === 'awaiting_approval') return 'awaiting_approval';

  const now = input.now ?? Date.now();
  const deadlineMs = toDeadlineMs(input.deadline);

  if (deadlineMs != null && deadlineMs < now) return 'overdue';
  if (deadlineMs == null) return 'no_deadline';

  if (normalizeAssignmentUrgency(input.urgency) === 'urgent') return 'urgent';
  if (deadlineMs - now <= ONE_WEEK_MS) return 'approaching';
  return 'normal';
}

export type AssignmentDisplayStatusLabels = {
  completed: string;
  awaitingApproval: string;
  overdue: string;
  noDeadline: string;
  urgent: string;
  approaching: string;
  normal: string;
};

export function labelForAssignmentDisplayStatus(
  status: AssignmentDisplayStatus,
  labels: AssignmentDisplayStatusLabels,
): string {
  switch (status) {
    case 'completed':
      return labels.completed;
    case 'awaiting_approval':
      return labels.awaitingApproval;
    case 'overdue':
      return labels.overdue;
    case 'no_deadline':
      return labels.noDeadline;
    case 'urgent':
      return labels.urgent;
    case 'approaching':
      return labels.approaching;
    case 'normal':
    default:
      return labels.normal;
  }
}

/** Tailwind-friendly badge tone for list/pills. */
export function assignmentDisplayStatusTone(
  status: AssignmentDisplayStatus,
): 'green' | 'violet' | 'red' | 'orange' | 'amber' | 'slate' | 'blue' {
  switch (status) {
    case 'completed':
      return 'green';
    case 'awaiting_approval':
      return 'violet';
    case 'overdue':
      return 'red';
    case 'urgent':
      return 'orange';
    case 'approaching':
      return 'amber';
    case 'no_deadline':
      return 'slate';
    case 'normal':
    default:
      return 'blue';
  }
}
