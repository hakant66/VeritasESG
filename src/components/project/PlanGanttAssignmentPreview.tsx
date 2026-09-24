/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  ExternalLink,
  User,
  X,
} from 'lucide-react';
import type { Assignment, Contact, PlatformUser, Project } from '../../types';
import { cn } from '../../lib/utils';
import { TasksQuestionnaireHeader } from '../../features/tasks/components/TasksQuestionnaireHeader';
import UserAssignmentResponse from './UserAssignmentResponse';

export type PlanGanttRowSelection = {
  rowKey: string;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientRoleLabel?: string;
  recipientAvatarUrl?: string;
  pageTitle?: string;
  assignments: Assignment[];
  questionIds: string[];
  statusSubtitle: string;
};

function getAssignmentRefDisplay(task: Assignment): string | null {
  const m = (task.message || '').trim();
  if (!m) return null;
  if (/^\d{12}-[A-Z0-9]{2,4}-[A-Z0-9]{5}$/i.test(m)) return m;
  return null;
}

function getAssignmentDateMs(task: Assignment): number | undefined {
  if (typeof task.beginDate === 'number' && task.beginDate > 0) return task.beginDate;
  if (typeof task.sentAt === 'number' && task.sentAt > 0) return task.sentAt;
  return undefined;
}

const PLAN_PREVIEW_META_WIDTH_PERCENT = 34;

function DisabledPanelSplitHandle({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-disabled="true"
      className="relative mx-0.5 w-2 shrink-0 cursor-not-allowed touch-none opacity-70"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-300" />
    </div>
  );
}

export type PlanGanttAssignmentPreviewProps = {
  selection: PlanGanttRowSelection;
  projectId: string;
  project: Project | null;
  platformUsers: PlatformUser[];
  contacts: Contact[];
  dateLocale: string;
  /** Fill parent split pane (plan tab bottom panel). */
  fillHeight?: boolean;
  labels: {
    previewTitle: string;
    openInTasks: string;
    from: string;
    to: string;
    assignedDate: string;
    deadline: string;
    assignmentRef: string;
    assignmentRefNone: string;
    inProgress: string;
    completed: string;
    pickAssignment: string;
    stakeholder: string;
    splitResizeDisabled: string;
  };
  onClose: () => void;
  onOpenTasks: (assignmentId?: string) => void;
};

export function PlanGanttAssignmentPreview({
  selection,
  projectId,
  project,
  platformUsers,
  contacts,
  dateLocale,
  fillHeight = false,
  labels,
  onClose,
  onOpenTasks,
}: PlanGanttAssignmentPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState(
    () => selection.assignments[0]?.id ?? '',
  );
  const [questionnaireHeaderData, setQuestionnaireHeaderData] = useState<{
    visibleQuestionIds: string[];
    answers: Record<string, { text?: string }>;
    progressBarClassName: string;
  } | null>(null);

  useEffect(() => {
    setActiveAssignmentId(selection.assignments[0]?.id ?? '');
    setQuestionnaireHeaderData(null);
  }, [selection.rowKey, selection.assignments]);

  const activeAssignment =
    selection.assignments.find((a) => a.id === activeAssignmentId) ??
    selection.assignments[0];

  if (!activeAssignment) return null;

  const recipient =
    activeAssignment.recipientType === 'user'
      ? platformUsers.find((u) => u.id === activeAssignment.recipientId)
      : contacts.find((c) => c.id === activeAssignment.recipientId);
  const assignerName =
    activeAssignment.assignedByName?.trim() ||
    platformUsers.find((u) => u.id === activeAssignment.assignedBy)?.name ||
    '—';
  const recipientName = recipient?.name || selection.recipientName;
  const recipientEmail =
    recipient?.email?.trim() || selection.recipientEmail?.trim() || '';
  const refStr = getAssignmentRefDisplay(activeAssignment);
  const assignedMs = getAssignmentDateMs(activeAssignment);
  const qCount = (activeAssignment.questionIds || []).length;

  const assignmentMeta = (
    <>
      {selection.assignments.length > 1 ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-2.5">
          <span className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {labels.pickAssignment}
          </span>
          {selection.assignments.map((a) => {
            const ref = getAssignmentRefDisplay(a);
            const label = ref || new Date(getAssignmentDateMs(a) ?? 0).toLocaleDateString(dateLocale);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setActiveAssignmentId(a.id)}
                className={cn(
                  'rounded-none border px-3 py-1.5 text-xs font-medium transition-colors',
                  activeAssignmentId === a.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="relative shrink-0">
              <div
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-none border',
                  activeAssignment.status === 'completed'
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                    : 'border-slate-100 bg-slate-50 text-slate-400',
                )}
              >
                <CheckSquare size={24} aria-hidden />
                {qCount > 0 ? (
                  <span className="absolute -bottom-1 -right-1 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                    {qCount}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-base font-bold text-slate-900">
                {project?.name || '—'}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="flex min-w-0 items-center gap-1.5 font-medium">
                  <User size={14} className="shrink-0 text-slate-400" aria-hidden />
                  <span className="shrink-0 text-slate-500">{labels.from}:</span>
                  <span className="truncate text-slate-700">{assignerName}</span>
                </span>
                <ArrowRight size={14} className="hidden shrink-0 text-slate-300 sm:inline" aria-hidden />
                <span className="flex min-w-0 items-center gap-1.5 font-medium">
                  <User size={14} className="shrink-0 text-slate-400" aria-hidden />
                  <span className="shrink-0 text-slate-500">{labels.to}:</span>
                  <span className="truncate text-slate-700">{recipientName}</span>
                  {recipientEmail ? (
                    <span className="truncate text-slate-500">{recipientEmail}</span>
                  ) : null}
                  {activeAssignment.recipientType === 'contact' ? (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {labels.stakeholder}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {assignedMs != null ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Calendar size={14} className="shrink-0 text-slate-400" aria-hidden />
                    <span className="font-medium text-slate-600">{labels.assignedDate}:</span>
                    <span>{new Date(assignedMs).toLocaleDateString(dateLocale)}</span>
                  </span>
                ) : null}
                {activeAssignment.deadline ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Calendar size={14} className="shrink-0 text-slate-400" aria-hidden />
                    <span className="font-medium text-slate-600">{labels.deadline}:</span>
                    <span>{new Date(activeAssignment.deadline).toLocaleDateString(dateLocale)}</span>
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 text-xs text-slate-600">
                <span className="font-bold uppercase tracking-tighter text-slate-400">
                  {labels.assignmentRef}
                </span>{' '}
                <span className="font-mono font-medium text-slate-700">
                  {refStr ?? labels.assignmentRefNone}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p
              className={cn(
                'text-[10px] font-extrabold uppercase tracking-widest',
                activeAssignment.status === 'completed' ? 'text-emerald-500' : 'text-amber-500',
              )}
            >
              {activeAssignment.status === 'completed'
                ? labels.completed
                : labels.inProgress}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const questionsPane = (
    <UserAssignmentResponse
      key={activeAssignment.id}
      assignment={activeAssignment}
      projectId={projectId}
      embedded
      tasksViewMode
      readonly
      hideClose
      stickySectionHeaders
      showQuestionnaireHeader={false}
      planPreviewMode
      onQuestionnaireHeaderData={setQuestionnaireHeaderData}
      flushTopPadding
      compactHorizontalPadding
      scrollContainerRef={scrollRef}
      onClose={() => {}}
    />
  );

  const leftPaneContent = (
    <>
      {questionnaireHeaderData ? (
        <TasksQuestionnaireHeader
          layout="stacked"
          visibleQuestionIds={questionnaireHeaderData.visibleQuestionIds}
          answers={questionnaireHeaderData.answers}
          progressBarClassName={questionnaireHeaderData.progressBarClassName}
          className="border-b border-slate-100"
        />
      ) : null}
      {assignmentMeta}
    </>
  );

  return (
    <section
      className={cn(
        'overflow-hidden rounded-none border border-slate-100 bg-white shadow-sm',
        fillHeight && 'flex h-full min-h-0 flex-col',
      )}
      aria-label={labels.previewTitle}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-6 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {labels.previewTitle}
          {selection.pageTitle ? (
            <span className="ml-2 normal-case tracking-normal text-slate-700">
              · {selection.pageTitle}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenTasks(activeAssignment.id)}
            className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {labels.openInTasks}
            <ExternalLink size={14} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {fillHeight ? (
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className="plan-split-pane-scroll min-h-0 shrink-0 overscroll-contain bg-white"
            style={{ width: `${PLAN_PREVIEW_META_WIDTH_PERCENT}%` }}
          >
            {leftPaneContent}
          </div>
          <DisabledPanelSplitHandle ariaLabel={labels.splitResizeDisabled} />
          <div
            ref={scrollRef}
            className="plan-split-pane-scroll min-h-0 min-w-0 flex-1 overscroll-contain bg-white"
          >
            {questionsPane}
          </div>
        </div>
      ) : (
        <>
          {leftPaneContent}
          <div
            ref={scrollRef}
            className="max-h-[min(80vh,900px)] overflow-y-auto overscroll-contain border-t border-slate-100 bg-white"
          >
            {questionsPane}
          </div>
        </>
      )}
    </section>
  );
}
