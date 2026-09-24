/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from '../../../lib/authToken.ts';

export async function notifyProjectManagerForAssignment(
  projectId: string,
  assignmentId: string,
  options?: { clientOrigin?: string },
): Promise<{ success: boolean; error?: string; managersNotified?: number }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(assignmentId)}/notify-project-manager`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clientOrigin: options?.clientOrigin || window.location.origin,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Proje yöneticisine bildirim gönderilemedi',
    };
  }
  return {
    success: true,
    managersNotified: data.managersNotified,
  };
}
