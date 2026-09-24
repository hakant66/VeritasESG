/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createEmailAuditLog,
  findEmailAuditLogByMessageId,
  findRecentSentEmailAuditLog,
  updateEmailAuditLogDelivery,
} from '../data/auditLogDataAccess.ts';

export type EmailDeliveryType =
  | 'assignment'
  | 'assignment_resend'
  | 'assignment_reminder'
  | 'otp'
  | 'password_reset'
  | 'generic';

export type EmailDeliveryAuditActor = {
  userId?: string;
  userName?: string;
  userEmail?: string;
};

export type EmailDeliveryStatus =
  | 'sent'
  | 'delivered'
  | 'deferred'
  | 'bounced'
  | 'blocked'
  | 'spam'
  | 'failed';

export type EmailDeliveryAuditInput = {
  emailType: EmailDeliveryType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  projectId?: string;
  recordId?: string;
  messageId?: string;
  error?: string;
  triggeredBy?: EmailDeliveryAuditActor;
};

/** Resend webhook event types → internal delivery status */
const RESEND_EVENT_TO_STATUS: Record<string, EmailDeliveryStatus> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'deferred',
  'email.bounced': 'bounced',
  'email.complained': 'spam',
  'email.failed': 'failed',
  'email.suppressed': 'blocked',
};

function trimDetail(value: string, max = 200): string {
  const s = String(value || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function normalizeEmailMessageId(messageId: string): string {
  return String(messageId || '').trim().toLowerCase();
}

function appendDeliveryToDetails(
  details: string,
  status: EmailDeliveryStatus,
  detail?: string,
): string {
  const base = String(details || '').trim();
  const withoutOld = base
    .replace(/\s*·\s*delivery:\s*[^·]+/gi, '')
    .replace(/\s*·\s*deliveryDetail:\s*[^·]+/gi, '')
    .trim();
  const parts = [withoutOld, `delivery: ${status}`];
  if (detail) parts.push(`deliveryDetail: ${trimDetail(detail, 120)}`);
  return parts.filter(Boolean).join(' · ');
}

export function buildEmailDeliveryAuditDetails(input: EmailDeliveryAuditInput): string {
  const initialStatus: EmailDeliveryStatus = input.error ? 'failed' : 'sent';
  const parts = [
    input.error
      ? `Email failed to ${input.recipientEmail}`
      : `Email sent to ${input.recipientEmail}`,
    `type: ${input.emailType}`,
    `subject: ${trimDetail(input.subject, 120)}`,
  ];
  if (input.messageId) parts.push(`messageId: ${input.messageId}`);
  if (input.error) parts.push(`error: ${trimDetail(input.error)}`);
  parts.push(`delivery: ${initialStatus}`);
  return parts.join(' · ');
}

export async function recordEmailDeliveryAudit(input: EmailDeliveryAuditInput): Promise<void> {
  const actor = input.triggeredBy;
  const userId = String(actor?.userId || 'system').trim() || 'system';
  const userName = String(actor?.userName || 'System').trim() || 'System';
  const userEmail =
    String(actor?.userEmail || 'noreply@system').trim().toLowerCase() || 'noreply@system';

  const recordId =
    input.recordId ||
    input.messageId ||
    `${input.recipientEmail}-${Date.now()}`;

  const recipientEmail = String(input.recipientEmail || '').trim().toLowerCase();
  const messageId = input.messageId ? normalizeEmailMessageId(input.messageId) : undefined;
  const deliveryStatus: EmailDeliveryStatus = input.error ? 'failed' : 'sent';

  try {
    await createEmailAuditLog({
      userId,
      userName,
      userEmail,
      action: 'create',
      collection: 'emails',
      recordId: trimDetail(String(recordId), 200),
      projectId: input.projectId || undefined,
      details: buildEmailDeliveryAuditDetails(input),
      timestamp: new Date(),
      emailMessageId: messageId || undefined,
      emailRecipientEmail: recipientEmail || undefined,
      emailDeliveryStatus: deliveryStatus,
      emailDeliveryDetail: input.error ? trimDetail(input.error) : undefined,
      emailDeliveryAt: input.error ? new Date() : undefined,
    });
  } catch (err) {
    console.error('[EMAIL AUDIT LOG ERROR]', err);
  }
}

export function mapResendEventToDeliveryStatus(eventType: string): EmailDeliveryStatus {
  const key = String(eventType || '').trim();
  return RESEND_EVENT_TO_STATUS[key] || 'failed';
}

function firstRecipient(to: unknown): string {
  if (Array.isArray(to)) {
    return String(to[0] || '').trim().toLowerCase();
  }
  return String(to || '').trim().toLowerCase();
}

export async function applyResendWebhookEvent(
  payload: Record<string, unknown>,
): Promise<{ matched: boolean; status?: EmailDeliveryStatus; messageId?: string }> {
  const eventType = String(payload.type || '').trim();
  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : {};

  const rawMessageId = String(data.email_id || data.id || '').trim();
  const messageId = normalizeEmailMessageId(rawMessageId);
  const recipientEmail = firstRecipient(data.to);

  const bounce =
    data.bounce && typeof data.bounce === 'object'
      ? (data.bounce as Record<string, unknown>)
      : null;
  const reason = trimDetail(
    String(
      bounce?.message ||
        bounce?.type ||
        data.error ||
        eventType ||
        '',
    ).trim(),
  );

  if (!messageId && !recipientEmail) {
    return { matched: false };
  }

  const status = mapResendEventToDeliveryStatus(eventType);
  const log = messageId
    ? await findEmailAuditLogByMessageId(messageId)
    : await findRecentSentEmailAuditLog(recipientEmail);

  if (!log) {
    console.warn('[RESEND WEBHOOK] No matching email audit log', {
      eventType,
      messageId: rawMessageId,
      recipientEmail,
    });
    return { matched: false, messageId: rawMessageId };
  }

  const deliveryDetail = reason || eventType || status;
  const updatedDetails = appendDeliveryToDetails(
    String(log.details || ''),
    status,
    deliveryDetail,
  );

  await updateEmailAuditLogDelivery(String(log.id || log._id), {
    emailDeliveryStatus: status,
    emailDeliveryDetail: deliveryDetail,
    emailDeliveryAt: new Date(),
    details: updatedDetails,
    ...(messageId && !log.emailMessageId ? { emailMessageId: messageId } : {}),
    ...(recipientEmail && !log.emailRecipientEmail
      ? { emailRecipientEmail: recipientEmail }
      : {}),
  });

  console.log('[RESEND WEBHOOK] Updated email audit log', {
    eventType,
    status,
    messageId: rawMessageId,
    auditId: String(log.id || log._id),
  });

  return { matched: true, status, messageId: rawMessageId };
}
