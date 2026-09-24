/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fragment } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Filter,
  Hourglass,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import type { TasksRecentActivityFilterId } from '../../../lib/tasksQuestionDateFilter';
import {
  TASKS_TOOLBAR_TAB_HEIGHT_CLASS,
  type TasksToolbarTabId,
} from '../../../lib/questionWorkflow';
import { TasksRecentActivitySelect } from './TasksRecentActivitySelect';
import { cn } from '../../../lib/utils';

export type { TasksToolbarTabId };

type TasksQuestionsToolbarProps = {
  activeTab: TasksToolbarTabId;
  onTabChange: (tab: TasksToolbarTabId) => void;
  tabCounts: Record<TasksToolbarTabId, number>;
  tabLabels: Record<TasksToolbarTabId, string>;
  recentActivityFilter: TasksRecentActivityFilterId;
  onRecentActivityFilterChange: (value: TasksRecentActivityFilterId) => void;
};

const TAB_STEPS: {
  key: TasksToolbarTabId;
  Icon: typeof Filter;
}[] = [
  { key: 'questions_filter', Icon: Filter },
  { key: 'sent_pending', Icon: Hourglass },
  { key: 'customer_responded', Icon: UserCheck },
  { key: 'sent_back', Icon: RotateCcw },
  { key: 'approved', Icon: CheckCircle2 },
];

export function TasksQuestionsToolbar({
  activeTab,
  onTabChange,
  tabCounts,
  tabLabels,
  recentActivityFilter,
  onRecentActivityFilterChange,
}: TasksQuestionsToolbarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
      <TasksRecentActivitySelect
        value={recentActivityFilter}
        onChange={onRecentActivityFilterChange}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm no-scrollbar">
        {TAB_STEPS.map((step, idx) => (
          <Fragment key={step.key}>
            {idx > 0 ? (
              <div
                className={cn(
                  'flex w-4 shrink-0 items-center justify-center text-slate-300/90',
                  TASKS_TOOLBAR_TAB_HEIGHT_CLASS,
                )}
                aria-hidden
              >
                <ChevronRight size={16} strokeWidth={2} />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onTabChange(step.key)}
              title={tabLabels[step.key]}
              aria-label={`${tabLabels[step.key]} (${tabCounts[step.key] ?? 0})`}
              className={cn(
                TASKS_TOOLBAR_TAB_HEIGHT_CLASS,
                'flex shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-2 transition-all sm:gap-2 sm:px-2.5',
                activeTab === step.key
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'text-slate-500 hover:border-slate-200 hover:bg-slate-50/80',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                  activeTab === step.key
                    ? 'border-blue-200 bg-blue-100 text-blue-700'
                    : 'border-slate-200/80 bg-slate-100 text-slate-500',
                )}
              >
                <step.Icon size={14} strokeWidth={2} className="shrink-0" />
              </span>
              <span className="whitespace-nowrap text-[9px] font-bold uppercase leading-snug tracking-wide sm:text-[10px]">
                {tabLabels[step.key]}
              </span>
              <span
                className={cn(
                  'min-w-[1.125rem] shrink-0 rounded-md px-1.5 py-0.5 text-center text-[9px] font-bold leading-none tabular-nums',
                  activeTab === step.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200/70 text-slate-600',
                )}
              >
                {tabCounts[step.key] ?? 0}
              </span>
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
