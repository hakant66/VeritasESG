/**
 * Assignment completion → approval helpers (shared client + server).
 */

export type AssignmentWorkflowStatus =
  | 'pending'
  | 'overdue'
  | 'awaiting_approval'
  | 'completed';

/** When the assignee marks work done: await approval if an approver is set. */
export function resolveStatusAfterAssigneeComplete(input: {
  approverId?: string | null;
}): 'awaiting_approval' | 'completed' {
  const id = String(input.approverId || '').trim();
  return id ? 'awaiting_approval' : 'completed';
}

export function assignmentHasApprover(input: {
  approverId?: string | null;
}): boolean {
  return Boolean(String(input.approverId || '').trim());
}
