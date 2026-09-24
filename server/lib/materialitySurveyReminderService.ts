/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Materiality survey invite/reminder emails + the in-process reminder cron.
 * The sweep is shared by the HTTP endpoint (`POST /api/materiality/surveys/
 * cron/reminders`) and the scheduled task started at boot. SQL-only.
 */

import cron, { type ScheduledTask } from 'node-cron';
import * as survey from '../data/materialitySurveyDataAccess.ts';
import { sendResendEmail } from './resendEmail.ts';
import { resolveAppPublicOrigin } from './appPublicUrl.ts';

const DAY_MS = 86_400_000;

/** TR/EN invite or reminder email for a stakeholder survey link. */
export function surveyEmailContent(opts: {
  locale: string;
  name: string;
  surveyTitle: string;
  link: string;
  reminder: boolean;
}) {
  const tr = opts.locale !== 'en';
  const subject = tr
    ? `${opts.reminder ? 'Hatırlatma: ' : ''}Önemlilik Anketi — ${opts.surveyTitle}`
    : `${opts.reminder ? 'Reminder: ' : ''}Materiality Survey — ${opts.surveyTitle}`;
  const greeting = (tr ? `Merhaba ${opts.name}` : `Hello ${opts.name}`).trim() + ',';
  const body = tr
    ? `${opts.reminder ? 'Önemlilik anketini henüz tamamlamadınız. ' : ''}"${opts.surveyTitle}" anketini doldurmak için aşağıdaki bağlantıyı kullanın. Giriş gerektirmez.`
    : `${opts.reminder ? 'You have not completed the materiality survey yet. ' : ''}Please use the link below to complete the "${opts.surveyTitle}" survey. No login required.`;
  const cta = tr ? 'Anketi Aç' : 'Open Survey';
  const text = `${greeting}\n\n${body}\n\n${cta}: ${opts.link}`;
  const html = `<div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#0f172a">
    <p>${greeting}</p><p>${body}</p>
    <p><a href="${opts.link}" style="background:#0f172a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">${cta}</a></p>
    <p style="color:#64748b;font-size:12px">${opts.link}</p></div>`;
  return { subject, text, html };
}

/**
 * Idempotent reminder sweep. For each collecting survey's pending stakeholder:
 * computes the next due reminder from `reminderCadence`, logs it first (the
 * unique (stakeholderId, reminderNumber) makes overlapping runs safe), emails,
 * and marks reminded; marks expired past the cutoff/deadline.
 */
export async function runSurveyReminderSweep(): Promise<{ checked: number; sent: number; expired: number }> {
  const origin = resolveAppPublicOrigin(process.env.APP_PUBLIC_URL ?? null);
  const now = Date.now();
  const candidates = await survey.listReminderCandidates();

  let checked = 0;
  let sent = 0;
  let expired = 0;
  for (const c of candidates) {
    checked += 1;
    if (!c.invitedAt) continue;
    const invited = c.invitedAt.getTime();
    const cutoff = Math.min(
      invited + c.reminderCutoffDays * DAY_MS,
      c.deadline ? c.deadline.getTime() : Number.POSITIVE_INFINITY,
    );
    if (now > cutoff) {
      await survey.updateStakeholder(c.id, { status: 'expired' });
      expired += 1;
      continue;
    }
    if (c.reminderCount >= c.maxReminders) continue;
    const nextDay = c.reminderCadence[c.reminderCount];
    if (nextDay == null) continue;
    if (now < invited + Number(nextDay) * DAY_MS) continue;

    const reminderNumber = c.reminderCount + 1;
    const fresh = await survey.recordReminder(c.id, reminderNumber);
    if (!fresh) continue;
    const mail = surveyEmailContent({
      locale: c.locale,
      name: c.name,
      surveyTitle: c.surveyTitle,
      link: `${origin}/#/materiality-survey/${c.inviteToken}`,
      reminder: true,
    });
    try {
      await sendResendEmail({ to: c.email, name: c.name, ...mail });
      await survey.updateStakeholder(c.id, { status: 'reminded' });
      sent += 1;
    } catch {
      /* reminder already logged; this number will not resend */
    }
  }
  return { checked, sent, expired };
}

let scheduledTask: ScheduledTask | null = null;

function cronExpression(): string {
  return String(process.env.MATERIALITY_SURVEY_REMINDERS_CRON || '0 9 * * *').trim();
}

function timeZone(): string {
  return String(
    process.env.MATERIALITY_SURVEY_REMINDER_TZ || process.env.ASSIGNMENT_REMINDER_TZ || 'Europe/Istanbul',
  ).trim();
}

function enabled(): boolean {
  const v = String(process.env.MATERIALITY_SURVEY_REMINDERS_ENABLED ?? '').trim().toLowerCase();
  return !(v === 'false' || v === '0' || v === 'off' || v === 'no');
}

/** Start the daily survey-reminder cron. Returns a stop function. */
export function startSurveyReminders(): () => void {
  if (!enabled()) {
    console.log('[materiality-survey-reminders] disabled via MATERIALITY_SURVEY_REMINDERS_ENABLED');
    return () => undefined;
  }
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const expression = cronExpression();
  try {
    scheduledTask = cron.schedule(
      expression,
      () => {
        void runSurveyReminderSweep()
          .then((r) => {
            if (r.sent || r.expired) {
              console.log(
                `[materiality-survey-reminders] checked=${r.checked} sent=${r.sent} expired=${r.expired}`,
              );
            }
          })
          .catch((err) => console.error('[materiality-survey-reminders] cron run failed:', err));
      },
      { timezone: timeZone() },
    );
    console.log(`[materiality-survey-reminders] scheduled cron="${expression}" tz=${timeZone()}`);
  } catch (err) {
    console.error('[materiality-survey-reminders] failed to schedule cron:', err);
  }

  return () => {
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }
  };
}
