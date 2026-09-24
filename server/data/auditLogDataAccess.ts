/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Audit log helpers (email delivery + generic).
 */

import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { withExternalId } from './entityLookup.ts';
import type { EmailDeliveryStatus } from '../lib/emailDeliveryAuditLog.ts';

type Row = Record<string, unknown>;

export async function createEmailAuditLog(data: {
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  collection: string;
  recordId: string;
  projectId?: string;
  details: string;
  timestamp: Date;
  emailMessageId?: string;
  emailRecipientEmail?: string;
  emailDeliveryStatus?: string;
  emailDeliveryDetail?: string;
  emailDeliveryAt?: Date;
}): Promise<void> {
  await getPrisma().auditLog.create({ data });
}

export async function findEmailAuditLogByMessageId(messageId: string): Promise<Row | null> {
  const normalized = messageId.trim().toLowerCase();
  if (!normalized) return null;

  const byField = await getPrisma().auditLog.findFirst({
    where: { collection: 'emails', emailMessageId: normalized },
  });
  if (byField) return withExternalId(byField as Row);
  const rows = await getPrisma().auditLog.findMany({
    where: { collection: 'emails' },
    take: 500,
    orderBy: { timestamp: 'desc' },
  });
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(brevoId|messageId):\\s*<?${escaped}>?`, 'i');
  const match = rows.find((row) => re.test(String(row.details || '')));
  return withExternalId((match as Row) || null);
}

export async function findRecentSentEmailAuditLog(
  recipientEmail: string,
): Promise<Row | null> {
  const row = await getPrisma().auditLog.findFirst({
    where: {
      collection: 'emails',
      emailRecipientEmail: recipientEmail,
      emailDeliveryStatus: { in: ['sent', 'deferred'] },
    },
    orderBy: { timestamp: 'desc' },
  });
  return withExternalId(row as Row | null);
}

export async function updateEmailAuditLogDelivery(
  auditLogId: string,
  data: {
    emailDeliveryStatus: EmailDeliveryStatus;
    emailDeliveryDetail: string;
    emailDeliveryAt: Date;
    details: string;
    emailMessageId?: string;
    emailRecipientEmail?: string;
  },
): Promise<void> {
  const existing = await findByIdOrLegacy(getPrisma().auditLog, auditLogId);
  if (!existing) return;
  await getPrisma().auditLog.update({
    where: { id: String(existing.id) },
    data: { ...data, updatedAt: new Date() },
  });
}
