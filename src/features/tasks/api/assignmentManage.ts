/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuthToken } from '../../../lib/authToken.ts';

export type UpdateAssignmentPayload = {
  recipientId?: string;
  recipientType?: 'contact' | 'user';
  beginDate?: string | number;
  deadline?: string | number;
  urgency?: 'urgent' | 'normal';
  approverId?: string;
  approverType?: 'contact' | 'user';
  reassignNote?: string;
  reassignQuestionId?: string;
  reassignQuestionLabel?: string;
};

export async function updateProjectAssignment(
  projectId: string,
  assignmentId: string,
  payload: UpdateAssignmentPayload,
): Promise<{ success: boolean; error?: string }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(assignmentId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Atama güncellenemedi',
    };
  }
  return { success: true };
}

export async function resendAssignmentEmail(
  projectId: string,
  assignmentId: string,
  options?: { clientOrigin?: string },
): Promise<{ success: boolean; error?: string; recipientEmail?: string }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(assignmentId)}/resend-email`,
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
      error: data?.error || 'E-posta gönderilemedi',
    };
  }
  return {
    success: true,
    recipientEmail: data.recipientEmail,
  };
}

export async function submitAssignmentForApproval(
  projectId: string,
  assignmentId: string,
  options?: { clientOrigin?: string },
): Promise<{ success: boolean; error?: string; approverEmail?: string }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(assignmentId)}/submit-for-approval`,
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
      error: data?.error || 'Görev onaya gönderilemedi',
    };
  }
  return { success: true, approverEmail: data.approverEmail };
}

export async function approveProjectAssignment(
  projectId: string,
  assignmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(assignmentId)}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Görev onaylanamadı',
    };
  }
  return { success: true };
}

export async function deleteProjectAssignment(
  projectId: string,
  assignmentId: string,
): Promise<{ success: boolean; error?: string; answersDeleted?: number }> {
  const token = getAuthToken();
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assignments/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || 'Atama silinemedi',
    };
  }
  return {
    success: true,
    answersDeleted: data.answersDeleted,
  };
}
