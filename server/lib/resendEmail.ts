/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resend } from 'resend';
import {
  recordEmailDeliveryAudit,
  type EmailDeliveryAuditActor,
  type EmailDeliveryType,
} from './emailDeliveryAuditLog.ts';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const DEFAULT_EMAIL_FROM_NAME =
  process.env.RESEND_FROM_NAME || 'Impact AI VeritasESG';
const DEFAULT_EMAIL_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || '';
const DEFAULT_REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO_EMAIL || '';
const DEFAULT_REPLY_TO_NAME =
  process.env.RESEND_REPLY_TO_NAME || DEFAULT_EMAIL_FROM_NAME;

export type ResendEmailAuditMeta = {
  emailType: EmailDeliveryType;
  projectId?: string;
  recordId?: string;
  triggeredBy?: EmailDeliveryAuditActor;
};

export type ResendEmailPayload = {
  to: string;
  name: string;
  subject: string;
  text: string;
  html?: string;
  cc?: { email: string; name: string }[];
  replyTo?: { email: string; name: string };
  tags?: string[];
  audit?: ResendEmailAuditMeta;
};

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

function formatFromAddress(name: string, email: string): string {
  const safeName = String(name || '').trim() || email.split('@')[0] || 'VeritasESG';
  return `${safeName} <${email}>`;
}

export async function sendResendEmail(payload: ResendEmailPayload) {
  if (!RESEND_API_KEY) {
    const err = new Error('Resend API key is not configured');
    if (payload.audit) {
      await recordEmailDeliveryAudit({
        emailType: payload.audit.emailType,
        recipientEmail: payload.to,
        recipientName: payload.name,
        subject: payload.subject,
        projectId: payload.audit.projectId,
        recordId: payload.audit.recordId,
        error: err.message,
        triggeredBy: payload.audit.triggeredBy,
      });
    }
    throw err;
  }
  if (!DEFAULT_EMAIL_FROM_EMAIL) {
    const err = new Error('Resend sender email is not configured');
    if (payload.audit) {
      await recordEmailDeliveryAudit({
        emailType: payload.audit.emailType,
        recipientEmail: payload.to,
        recipientName: payload.name,
        subject: payload.subject,
        projectId: payload.audit.projectId,
        recordId: payload.audit.recordId,
        error: err.message,
        triggeredBy: payload.audit.triggeredBy,
      });
    }
    throw err;
  }

  const replyTo =
    payload.replyTo?.email ||
    DEFAULT_REPLY_TO_EMAIL ||
    undefined;

  const tags = (payload.tags || []).map((tag) => ({
    name: 'category',
    value: String(tag).slice(0, 256),
  }));

  const { data, error } = await getResendClient().emails.send({
    from: formatFromAddress(DEFAULT_EMAIL_FROM_NAME, DEFAULT_EMAIL_FROM_EMAIL),
    to: [String(payload.to).trim()],
    subject: payload.subject,
    text: payload.text,
    html: payload.html || payload.text.replace(/\n/g, '<br/>'),
    ...(payload.cc?.length ? { cc: payload.cc.map((c) => c.email) } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(tags.length ? { tags } : {}),
  });

  if (error) {
    const msg = error.message || 'Resend API returned an error';
    console.error('[RESEND API ERROR]', {
      message: msg,
      from: DEFAULT_EMAIL_FROM_EMAIL,
      to: payload.to,
    });
    if (payload.audit) {
      await recordEmailDeliveryAudit({
        emailType: payload.audit.emailType,
        recipientEmail: payload.to,
        recipientName: payload.name,
        subject: payload.subject,
        projectId: payload.audit.projectId,
        recordId: payload.audit.recordId,
        error: msg,
        triggeredBy: payload.audit.triggeredBy,
      });
    }
    throw new Error(msg);
  }

  const messageId = data?.id;
  console.log('[RESEND API OK]', {
    to: payload.to,
    from: DEFAULT_EMAIL_FROM_EMAIL,
    messageId,
  });

  if (payload.audit) {
    await recordEmailDeliveryAudit({
      emailType: payload.audit.emailType,
      recipientEmail: payload.to,
      recipientName: payload.name,
      subject: payload.subject,
      projectId: payload.audit.projectId,
      recordId: payload.audit.recordId,
      messageId: typeof messageId === 'string' ? messageId : undefined,
      triggeredBy: payload.audit.triggeredBy,
    });
  }

  return { messageId };
}
