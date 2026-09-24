/**
 * Automated assignment deadline reminders.
 *
 * Default schedule (configurable via Settings):
 * - N days before due date
 * - on the due date
 * - daily for up to M days after overdue
 */

export type AssignmentReminderKind = 'before' | 'on_due' | 'overdue';

export type AssignmentReminderKey = string;

export type AssignmentReminderConfig = {
  /** Days before deadline to send a reminder (0 = disabled). Default 3. */
  daysBefore: number;
  /** Days after overdue to keep sending daily reminders. Default 3. */
  daysAfter: number;
  timeZone?: string;
};

export const DEFAULT_ASSIGNMENT_REMINDER_CONFIG: AssignmentReminderConfig = {
  daysBefore: 3,
  daysAfter: 3,
  timeZone: 'Europe/Istanbul',
};

export function clampReminderDays(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(30, Math.floor(n)));
}

export function normalizeReminderConfig(
  raw?: Partial<AssignmentReminderConfig> | null,
): AssignmentReminderConfig {
  return {
    daysBefore: clampReminderDays(
      raw?.daysBefore,
      DEFAULT_ASSIGNMENT_REMINDER_CONFIG.daysBefore,
    ),
    daysAfter: clampReminderDays(
      raw?.daysAfter,
      DEFAULT_ASSIGNMENT_REMINDER_CONFIG.daysAfter,
    ),
    timeZone:
      typeof raw?.timeZone === 'string' && raw.timeZone.trim()
        ? raw.timeZone.trim()
        : DEFAULT_ASSIGNMENT_REMINDER_CONFIG.timeZone,
  };
}

export function beforeReminderKey(daysBefore: number): AssignmentReminderKey {
  return `before_${daysBefore}`;
}

export function overdueReminderKey(daysOverdue: number): AssignmentReminderKey {
  return `overdue_${daysOverdue}`;
}

export function parseReminderKey(
  key: string,
): { kind: AssignmentReminderKind; days?: number } | null {
  const raw = String(key || '').trim();
  if (raw === 'on_due') return { kind: 'on_due' };
  // Legacy key from first implementation
  if (raw === 'before_3d') return { kind: 'before', days: 3 };
  const before = /^before_(\d+)$/.exec(raw);
  if (before) return { kind: 'before', days: Number(before[1]) };
  const overdue = /^overdue_(\d+)d?$/.exec(raw);
  if (overdue) return { kind: 'overdue', days: Number(overdue[1]) };
  return null;
}

export function calendarDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Calendar-day difference: deadlineDay − todayDay (positive = before due). */
export function calendarDaysUntilDeadline(
  deadline: Date | number | string,
  now: Date | number = Date.now(),
  timeZone = 'Europe/Istanbul',
): number | null {
  const deadlineMs =
    typeof deadline === 'number'
      ? deadline
      : new Date(deadline as string | Date).getTime();
  if (!Number.isFinite(deadlineMs)) return null;
  const nowMs = typeof now === 'number' ? now : now.getTime();
  if (!Number.isFinite(nowMs)) return null;

  const [dy, dm, dd] = calendarDayKey(new Date(deadlineMs), timeZone)
    .split('-')
    .map(Number);
  const [ty, tm, td] = calendarDayKey(new Date(nowMs), timeZone)
    .split('-')
    .map(Number);
  if (![dy, dm, dd, ty, tm, td].every((n) => Number.isFinite(n))) return null;

  const deadlineUtc = Date.UTC(dy, dm - 1, dd);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((deadlineUtc - todayUtc) / 86_400_000);
}

export function reminderKeyForDaysUntil(
  daysUntilDeadline: number,
  config: AssignmentReminderConfig = DEFAULT_ASSIGNMENT_REMINDER_CONFIG,
): AssignmentReminderKey | null {
  const { daysBefore, daysAfter } = normalizeReminderConfig(config);
  if (daysBefore > 0 && daysUntilDeadline === daysBefore) {
    return beforeReminderKey(daysBefore);
  }
  if (daysUntilDeadline === 0) return 'on_due';
  if (daysUntilDeadline < 0) {
    const overdueDay = Math.abs(daysUntilDeadline);
    if (overdueDay >= 1 && overdueDay <= daysAfter) {
      return overdueReminderKey(overdueDay);
    }
  }
  return null;
}

export function parseRemindersSent(value: unknown): AssignmentReminderKey[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').trim())
    .filter((v) => Boolean(v) && parseReminderKey(v) != null);
}

/** True if this logical reminder was already recorded (supports legacy key aliases). */
export function wasReminderSent(
  remindersSent: unknown,
  key: AssignmentReminderKey,
): boolean {
  const sent = parseRemindersSent(remindersSent);
  if (sent.includes(key)) return true;
  const parsed = parseReminderKey(key);
  if (!parsed) return false;
  return sent.some((existing) => {
    const other = parseReminderKey(existing);
    if (!other || other.kind !== parsed.kind) return false;
    if (parsed.kind === 'on_due') return true;
    return other.days === parsed.days;
  });
}

export function reminderDueToday(input: {
  deadline?: Date | number | string | null;
  status?: string | null;
  remindersSent?: unknown;
  beginDate?: Date | number | string | null;
  now?: Date | number;
  config?: Partial<AssignmentReminderConfig> | null;
}): AssignmentReminderKey | null {
  const status = String(input.status || 'pending');
  if (status === 'completed' || status === 'awaiting_approval') return null;
  if (input.deadline == null || input.deadline === '') return null;

  const config = normalizeReminderConfig(input.config);
  const tz = config.timeZone || 'Europe/Istanbul';
  const now = input.now ?? Date.now();

  if (input.beginDate != null && input.beginDate !== '') {
    const beginDays = calendarDaysUntilDeadline(input.beginDate, now, tz);
    if (beginDays != null && beginDays > 0) return null;
  }

  const daysUntil = calendarDaysUntilDeadline(input.deadline, now, tz);
  if (daysUntil == null) return null;

  const key = reminderKeyForDaysUntil(daysUntil, config);
  if (!key) return null;
  if (wasReminderSent(input.remindersSent, key)) return null;
  return key;
}

export function reminderEmailCopy(
  key: AssignmentReminderKey,
): { subjectSuffix: string; headline: string; bodyLine: string } {
  const parsed = parseReminderKey(key);
  if (!parsed) {
    return {
      subjectSuffix: 'Hatırlatma',
      headline: 'Görev hatırlatması',
      bodyLine: 'Atanan göreviniz için bir hatırlatma.',
    };
  }
  if (parsed.kind === 'before') {
    const d = parsed.days ?? 3;
    return {
      subjectSuffix: `Hatırlatma: son tarihe ${d} gün`,
      headline: `Görev hatırlatması — son tarihe ${d} gün kaldı`,
      bodyLine: `Atanan görevinizin son tarihine ${d} gün kaldı.`,
    };
  }
  if (parsed.kind === 'on_due') {
    return {
      subjectSuffix: 'Hatırlatma: son gün',
      headline: 'Görev hatırlatması — son gün',
      bodyLine: 'Atanan görevinizin son tarihi bugün.',
    };
  }
  const d = parsed.days ?? 1;
  const isLast = false;
  return {
    subjectSuffix: `Hatırlatma: ${d} gün gecikmiş`,
    headline: `Görev hatırlatması — ${d} gün gecikmiş`,
    bodyLine: isLast
      ? `Atanan görevinizin son tarihi ${d} gün geçti. Bu, otomatik gecikme hatırlatmalarının sonuncusudur.`
      : `Atanan görevinizin son tarihi ${d} gün geçti. Lütfen tamamlayın.`,
  };
}

export function reminderEmailCopyWithConfig(
  key: AssignmentReminderKey,
  config: AssignmentReminderConfig,
): { subjectSuffix: string; headline: string; bodyLine: string } {
  const base = reminderEmailCopy(key);
  const parsed = parseReminderKey(key);
  if (parsed?.kind === 'overdue' && parsed.days === config.daysAfter) {
    return {
      ...base,
      bodyLine: `Atanan görevinizin son tarihi ${parsed.days} gün geçti. Bu, otomatik gecikme hatırlatmalarının sonuncusudur.`,
    };
  }
  return base;
}
