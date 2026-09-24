/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence for assignment deadline reminder delivery logs.
 */

import { getPrisma } from './prismaClient.ts';
import { withExternalIds } from './entityLookup.ts';

type Row = Record<string, unknown>;

export async function listReminderKeysForAssignment(
  assignmentId: string,
): Promise<string[]> {
  const rows = await getPrisma().assignmentReminderLog.findMany({
    where: { assignmentId },
    select: { reminderKey: true },
  });
  return rows.map((r) => r.reminderKey);
}

export async function recordAssignmentReminderLog(input: {
  assignmentId: string;
  projectId: string;
  reminderKey: string;
  recipientEmail?: string;
  daysBefore?: number;
  daysAfter?: number;
  sentAt?: Date;
}): Promise<void> {
  const sentAt = input.sentAt || new Date();
  await getPrisma().assignmentReminderLog.upsert({
    where: {
      assignmentId_reminderKey: {
        assignmentId: input.assignmentId,
        reminderKey: input.reminderKey,
      },
    },
    create: {
      assignmentId: input.assignmentId,
      projectId: input.projectId,
      reminderKey: input.reminderKey,
      recipientEmail: input.recipientEmail,
      daysBefore: input.daysBefore,
      daysAfter: input.daysAfter,
      sentAt,
    },
    update: {
      recipientEmail: input.recipientEmail,
      daysBefore: input.daysBefore,
      daysAfter: input.daysAfter,
      sentAt,
      updatedAt: new Date(),
    },
  });
}

/** Clear delivery history when assignment dates change (new schedule applies). */
export async function clearAssignmentReminderLogs(
  assignmentId: string,
): Promise<number> {
  const res = await getPrisma().assignmentReminderLog.deleteMany({
    where: { assignmentId },
  });
  return res.count;
}

export async function listRecentAssignmentReminderLogs(
  limit = 50,
): Promise<Row[]> {
  const rows = await getPrisma().assignmentReminderLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 500),
  });
  return withExternalIds(rows as Row[]);
}
