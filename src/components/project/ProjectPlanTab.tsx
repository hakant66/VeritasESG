/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import type {
  Answer,
  Assignment,
  Contact,
  PlatformUser,
  Project,
  ProjectPage,
  Question,
} from '../../types';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { useVerticalSplit } from '../../hooks/useVerticalSplit';
import {
  buildPlanGanttPageRows,
  buildPlanGanttPersonRows,
  type PlanGanttViewMode,
} from '../../lib/planGanttGrouping';
import { ProjectUserIdentity } from './ProjectUserIdentity';
import { PlanGanttAssignmentBar } from './PlanGanttAssignmentBar';
import {
  PlanGanttAssignmentPreview,
  type PlanGanttRowSelection,
} from './PlanGanttAssignmentPreview';

type ProjectPlanTabProps = {
  projectId: string;
  project: Project | null;
  assignments: Assignment[];
  questions: Question[];
  answers: Answer[];
  pages: ProjectPage[];
  platformUsers: PlatformUser[];
  contacts: Contact[];
  getPlatformRoleLabel: (role: string) => string;
  onOpenTasks: (assignmentId?: string) => void;
};

type GanttRenderableRow = {
  key: string;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientRoleLabel?: string;
  recipientAvatarUrl?: string;
  pageTitle?: string;
  assignments: Assignment[];
  questionIds: string[];
  bDate: number;
  dDate: number;
  barStatus: 'completed' | 'overdue' | 'active';
  statusSubtitle: string;
  leftRoleLabel: string;
  leftNameExtras?: ReactNode;
};

function resolveRecipient(
  recipientId: string,
  platformUsers: PlatformUser[],
  contacts: Contact[],
  getPlatformRoleLabel: (role: string) => string,
  contactRoleLabel: string,
  unknownLabel: string,
) {
  const platformRecipient = platformUsers.find((u) => u.id === recipientId);
  const contactRecipient = contacts.find((c) => c.id === recipientId);
  const recipient = platformRecipient || contactRecipient;
  const recipientEmail = recipient?.email || '';
  const recipientAvatarUrl =
    platformRecipient?.avatarUrl ??
    (contactRecipient
      ? platformUsers.find(
          (pu) =>
            pu.contactId === contactRecipient.id ||
            pu.email === contactRecipient.email,
        )?.avatarUrl
      : undefined);
  const recipientRoleLabel = platformRecipient
    ? getPlatformRoleLabel(platformRecipient.role)
    : contactRoleLabel;

  return {
    name: recipient?.name || unknownLabel,
    email: recipientEmail,
    avatarUrl: recipientAvatarUrl,
    roleLabel: recipientRoleLabel,
  };
}

export function ProjectPlanTab({
  projectId,
  project,
  assignments,
  questions,
  answers,
  pages,
  platformUsers,
  contacts,
  getPlatformRoleLabel,
  onOpenTasks,
}: ProjectPlanTabProps) {
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  const isServiceProject = project?.category === 'Service';

  const [planGanttViewMode, setPlanGanttViewMode] =
    useState<PlanGanttViewMode>('assignment');
  const [planGanttSelection, setPlanGanttSelection] =
    useState<PlanGanttRowSelection | null>(null);

  const { containerRef, topPercent, startResizing } = useVerticalSplit({
    defaultPercent: 42,
    resetKey: planGanttSelection?.rowKey ?? null,
  });

  useEffect(() => {
    setPlanGanttSelection(null);
  }, [planGanttViewMode, projectId]);

  const statusSubtitleForAssignments = useCallback(
    (group: Assignment[], barStatus: GanttRenderableRow['barStatus']) => {
      if (barStatus === 'completed') {
        const completedAt = Math.max(
          ...group.map((a) => a.completedAt ?? 0),
          0,
        );
        return t.projectDetail.completedAtDate.replace(
          '{date}',
          new Date(completedAt).toLocaleDateString(dateLocale),
        );
      }
      return t.projectDetail.inProgress;
    },
    [dateLocale, t.projectDetail.completedAtDate, t.projectDetail.inProgress],
  );

  const ganttRows = useMemo((): GanttRenderableRow[] => {
    const now = Date.now();
    const projectStart = project?.startDate
      ? new Date(project.startDate).getTime()
      : now;

    if (planGanttViewMode === 'person') {
      return buildPlanGanttPersonRows(assignments, projectStart, now).map(
        (row) => {
          const recipient = resolveRecipient(
            row.recipientId,
            platformUsers,
            contacts,
            getPlatformRoleLabel,
            t.projectDetail.customerContact,
            t.projectDetail.unknown,
          );
          return {
            key: `person:${row.recipientId}`,
            recipientId: row.recipientId,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            recipientRoleLabel: recipient.roleLabel,
            recipientAvatarUrl: recipient.avatarUrl,
            assignments: row.assignments,
            questionIds: row.questionIds,
            bDate: row.bDate,
            dDate: row.dDate,
            barStatus: row.barStatus,
            statusSubtitle: statusSubtitleForAssignments(
              row.assignments,
              row.barStatus,
            ),
            leftRoleLabel: recipient.roleLabel,
            leftNameExtras: (
              <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <ClipboardList size={10} className="shrink-0" aria-hidden />
                {t.projectDetail.planPersonAssignmentsSummary.replace(
                  '{count}',
                  String(row.assignments.length),
                )}
              </span>
            ),
          };
        },
      );
    }

    if (planGanttViewMode === 'page') {
      return buildPlanGanttPageRows(
        assignments,
        questions,
        pages,
        projectStart,
        t.projectDetail.planPageUnassigned,
        now,
      ).map((row) => {
        const primary = row.assignments[0];

        return {
          key: `page:${row.pageId}`,
          recipientId: primary?.recipientId ?? row.pageId,
          recipientName: row.pageTitle,
          pageTitle: row.pageTitle,
          assignments: row.assignments,
          questionIds: row.questionIds,
          bDate: row.bDate,
          dDate: row.dDate,
          barStatus: row.barStatus,
          statusSubtitle: statusSubtitleForAssignments(
            row.assignments,
            row.barStatus,
          ),
          leftRoleLabel: row.pageTitle,
        };
      });
    }

    return assignments.map((assignment) => {
      const recipient = resolveRecipient(
        assignment.recipientId,
        platformUsers,
        contacts,
        getPlatformRoleLabel,
        t.projectDetail.customerContact,
        t.projectDetail.unknown,
      );
      const bDate = assignment.beginDate || projectStart;
      const dDate =
        assignment.deadline || bDate + 7 * 24 * 60 * 60 * 1000;
      const isOverdue = dDate < now && assignment.status !== 'completed';
      const barStatus: GanttRenderableRow['barStatus'] =
        assignment.status === 'completed'
          ? 'completed'
          : isOverdue
            ? 'overdue'
            : 'active';

      return {
        key: `assignment:${assignment.id}`,
        recipientId: assignment.recipientId,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientRoleLabel: recipient.roleLabel,
        recipientAvatarUrl: recipient.avatarUrl,
        assignments: [assignment],
        questionIds: assignment.questionIds ?? [],
        bDate,
        dDate,
        barStatus,
        statusSubtitle: statusSubtitleForAssignments([assignment], barStatus),
        leftRoleLabel: recipient.roleLabel,
        leftNameExtras: (
          <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            <ClipboardList size={10} className="shrink-0" aria-hidden />
            {(assignment.questionIds || []).length} {t.projectDetail.points}
          </span>
        ),
      };
    });
  }, [
    assignments,
    contacts,
    getPlatformRoleLabel,
    pages,
    planGanttViewMode,
    platformUsers,
    project?.startDate,
    questions,
    statusSubtitleForAssignments,
    t.projectDetail.customerContact,
    t.projectDetail.planPageUnassigned,
    t.projectDetail.planPersonAssignmentsSummary,
    t.projectDetail.planViewByPage,
    t.projectDetail.points,
    t.projectDetail.unknown,
  ]);

  const selectRow = useCallback((row: GanttRenderableRow) => {
    setPlanGanttSelection({
      rowKey: row.key,
      recipientId: row.recipientId,
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      recipientRoleLabel: row.recipientRoleLabel,
      recipientAvatarUrl: row.recipientAvatarUrl,
      pageTitle: row.pageTitle,
      assignments: row.assignments,
      questionIds: row.questionIds,
      statusSubtitle: row.statusSubtitle,
    });
  }, []);

  const ganttChart = useMemo(() => {
    const inSplitPane = Boolean(planGanttSelection);
    try {
      const now = Date.now();
      const projectStart = project?.startDate
        ? new Date(project.startDate).getTime()
        : now;
      const projectEnd = project?.endDate
        ? new Date(project.endDate).getTime()
        : projectStart + 90 * 24 * 60 * 60 * 1000;

      if (isNaN(projectStart) || isNaN(projectEnd)) {
        return (
          <div className="p-12 text-center italic text-slate-400">
            {t.projectDetail.invalidDates}
          </div>
        );
      }

      const timelineStart = new Date(projectStart);
      timelineStart.setDate(1);

      const timelineEnd = new Date(projectEnd);
      timelineEnd.setMonth(timelineEnd.getMonth() + 1);
      timelineEnd.setDate(0);

      const totalMs = timelineEnd.getTime() - timelineStart.getTime();
      const totalDays = Math.ceil(totalMs / (24 * 60 * 60 * 1000)) + 1;

      if (totalDays <= 0) {
        return (
          <div className="p-12 text-center italic text-slate-400">
            {t.projectDetail.invalidRange}
          </div>
        );
      }

      const months: { name: string; dayWeight: number }[] = [];
      let curr = new Date(timelineStart);
      let loopLimit = 0;
      while (curr <= timelineEnd && loopLimit < 60) {
        loopLimit += 1;
        const mName = curr.toLocaleString(dateLocale, {
          month: 'short',
          year: '2-digit',
        });
        const endOfMonth = new Date(
          curr.getFullYear(),
          curr.getMonth() + 1,
          0,
        );
        const daysInMonth = endOfMonth.getDate();
        months.push({
          name: mName,
          dayWeight: daysInMonth / totalDays,
        });
        curr.setMonth(curr.getMonth() + 1);
      }

      const todayPos = (now - timelineStart.getTime()) / totalMs;
      const leftColumnLabel =
        planGanttViewMode === 'assignment'
          ? t.projectDetail.planViewByAssignment
          : planGanttViewMode === 'person'
            ? t.projectDetail.planViewByPerson
            : t.projectDetail.planViewByPage;

      return (
        <div
          className={cn(
            'overflow-hidden rounded-none border border-slate-100 bg-white shadow-sm',
            !inSplitPane && 'flex flex-col',
          )}
        >
          <div
            className={cn(
              inSplitPane
                ? 'plan-gantt-x-scroll'
                : 'custom-scrollbar overflow-x-auto',
            )}
          >
            <div className="relative flex min-w-[1000px] flex-col">
              <div className="flex border-b border-slate-100">
                <div className="flex w-64 shrink-0 items-center border-r border-slate-100 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {leftColumnLabel}
                </div>
                <div className="flex flex-1">
                  {months.map((m, i) => (
                    <div
                      key={i}
                      className="border-r border-slate-100 p-4 pl-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 last:border-0"
                      style={{ width: `${m.dayWeight * 100}%` }}
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              </div>

              {todayPos >= 0 && todayPos <= 1 ? (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400"
                  style={{
                    left: `calc(16rem + ${todayPos * 100}%)`,
                  }}
                >
                  <div className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-red-400 shadow-sm" />
                </div>
              ) : null}

              <div className="divide-y divide-slate-50">
                {ganttRows.length === 0 ? (
                  <div className="p-12 text-center text-xs font-bold uppercase italic tracking-widest text-slate-400">
                    {t.projectDetail.noAssignmentsScheduled}
                  </div>
                ) : (
                  ganttRows.map((row, idx) => {
                    const startPct = Math.max(
                      0,
                      (row.bDate - timelineStart.getTime()) / totalMs,
                    );
                    const endPct = Math.min(
                      1,
                      (row.dDate - timelineStart.getTime()) / totalMs,
                    );
                    const durationPct = Math.max(0.01, endPct - startPct);

                    return (
                      <motion.div
                        key={row.key}
                        className="flex transition-colors hover:bg-slate-50/50"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div className="w-64 shrink-0 overflow-hidden border-r border-slate-100 bg-white/50 p-3">
                          {planGanttViewMode === 'page' ? (
                            <div className="flex min-h-[3rem] min-w-0 flex-col justify-center">
                              <p className="flex flex-wrap items-center gap-2 text-sm font-bold leading-snug text-slate-900">
                                <span className="min-w-0 truncate">
                                  {row.pageTitle ?? row.recipientName}
                                </span>
                                <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                  <ClipboardList
                                    size={10}
                                    className="shrink-0"
                                    aria-hidden
                                  />
                                  {row.questionIds.length} {t.projectDetail.points}
                                </span>
                              </p>
                            </div>
                          ) : (
                            <ProjectUserIdentity
                              name={row.recipientName}
                              email={row.recipientEmail}
                              roleLabel={row.leftRoleLabel}
                              avatarUrl={row.recipientAvatarUrl}
                              nameExtras={row.leftNameExtras}
                            />
                          )}
                        </div>
                        <PlanGanttAssignmentBar
                          assignments={row.assignments}
                          questionIds={row.questionIds}
                          recipientId={row.recipientId}
                          startPct={startPct}
                          durationPct={durationPct}
                          bDate={row.bDate}
                          dDate={row.dDate}
                          barStatus={row.barStatus}
                          recipientName={row.recipientName}
                          recipientAvatarUrl={row.recipientAvatarUrl}
                          statusSubtitle={row.statusSubtitle}
                          questions={questions}
                          answers={answers}
                          dateLocale={dateLocale}
                          labels={{
                            question: t.projectDetail.question,
                            noResponseYet: t.projectDetail.noResponseYet,
                            tasksCount: t.projectDetail.tasksCount,
                          }}
                          isSelected={planGanttSelection?.rowKey === row.key}
                          onBarClick={() => selectRow(row)}
                        />
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      );
    } catch (e) {
      console.error('Gantt error:', e);
      return (
        <div className="p-12 text-center italic text-slate-400">
          {t.projectDetail.errorRenderingPlan}
        </div>
      );
    }
  }, [
    answers,
    dateLocale,
    ganttRows,
    planGanttSelection,
    planGanttSelection?.rowKey,
    planGanttViewMode,
    project?.endDate,
    project?.startDate,
    questions,
    selectRow,
    t.projectDetail.errorRenderingPlan,
    t.projectDetail.invalidDates,
    t.projectDetail.invalidRange,
    t.projectDetail.noAssignmentsScheduled,
    t.projectDetail.noResponseYet,
    t.projectDetail.planViewByAssignment,
    t.projectDetail.planViewByPage,
    t.projectDetail.planViewByPerson,
    t.projectDetail.question,
    t.projectDetail.tasksCount,
  ]);

  const legend = (
    <>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm bg-blue-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t.projectDetail.activeStatus}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm bg-green-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t.projectDetail.completedStatus}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm bg-red-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t.projectDetail.overdueStatus}
        </span>
      </div>
    </>
  );

  const groupByControls = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {t.projectDetail.planGroupByLabel}
      </span>
      {(
        [
          ['assignment', t.projectDetail.planViewByAssignment],
          ['person', t.projectDetail.planViewByPerson],
          ['page', t.projectDetail.planViewByPage],
        ] as const
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => setPlanGanttViewMode(mode)}
          className={cn(
            'rounded-none border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
            planGanttViewMode === mode
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/30">
      {!planGanttSelection ? (
        <div className="relative z-20 shrink-0 border-b border-slate-200 bg-slate-50/30 px-6 pb-3 pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-sm">
              <Calendar size={20} className="text-slate-900" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {isServiceProject
                ? t.projectDetail.serviceProjectPlan
                : t.projectDetail.projectPlan}
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {isServiceProject
              ? t.projectDetail.serviceProjectPlanSubtitle
              : t.projectDetail.projectPlanSubtitle}
          </p>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/30 px-6 py-3">
        <div className="hidden items-center gap-4 sm:flex">{legend}</div>
        {groupByControls}
      </div>

      <div
        ref={planGanttSelection ? containerRef : undefined}
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          !planGanttSelection && 'overflow-y-auto px-6 pb-6 pt-4',
        )}
      >
        {planGanttSelection ? (
          <>
            <div
              className="plan-split-pane-scroll min-h-0 px-6 pt-2"
              style={{ flex: `0 0 ${topPercent}%`, maxHeight: `${topPercent}%` }}
            >
              {ganttChart}
            </div>
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label={t.projectDetail.planResizeSplit}
              onMouseDown={startResizing}
              className="relative z-30 mx-6 h-2 shrink-0 cursor-row-resize touch-none"
            >
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
              <div className="absolute left-1/2 top-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden pl-6 pr-6 pb-4 mr-2.5">
              <PlanGanttAssignmentPreview
                selection={planGanttSelection}
                projectId={projectId}
                project={project}
                platformUsers={platformUsers}
                contacts={contacts}
                dateLocale={dateLocale}
                fillHeight
                labels={{
                  previewTitle: t.projectDetail.planAssignmentPreview,
                  openInTasks: t.projectDetail.planOpenInTasks,
                  from: t.projectDetail.from,
                  to: t.projectDetail.to,
                  assignedDate: t.projectDetail.assignedDate,
                  deadline: t.projectDetail.deadline,
                  assignmentRef: t.projectDetail.assignmentRef,
                  assignmentRefNone: t.projectDetail.assignmentRefNone,
                  inProgress: t.projectDetail.inProgress,
                  completed: t.projectDetail.completedStatus,
                  pickAssignment: t.projectDetail.planPickAssignment,
                  stakeholder: t.projectDetail.customerContact,
                  splitResizeDisabled:
                    t.projectDetail.planAssignmentPreviewSplitDisabled,
                }}
                onClose={() => setPlanGanttSelection(null)}
                onOpenTasks={onOpenTasks}
              />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {ganttChart}
            <p className="text-center text-xs text-slate-400">
              {t.projectDetail.planSelectTaskHint}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 rounded-none border border-slate-100 bg-white py-4 shadow-sm sm:hidden">
        {legend}
      </div>
    </div>
  );
}
