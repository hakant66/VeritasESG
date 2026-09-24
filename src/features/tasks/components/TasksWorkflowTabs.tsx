/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fragment } from 'react';
import { ChevronRight, Hourglass, RotateCcw, UserCheck, CheckCircle2 } from 'lucide-react';
import type { TasksWorkflowFilterId } from '../../../lib/questionWorkflow';
import { cn } from '../../../lib/utils';

export type { TasksWorkflowFilterId };

type TasksWorkflowTabsProps = {
  active: TasksWorkflowFilterId;
  onChange: (id: TasksWorkflowFilterId) => void;
  counts: Record<TasksWorkflowFilterId, number>;
  labels: Record<TasksWorkflowFilterId, string>;
};

const STEPS: {
  key: TasksWorkflowFilterId;
  Icon: typeof Hourglass;
}[] = [
  { key: 'sent_pending', Icon: Hourglass },
  { key: 'customer_responded', Icon: UserCheck },
  { key: 'sent_back', Icon: RotateCcw },
  { key: 'approved', Icon: CheckCircle2 },
];

export function TasksWorkflowTabs({
  active,
  onChange,
  counts,
  labels,
}: TasksWorkflowTabsProps) {
  return (
    <div className="flex min-w-0 flex-row items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-sm no-scrollbar">
      {STEPS.map((step, idx) => (
        <Fragment key={step.key}>
          {idx > 0 ? (
            <div
              className="flex h-10 w-4 shrink-0 items-center justify-center text-slate-300/90"
              aria-hidden
            >
              <ChevronRight size={16} strokeWidth={2} />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onChange(step.key)}
            title={labels[step.key]}
            aria-label={`${labels[step.key]} (${counts[step.key]})`}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-2 transition-all sm:gap-2 sm:px-2.5',
              active === step.key
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'text-slate-500 hover:border-slate-200 hover:bg-slate-50/80',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                active === step.key
                  ? 'border-blue-200 bg-blue-100 text-blue-700'
                  : 'border-slate-200/80 bg-slate-100 text-slate-500',
              )}
            >
              <step.Icon size={14} strokeWidth={2} className="shrink-0" />
            </span>
            <span className="whitespace-nowrap text-[9px] font-bold uppercase leading-snug tracking-wide sm:text-[10px]">
              {labels[step.key]}
            </span>
            <span
              className={cn(
                'min-w-[1.125rem] shrink-0 rounded-md px-1.5 py-0.5 text-center text-[9px] font-bold leading-none tabular-nums',
                active === step.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200/70 text-slate-600',
              )}
            >
              {counts[step.key]}
            </span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}
