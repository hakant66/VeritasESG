/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Daily automated assignment deadline reminders.
 * Delivery is logged in assignmentreminderlogs (survives restarts).
 * Interval (days before / days after) comes from Settings → global AppSetting.
 */

import cron, { type ScheduledTask } from 'node-cron';
import {
  normalizeReminderConfig,
  parseRemindersSent,
  reminderDueToday,
  reminderEmailCopyWithConfig,
  type AssignmentReminderConfig,
  type AssignmentReminderKey,
  wasReminderSent,
} from '../../lib/assignmentReminders.ts';
import { documentPublicId } from './questionIds.ts';
import { sendAssignmentReminderEmail } from './assignmentNotificationEmail.ts';
import {
  listAssignmentsForDeadlineReminders,
  updateAssignment,
} from '../data/workflowDataAccess.ts';
import { findAppSettingByKey } from '../data/appSettingDataAccess.ts';
import {
  clearAssignmentReminderLogs,
  listReminderKeysForAssignment,
  recordAssignmentReminderLog,
} from '../data/assignmentReminderLogDataAccess.ts';

let scheduledTask: ScheduledTask | null = null;

function envRemindersEnabled(): boolean {
  const raw = String(process.env.ASSIGNMENT_REMINDERS_ENABLED || 'true')
    .trim()
    .toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

function reminderCronExpression(): string {
  return String(process.env.ASSIGNMENT_REMINDERS_CRON || '0 8 * * *').trim();
}

function envReminderTimeZone(): string {
  return String(process.env.ASSIGNMENT_REMINDER_TZ || 'Europe/Istanbul').trim();
}

export async function loadAssignmentReminderConfig(): Promise<
  AssignmentReminderConfig & { enabled: boolean }
> {
  const global = (await findAppSettingByKey('global')) || {};
  const enabledSetting = global.assignmentRemindersEnabled;
  const enabledFromSettings =
    enabledSetting === undefined || enabledSetting === null
      ? true
      : !(
          enabledSetting === false ||
          enabledSetting === 0 ||
          String(enabledSetting).toLowerCase() === 'false'
        );

  const config = normalizeReminderConfig({
    daysBefore: global.assignmentReminderDaysBefore as number | undefined,
    daysAfter: global.assignmentReminderDaysAfter as number | undefined,
    timeZone:
      (global.assignmentReminderTz as string | undefined) || envReminderTimeZone(),
  });

  return {
    ...config,
    enabled: envRemindersEnabled() && enabledFromSettings,
  };
}

function assignmentPublicId(row: Record<string, unknown>): string {
  return documentPublicId(row as { id?: string; legacyFirebaseId?: string; _id?: unknown });
}

export type AssignmentReminderRunResult = {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
  config: AssignmentReminderConfig & { enabled: boolean };
  details: Array<{ assignmentId: string; key: AssignmentReminderKey; ok: boolean; error?: string }>;
};

export async function runAssignmentDeadlineReminders(
  now: Date = new Date(),
): Promise<AssignmentReminderRunResult> {
  const config = await loadAssignmentReminderConfig();
  const result: AssignmentReminderRunResult = {
    scanned: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    config,
    details: [],
  };

  if (!config.enabled) {
    console.log('[assignment-reminders] skipped run — disabled in settings/env');
    return result;
  }

  const rows = await listAssignmentsForDeadlineReminders();
  result.scanned = rows.length;

  for (const row of rows) {
    const assignmentId = assignmentPublicId(row);
    const projectId = String(row.projectId || '').trim();
    if (!assignmentId || !projectId) {
      result.skipped += 1;
      continue;
    }

    const loggedKeys = await listReminderKeysForAssignment(assignmentId);
    const mergedSent = [
      ...new Set([...parseRemindersSent(row.remindersSent), ...loggedKeys]),
    ];

    const key = reminderDueToday({
      deadline: row.deadline as string | Date | number | null | undefined,
      status: row.status as string | undefined,
      remindersSent: mergedSent,
      beginDate: row.beginDate as string | Date | number | null | undefined,
      now,
      config,
    });

    if (!key) {
      result.skipped += 1;
      continue;
    }

    if (wasReminderSent(mergedSent, key)) {
      result.skipped += 1;
      continue;
    }

    try {
      const sent = await sendAssignmentReminderEmail(projectId, assignmentId, key, {
        copy: reminderEmailCopyWithConfig(key, config),
      });

      await recordAssignmentReminderLog({
        assignmentId,
        projectId,
        reminderKey: key,
        recipientEmail: sent.recipientEmail,
        daysBefore: config.daysBefore,
        daysAfter: config.daysAfter,
        sentAt: new Date(),
      });

      const next = [...mergedSent, key];
      await updateAssignment(assignmentId, {
        remindersSent: next,
        lastReminderAt: new Date(),
        reminderCount: next.length,
      });

      row.remindersSent = next;
      row.reminderCount = next.length;

      result.sent += 1;
      result.details.push({ assignmentId, key, ok: true });
    } catch (err: unknown) {
      result.errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[assignment-reminders] failed assignment=${assignmentId} key=${key}:`,
        message,
      );
      result.details.push({ assignmentId, key, ok: false, error: message });
    }
  }

  console.log(
    `[assignment-reminders] scanned=${result.scanned} sent=${result.sent} skipped=${result.skipped} errors=${result.errors} before=${config.daysBefore} after=${config.daysAfter}`,
  );
  return result;
}

/** Reset reminder history when begin/deadline dates change. */
export async function resetAssignmentRemindersForDateChange(
  assignmentId: string,
): Promise<void> {
  await clearAssignmentReminderLogs(assignmentId);
  await updateAssignment(assignmentId, {
    remindersSent: [],
    reminderCount: 0,
    lastReminderAt: null,
  });
}

/** Start the daily reminder cron. Returns a stop function. */
export function startAssignmentDeadlineReminders(): () => void {
  if (!envRemindersEnabled()) {
    console.log('[assignment-reminders] disabled via ASSIGNMENT_REMINDERS_ENABLED');
    return () => undefined;
  }

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const expression = reminderCronExpression();
  try {
    scheduledTask = cron.schedule(expression, () => {
      void runAssignmentDeadlineReminders().catch((err) =>
        console.error('[assignment-reminders] cron run failed:', err),
      );
    });
    console.log(
      `[assignment-reminders] scheduled cron="${expression}" tz=${envReminderTimeZone()} (intervals from Settings)`,
    );
  } catch (err) {
    console.error('[assignment-reminders] failed to schedule cron:', err);
  }

  return () => {
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }
  };
}
