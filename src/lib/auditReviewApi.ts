/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from './authToken.ts';

export type AuditReviewDecision = 'accept' | 'reject' | 'explanation';

export async function submitAuditReviewDecision(
  projectId: string,
  answerId: string,
  payload: {
    decision: AuditReviewDecision;
    note?: string;
    logText: string;
    questionLabel?: string;
    clientOrigin?: string;
  },
): Promise<{ success: boolean; error?: string; workflowStatus?: string }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/answers/${encodeURIComponent(answerId)}/audit-review`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        clientOrigin: payload.clientOrigin || window.location.origin,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Denetim kararı kaydedilemedi',
    };
  }
  return { success: true, workflowStatus: data.workflowStatus };
}
