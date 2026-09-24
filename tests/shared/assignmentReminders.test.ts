/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  calendarDaysUntilDeadline,
  reminderDueToday,
  reminderKeyForDaysUntil,
  wasReminderSent,
} from '../../lib/assignmentReminders.ts';

describe('assignmentReminders', () => {
  const tz = 'Europe/Istanbul';
  const config = { daysBefore: 3, daysAfter: 3, timeZone: tz };

  it('maps calendar offsets to reminder keys for configured intervals', () => {
    expect(reminderKeyForDaysUntil(3, config)).toBe('before_3');
    expect(reminderKeyForDaysUntil(0, config)).toBe('on_due');
    expect(reminderKeyForDaysUntil(-1, config)).toBe('overdue_1');
    expect(reminderKeyForDaysUntil(-2, config)).toBe('overdue_2');
    expect(reminderKeyForDaysUntil(-3, config)).toBe('overdue_3');
    expect(reminderKeyForDaysUntil(2, config)).toBeNull();
    expect(reminderKeyForDaysUntil(-4, config)).toBeNull();
  });

  it('respects custom daysBefore / daysAfter', () => {
    const custom = { daysBefore: 5, daysAfter: 1, timeZone: tz };
    expect(reminderKeyForDaysUntil(5, custom)).toBe('before_5');
    expect(reminderKeyForDaysUntil(3, custom)).toBeNull();
    expect(reminderKeyForDaysUntil(-1, custom)).toBe('overdue_1');
    expect(reminderKeyForDaysUntil(-2, custom)).toBeNull();
  });

  it('computes calendar days until deadline in timezone', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const dueSameDay = new Date('2026-07-26T20:00:00.000Z');
    const dueIn3Days = new Date('2026-07-29T10:00:00.000Z');
    const overdue1 = new Date('2026-07-25T10:00:00.000Z');

    expect(calendarDaysUntilDeadline(dueSameDay, now, tz)).toBe(0);
    expect(calendarDaysUntilDeadline(dueIn3Days, now, tz)).toBe(3);
    expect(calendarDaysUntilDeadline(overdue1, now, tz)).toBe(-1);
  });

  it('returns due key once and skips completed / already-sent', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const deadline = new Date('2026-07-29T10:00:00.000Z');

    expect(
      reminderDueToday({
        deadline,
        status: 'pending',
        remindersSent: [],
        now,
        config,
      }),
    ).toBe('before_3');

    expect(
      reminderDueToday({
        deadline,
        status: 'pending',
        remindersSent: ['before_3'],
        now,
        config,
      }),
    ).toBeNull();

    expect(wasReminderSent(['before_3d'], 'before_3')).toBe(true);

    expect(
      reminderDueToday({
        deadline,
        status: 'completed',
        remindersSent: [],
        now,
        config,
      }),
    ).toBeNull();
  });

  it('skips reminders before beginDate', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    expect(
      reminderDueToday({
        deadline: new Date('2026-07-29T10:00:00.000Z'),
        beginDate: new Date('2026-07-28T10:00:00.000Z'),
        status: 'pending',
        remindersSent: [],
        now,
        config,
      }),
    ).toBeNull();
  });
});
