/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar, ClipboardList, User } from 'lucide-react';
import type { Assignment, Project } from '../../../types';
import { cn } from '../../../lib/utils';

type TasksAssignmentSummaryCardProps = {
  totalAssignments: number;
  assignment: Assignment;
  project?: Project | null;
  assignerName: string;
  recipientName: string;
  recipientEmail?: string;
  assignmentRef?: string | null;
  assignedDateMs?: number;
  labels: {
    assignments: string;
    questions: string;
    from: string;
    to: string;
    date: string;
    ref: string;
  };
  dateLocale: string;
  className?: string;
};

export function TasksAssignmentSummaryCard({
  totalAssignments,
  assignment,
  project,
  assignerName,
  recipientName,
  recipientEmail,
  assignmentRef,
  assignedDateMs,
  labels,
  dateLocale,
  className,
}: TasksAssignmentSummaryCardProps) {
  const qCount = (assignment.questionIds || []).length;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs text-slate-600',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
        <ClipboardList size={14} className="text-blue-600 shrink-0" aria-hidden />
        <span>
          {totalAssignments} {labels.assignments}
        </span>
        <span className="font-normal text-slate-400">·</span>
        <span className="font-semibold text-slate-800 truncate max-w-[12rem] sm:max-w-none">
          {project?.name || '—'}
        </span>
      </span>

      {assignmentRef ? (
        <span className="font-mono text-[11px] text-slate-500">
          <span className="font-bold uppercase tracking-tighter text-slate-400">{labels.ref}</span>{' '}
          {assignmentRef}
        </span>
      ) : null}

      {assignedDateMs != null ? (
        <span className="inline-flex items-center gap-1">
          <Calendar size={13} className="text-slate-400 shrink-0" aria-hidden />
          <span className="font-medium text-slate-500">{labels.date}:</span>
          {new Date(assignedDateMs).toLocaleDateString(dateLocale)}
        </span>
      ) : null}

      <span className="inline-flex items-center gap-1 min-w-0">
        <User size={13} className="text-slate-400 shrink-0" aria-hidden />
        <span className="text-slate-500 shrink-0">{labels.from}:</span>
        <span className="truncate text-slate-700">{assignerName}</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-500 shrink-0">{labels.to}:</span>
        <span className="truncate text-slate-700">{recipientName}</span>
        {recipientEmail ? (
          <span className="truncate text-slate-500">{recipientEmail}</span>
        ) : null}
      </span>

      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border border-slate-200">
        {qCount} {labels.questions}
      </span>
    </div>
  );
}
