/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sendResendEmail } from './resendEmail.ts';
import { findAssignmentForProject } from './assignmentManageAccess.ts';
import { documentPublicId } from './questionIds.ts';
import { resolveAppPublicOrigin } from './appPublicUrl.ts';
import type { EmailDeliveryAuditActor } from './emailDeliveryAuditLog.ts';
import {
  labelForAssignmentDisplayStatus,
  resolveAssignmentDisplayStatus,
} from '../../lib/assignmentUrgency.ts';
import {
  findContactByExternalId,
  findPlatformUserByEmailOrRecipient,
  findPlatformUserByExternalId,
  findProjectByParam,
  findProjectUserAssignment,
  updateAssignment,
} from '../data/workflowDataAccess.ts';

function formatDeadline(value: unknown): string {
  const ms =
    typeof value === 'number'
      ? value
      : value
        ? new Date(value as string | Date).getTime()
        : NaN;
  if (Number.isNaN(ms)) return '—';
  return new Date(ms).toLocaleDateString('tr-TR');
}

async function resolveRecipient(
  recipientId: string,
  recipientType: 'contact' | 'user',
) {
  const recipient =
    recipientType === 'contact'
      ? await findContactByExternalId(recipientId)
      : await findPlatformUserByExternalId(recipientId);
  if (!recipient) return null;
  return {
    email: String(recipient.email || '').trim(),
    name: String(recipient.name || recipient.email || recipientId).trim(),
  };
}

async function resolveAssignmentLink(
  assignment: {
    projectId?: string;
    recipientId?: string;
    recipientType?: 'contact' | 'user';
    token?: string;
  },
  recipientEmail: string,
  clientOrigin?: string | null,
): Promise<string> {
  const origin = resolveAppPublicOrigin(clientOrigin);
  if (assignment.recipientType === 'contact' && assignment.token) {
    return `${origin}/#/respond/${assignment.token}`;
  }

  if (assignment.recipientType === 'user') {
    const user = await findPlatformUserByEmailOrRecipient(
      recipientEmail.toLowerCase(),
      assignment.recipientId,
    );

    const projectId = String(assignment.projectId || '');
    const userId = user ? documentPublicId(user as { _id?: unknown; legacyFirebaseId?: string; id?: string }) : '';
    const projectRole = userId
      ? await findProjectUserAssignment(projectId, [userId])
      : null;

    const role = String(user?.role || '');
    const isContributor =
      (role === 'contributor' || role === 'customer') &&
      (projectRole?.role === 'contributor' || projectRole?.role === 'viewer');

    if (isContributor && recipientEmail) {
      const params = new URLSearchParams({ email: recipientEmail });
      return `${origin}/#/login/forceotp?${params.toString()}`;
    }

    return `${origin}/#/tasks`;
  }

  return `${origin}/#/tasks`;
}

export type AssignmentEmailPayload = {
  subject: string;
  text: string;
  html: string;
  cc?: { email: string; name: string }[];
};

export async function buildAssignmentNotificationEmail(
  projectId: string,
  assignmentId: string,
  options?: { clientOrigin?: string | null },
): Promise<{
  recipientEmail: string;
  recipientName: string;
  email: AssignmentEmailPayload;
}> {
  const assignment = await findAssignmentForProject(projectId, assignmentId);
  if (!assignment) {
    throw new Error('Atama bulunamadı');
  }

  const recipientType = (assignment.recipientType || 'user') as 'contact' | 'user';
  const recipient = await resolveRecipient(
    String(assignment.recipientId),
    recipientType,
  );
  if (!recipient?.email) {
    throw new Error('Alıcı e-posta adresi bulunamadı');
  }

  const project = await findProjectByParam(projectId);
  const projectName = String(project?.name || 'Proje');
  const questionCount = Array.isArray(assignment.questionIds)
    ? assignment.questionIds.length
    : 0;
  const ref = String((assignment as any).message || '').trim();
  const deadline = formatDeadline(assignment.deadline);
  const displayStatus = resolveAssignmentDisplayStatus({
    status: String(assignment.status || 'pending'),
    urgency: (assignment as { urgency?: unknown }).urgency,
    deadline: assignment.deadline as string | Date | number | null | undefined,
  });
  const statusLabel = labelForAssignmentDisplayStatus(displayStatus, {
    completed: 'Tamamlandı',
    awaitingApproval: 'Onaylama bekliyor',
    overdue: 'Gecikmiş',
    noDeadline: 'Süre verilmemiş',
    urgent: 'Acil',
    approaching: 'Yaklaşıyor',
    normal: 'Normal',
  });
  const magicLink = await resolveAssignmentLink(
    assignment,
    recipient.email,
    options?.clientOrigin,
  );

  const subject = `${projectName} — Görev ataması`;
  const text = [
    `Merhaba ${recipient.name},`,
    '',
    `"${projectName}" projesinde size ${questionCount} soruluk bir görev atanmıştır.`,
    ref ? `Atama referansı: ${ref}` : '',
    `Son tarih: ${deadline}`,
    `Görev durumu: ${statusLabel}`,
    '',
    `Görevlerinize buradan ulaşabilirsiniz:`,
    magicLink,
    '',
    'Impact AI VeritasESG',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
      <p>Merhaba ${recipient.name},</p>
      <p><strong>${projectName}</strong> projesinde size <strong>${questionCount}</strong> soruluk bir görev atanmıştır.</p>
      ${ref ? `<p>Atama referansı: <strong>${ref}</strong></p>` : ''}
      <p>Son tarih: <strong>${deadline}</strong></p>
      <p>Görev durumu: <strong>${statusLabel}</strong></p>
      <div style="margin: 24px 0;">
        <a href="${magicLink}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Görevlerim</a>
      </div>
      <p>Impact AI VeritasESG</p>
    </div>
  `.trim();

  return {
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    email: { subject, text, html },
  };
}

export async function sendAssignmentNotificationEmail(
  projectId: string,
  assignmentId: string,
  options?: {
    cc?: { email: string; name: string }[];
    emailOverride?: AssignmentEmailPayload;
    clientOrigin?: string | null;
    emailType?: 'assignment' | 'assignment_resend';
    triggeredBy?: EmailDeliveryAuditActor;
  },
) {
  const built = await buildAssignmentNotificationEmail(
    projectId,
    assignmentId,
    { clientOrigin: options?.clientOrigin },
  );
  const payload = options?.emailOverride ?? built.email;

  console.log(
    `[EMAIL] To: ${built.recipientName} <${built.recipientEmail}> (assignment ${assignmentId})`,
  );

  await sendResendEmail({
    to: built.recipientEmail,
    name: built.recipientName,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    cc: options?.cc,
    tags: ['veritasesg-assignment'],
    audit: {
      emailType: options?.emailType || 'assignment',
      projectId,
      recordId: assignmentId,
      triggeredBy: options?.triggeredBy,
    },
  });

  return { recipientEmail: built.recipientEmail };
}

export async function sendAssignmentEmailPayload(payload: {
  email: string;
  name: string;
  subject: string;
  text: string;
  html: string;
  cc?: { email: string; name: string }[];
  projectId?: string;
  assignmentId?: string;
  triggeredBy?: EmailDeliveryAuditActor;
}) {
  const to = String(payload.email || '').trim();
  if (!to) throw new Error('email gereklidir');
  console.log(`[EMAIL] To: ${payload.name} <${to}> via Resend`);
  await sendResendEmail({
    to,
    name: payload.name || to.split('@')[0] || to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    cc: payload.cc,
    tags: ['veritasesg-assignment'],
    audit: {
      emailType: 'assignment',
      projectId: payload.projectId,
      recordId: payload.assignmentId,
      triggeredBy: payload.triggeredBy,
    },
  });
}

/** Persist contact magic-link token on merged assignment when provided. */
export async function attachContactTokenToAssignment(
  assignmentId: unknown,
  token: string,
  tokenExpiryMs: number,
) {
  await updateAssignment(String(assignmentId), {
    token,
    tokenExpiry: new Date(tokenExpiryMs),
  });
}

/** Notify the assigned approver that work is ready for approval. */
export async function sendAssignmentApprovalRequestEmail(
  projectId: string,
  assignmentId: string,
  options?: {
    clientOrigin?: string | null;
    triggeredBy?: EmailDeliveryAuditActor;
  },
): Promise<{ recipientEmail: string }> {
  const assignment = await findAssignmentForProject(projectId, assignmentId);
  if (!assignment) throw new Error('Atama bulunamadı');

  const approverId = String(
    (assignment as { approverId?: string }).approverId || '',
  ).trim();
  const approverType = ((assignment as { approverType?: string }).approverType ||
    'user') as 'contact' | 'user';
  if (!approverId) throw new Error('Onaylayıcı tanımlanmamış');

  const approver = await resolveRecipient(approverId, approverType);
  if (!approver?.email) throw new Error('Onaylayıcı e-posta adresi bulunamadı');

  const project = await findProjectByParam(projectId);
  const projectName = String(project?.name || 'Proje');
  const questionCount = Array.isArray(assignment.questionIds)
    ? assignment.questionIds.length
    : 0;
  const origin = resolveAppPublicOrigin(options?.clientOrigin);
  const tasksLink = `${origin}/#/tasks`;

  const subject = `${projectName} — Onayınız bekleniyor`;
  const text = [
    `Merhaba ${approver.name},`,
    '',
    `"${projectName}" projesinde ${questionCount} soruluk bir görev onayınızı bekliyor.`,
    '',
    'Görevi incelemek ve onaylamak için:',
    tasksLink,
    '',
    'Impact AI VeritasESG',
  ].join('\n');

  const html = `
    <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
      <p>Merhaba ${approver.name},</p>
      <p><strong>${projectName}</strong> projesinde <strong>${questionCount}</strong> soruluk bir görev <strong>onayınızı bekliyor</strong>.</p>
      <div style="margin: 24px 0;">
        <a href="${tasksLink}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Görevler</a>
      </div>
      <p>Impact AI VeritasESG</p>
    </div>
  `.trim();

  await sendResendEmail({
    to: approver.email,
    name: approver.name,
    subject,
    text,
    html,
    tags: ['veritasesg-assignment-approval'],
    audit: {
      emailType: 'assignment',
      projectId,
      recordId: assignmentId,
      triggeredBy: options?.triggeredBy,
    },
  });

  return { recipientEmail: approver.email };
}

export async function sendAssignmentReminderEmail(
  projectId: string,
  assignmentId: string,
  reminderKey: import('../../lib/assignmentReminders.ts').AssignmentReminderKey,
  options?: {
    clientOrigin?: string | null;
    copy?: { subjectSuffix: string; headline: string; bodyLine: string };
  },
): Promise<{ recipientEmail: string }> {
  const { reminderEmailCopy } = await import('../../lib/assignmentReminders.ts');
  const assignment = await findAssignmentForProject(projectId, assignmentId);
  if (!assignment) throw new Error('Atama bulunamadı');

  const recipientType = (assignment.recipientType || 'user') as 'contact' | 'user';
  const recipient = await resolveRecipient(
    String(assignment.recipientId),
    recipientType,
  );
  if (!recipient?.email) throw new Error('Alıcı e-posta adresi bulunamadı');

  const project = await findProjectByParam(projectId);
  const projectName = String(project?.name || 'Proje');
  const questionCount = Array.isArray(assignment.questionIds)
    ? assignment.questionIds.length
    : 0;
  const deadline = formatDeadline(assignment.deadline);
  const copy = options?.copy || reminderEmailCopy(reminderKey);
  const magicLink = await resolveAssignmentLink(
    assignment,
    recipient.email,
    options?.clientOrigin,
  );

  const subject = `${projectName} — ${copy.subjectSuffix}`;
  const text = [
    `Merhaba ${recipient.name},`,
    '',
    copy.headline,
    copy.bodyLine,
    '',
    `"${projectName}" — ${questionCount} soru`,
    `Son tarih: ${deadline}`,
    '',
    `Görevlerinize buradan ulaşabilirsiniz:`,
    magicLink,
    '',
    'Impact AI VeritasESG',
  ].join('\n');

  const html = `
    <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
      <p>Merhaba ${recipient.name},</p>
      <p><strong>${copy.headline}</strong></p>
      <p>${copy.bodyLine}</p>
      <p><strong>${projectName}</strong> — ${questionCount} soru</p>
      <p>Son tarih: <strong>${deadline}</strong></p>
      <div style="margin: 24px 0;">
        <a href="${magicLink}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Görevlerim</a>
      </div>
      <p>Impact AI VeritasESG</p>
    </div>
  `.trim();

  await sendResendEmail({
    to: recipient.email,
    name: recipient.name,
    subject,
    text,
    html,
    tags: ['veritasesg-assignment-reminder', reminderKey],
    audit: {
      emailType: 'assignment_reminder',
      projectId,
      recordId: assignmentId,
    },
  });

  return { recipientEmail: recipient.email };
}
