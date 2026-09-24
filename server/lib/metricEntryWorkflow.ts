/**
 * Metric-entry approval stage transitions (shared by Mongo and SQL emissions paths).
 */

import type { MetricEntryApprovalStage } from './domainEnums.ts';

type StageTransition = { to: MetricEntryApprovalStage; roles: 'all' | string[] };

const ELEVATED_ROLES = ['platform_admin', 'consultant_manager', 'consultant'];

export const STAGE_TRANSITIONS: Record<MetricEntryApprovalStage, StageTransition[]> = {
  DATA_ENTRY: [{ to: 'MANAGER_REVIEW', roles: 'all' }],
  MANAGER_REVIEW: [{ to: 'HORIZON_REVIEW', roles: ELEVATED_ROLES }],
  HORIZON_REVIEW: [{ to: 'APPROVED', roles: ELEVATED_ROLES }],
  APPROVED: [{ to: 'REVISION_REQUESTED', roles: ELEVATED_ROLES }],
  REVISION_REQUESTED: [{ to: 'DATA_ENTRY', roles: 'all' }],
};

export function transitionAllowed(
  from: MetricEntryApprovalStage,
  to: MetricEntryApprovalStage,
  role: string,
): boolean {
  const transition = (STAGE_TRANSITIONS[from] || []).find((t) => t.to === to);
  if (!transition) return false;
  if (transition.roles === 'all') return true;
  return transition.roles.includes(role);
}
