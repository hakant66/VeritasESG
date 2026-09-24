/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { TasksRecentActivityFilterId } from '../../../lib/tasksQuestionDateFilter';
import { TASKS_TOOLBAR_TAB_HEIGHT_CLASS } from '../../../lib/questionWorkflow';
import { cn } from '../../../lib/utils';

type TasksRecentActivitySelectProps = {
  value: TasksRecentActivityFilterId;
  onChange: (value: TasksRecentActivityFilterId) => void;
  className?: string;
};

const OPTIONS: TasksRecentActivityFilterId[] = [
  'all',
  'today',
  'yesterday',
  'this_week',
  'this_month',
];

export function TasksRecentActivitySelect({
  value,
  onChange,
  className,
}: TasksRecentActivitySelectProps) {
  const { t } = useTranslation();

  const labels: Record<TasksRecentActivityFilterId, string> = {
    all: t.tasks.recentActivityAll,
    today: t.tasks.recentActivityToday,
    yesterday: t.tasks.recentActivityYesterday,
    this_week: t.tasks.recentActivityThisWeek,
    this_month: t.tasks.recentActivityThisMonth,
  };

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2',
        className,
      )}
    >
      <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-600 sm:inline">
        {t.tasks.recentActivityUpdatedLabel}
      </span>
      <div className="relative min-w-[8.5rem]">
        <label className="sr-only" htmlFor="tasks-recent-activity-filter">
          {t.tasks.recentActivityFilterLabel}
        </label>
        <select
          id="tasks-recent-activity-filter"
          value={value}
          onChange={(e) => onChange(e.target.value as TasksRecentActivityFilterId)}
          className={cn(
            TASKS_TOOLBAR_TAB_HEIGHT_CLASS,
            'w-full min-w-[8.5rem] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200',
          )}
        >
          {OPTIONS.map((id) => (
            <option key={id} value={id}>
              {labels[id]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function getRecentActivityFilterLabel(
  filter: TasksRecentActivityFilterId,
  t: {
    tasks: {
      recentActivityAll: string;
      recentActivityToday: string;
      recentActivityYesterday: string;
      recentActivityThisWeek: string;
      recentActivityThisMonth: string;
      recentActivityFilterLabel: string;
    };
  },
): string {
  const part =
    filter === 'all'
      ? t.tasks.recentActivityAll
      : filter === 'today'
        ? t.tasks.recentActivityToday
        : filter === 'yesterday'
          ? t.tasks.recentActivityYesterday
          : filter === 'this_week'
            ? t.tasks.recentActivityThisWeek
            : t.tasks.recentActivityThisMonth;
  return `${t.tasks.recentActivityFilterLabel}: ${part}`;
}
