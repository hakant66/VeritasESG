/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Re-export for legacy imports (e.g. ProjectDetailPage). Prefer `features/tasks/api/assignmentManage`.
 */

export {
  deleteProjectAssignment,
  resendAssignmentEmail,
  updateProjectAssignment,
  type UpdateAssignmentPayload,
} from '../features/tasks/api/assignmentManage.ts';
