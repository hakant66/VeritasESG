/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { TasksRecentActivityFilterId } from '../../../lib/tasksQuestionDateFilter';
import { cn } from '../../../lib/utils';

type TasksRecentActivityFilterProps = {
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

export function TasksRecentActivityFilter({
  value,
  onChange,
  className,
}: TasksRecentActivityFilterProps) {
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
        'flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-sm sm:gap-3',
        className,
      )}
    >
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {t.tasks.questionsFilterLabel}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:max-w-md">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          {t.tasks.recentActivityFilterLabel}
        </span>
        <div className="relative min-w-[7.5rem] flex-1">
          <label className="sr-only" htmlFor="tasks-recent-activity-filter">
            {t.tasks.recentActivityFilterLabel}
          </label>
          <select
            id="tasks-recent-activity-filter"
            value={value}
            onChange={(e) => onChange(e.target.value as TasksRecentActivityFilterId)}
            className="h-9 w-full min-w-[7.5rem] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50/80 pl-3 pr-9 text-[11px] font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
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
