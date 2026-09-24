/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type {
  Assignment,
  Answer,
  Contact,
  PlatformUser,
  Project,
  Question,
} from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../lib/AuthContext';
import { cn } from '../../../lib/utils';
import UserAssignmentResponse from '../../../components/project/UserAssignmentResponse';
import { TasksQuestionsToolbar } from './TasksQuestionsToolbar';
import { TasksAssignmentSummaryCard } from './TasksAssignmentSummaryCard';
import { TasksFlatQuestionsPanel } from './TasksFlatQuestionsPanel';
import { formatQuestionnaireProgressLabel } from './TasksQuestionnaireHeader';
import { getRecentActivityFilterLabel } from './TasksRecentActivitySelect';
import {
  assignmentHasQuestionInToolbarTab,
  computeTasksProjectWorkflowProgress,
  questionMatchesToolbarTab,
  type TasksToolbarTabId,
} from '../../../lib/questionWorkflow';
import {
  questionMatchesActivityFilter,
  type TasksRecentActivityFilterId,
} from '../../../lib/tasksQuestionDateFilter';

export type TasksLayoutMode = 'flat' | 'grouped';

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

type TasksMyAssignmentsViewProps = {
  mySentAssignments: Assignment[];
  projects: Project[];
  platformUsers: PlatformUser[];
  contacts: Contact[];
  questionsByProject: Record<string, Question[]>;
  answersByProject: Record<string, Answer[]>;
  toolbarTab: TasksToolbarTabId;
  onToolbarTabChange: (tab: TasksToolbarTabId) => void;
  toolbarTabCounts: Record<TasksToolbarTabId, number>;
  toolbarTabLabels: Record<TasksToolbarTabId, string>;
  workflowDataReady: boolean;
  workflowDataLoading: boolean;
  onRefresh: () => void;
  projectFilter: string;
  searchTerm: string;
};

export function TasksMyAssignmentsView({
  mySentAssignments,
  projects,
  platformUsers,
  contacts,
  questionsByProject,
  answersByProject,
  toolbarTab,
  onToolbarTabChange,
  toolbarTabCounts,
  toolbarTabLabels,
  workflowDataReady,
  workflowDataLoading,
  onRefresh,
  projectFilter,
  searchTerm,
}: TasksMyAssignmentsViewProps) {
  const { t, lang } = useTranslation();
  const { user, profile, isTasksAndProfileOnly } = useAuth();
  const isTasksOnlyUser = isTasksAndProfileOnly;
  const dateLocale = lang === 'tr' ? 'tr-TR' : 'en-GB';

  const filteredAssignments = useMemo(() => {
    let list = [...mySentAssignments];
    if (projectFilter !== 'all') {
      list = list.filter((a) => a.projectId === projectFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a) => {
        const project = projects.find((p) => p.id === a.projectId);
        const ref = getAssignmentRefDisplay(a);
        return (
          (project?.name || '').toLowerCase().includes(q) ||
          (ref && ref.toLowerCase().includes(q)) ||
          (a.message || '').toLowerCase().includes(q)
        );
      });
    }
    if (workflowDataReady) {
      list = list.filter((a) =>
        assignmentHasQuestionInToolbarTab(
          a,
          toolbarTab,
          questionsByProject,
          answersByProject,
        ),
      );
    }
    return list.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
  }, [
    mySentAssignments,
    projectFilter,
    searchTerm,
    projects,
    workflowDataReady,
    toolbarTab,
    questionsByProject,
    answersByProject,
  ]);

  const projectGroups = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of filteredAssignments) {
      const list = map.get(a.projectId) ?? [];
      list.push(a);
      map.set(a.projectId, list);
    }
    return [...map.entries()]
      .map(([projectId, assignments]) => ({
        project: projects.find((p) => p.id === projectId),
        projectId,
        assignments,
      }))
      .sort((a, b) => (a.project?.name || '').localeCompare(b.project?.name || '', dateLocale));
  }, [filteredAssignments, projects, dateLocale]);

  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<TasksLayoutMode>('flat');
  const [recentActivityFilter, setRecentActivityFilter] =
    useState<TasksRecentActivityFilterId>('all');

  const resolvedActiveProjectId = useMemo(() => {
    if (projectFilter !== 'all') return projectFilter;
    if (activeProjectId && projectGroups.some((g) => g.projectId === activeProjectId)) {
      return activeProjectId;
    }
    return projectGroups[0]?.projectId ?? '';
  }, [projectFilter, activeProjectId, projectGroups]);

  const visibleGroups = useMemo(() => {
    if (projectFilter !== 'all') {
      return projectGroups.filter((g) => g.projectId === projectFilter);
    }
    if (resolvedActiveProjectId) {
      return projectGroups.filter((g) => g.projectId === resolvedActiveProjectId);
    }
    return projectGroups;
  }, [projectFilter, projectGroups, resolvedActiveProjectId]);

  const summaryLabels = {
    assignments: t.tasks.summaryAssignments,
    questions: t.tasks.summaryQuestions,
    from: t.tasks.fromLabel,
    to: t.tasks.toLabel,
    date: t.tasks.taskAssignedDateLabel,
    ref: t.tasks.assignmentRef,
  };

  const toolbarProject = useMemo(() => {
    if (projectFilter !== 'all') {
      const project = projects.find((p) => p.id === projectFilter);
      return project ? { project, projectId: projectFilter } : null;
    }
    const assignmentProjectIds = [
      ...new Set(mySentAssignments.map((a) => a.projectId).filter(Boolean)),
    ];
    if (assignmentProjectIds.length === 1) {
      const projectId = assignmentProjectIds[0]!;
      const project = projects.find((p) => p.id === projectId);
      return { project, projectId };
    }
    if (visibleGroups.length === 1) {
      return {
        project: visibleGroups[0].project,
        projectId: visibleGroups[0].projectId,
      };
    }
    return null;
  }, [projectFilter, projects, mySentAssignments, visibleGroups]);

  const filteredAssignmentCount = filteredAssignments.length;

  const activityFilterBanner =
    recentActivityFilter !== 'all'
      ? getRecentActivityFilterLabel(recentActivityFilter, { tasks: t.tasks })
      : undefined;

  const visibleQuestionCount = useMemo(() => {
    if (!workflowDataReady) return toolbarTabCounts[toolbarTab] ?? 0;
    let count = 0;
    for (const group of visibleGroups) {
      const projectQuestions = questionsByProject[group.projectId] || [];
      const projectAnswers = answersByProject[group.projectId] || [];
      for (const assignment of group.assignments) {
        for (const qid of assignment.questionIds || []) {
          const q = projectQuestions.find((item) => item.id === qid);
          if (!q) continue;
          const scopedAnswers = projectAnswers.filter(
            (a) =>
              a.assignmentId === assignment.id ||
              a.contactId === assignment.recipientId,
          );
          if (!questionMatchesToolbarTab(q, scopedAnswers, assignment, toolbarTab)) {
            continue;
          }
          if (
            !questionMatchesActivityFilter(
              qid,
              projectAnswers,
              assignment,
              recentActivityFilter,
            )
          ) {
            continue;
          }
          count += 1;
        }
      }
    }
    return count;
  }, [
    workflowDataReady,
    toolbarTabCounts,
    toolbarTab,
    visibleGroups,
    questionsByProject,
    answersByProject,
    recentActivityFilter,
  ]);

  const assignmentsForProgress = useMemo(() => {
    let list = [...mySentAssignments];
    if (projectFilter !== 'all') {
      list = list.filter((a) => a.projectId === projectFilter);
    } else if (resolvedActiveProjectId) {
      list = list.filter((a) => a.projectId === resolvedActiveProjectId);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a) => {
        const project = projects.find((p) => p.id === a.projectId);
        const ref = getAssignmentRefDisplay(a);
        return (
          (project?.name || '').toLowerCase().includes(q) ||
          (ref && ref.toLowerCase().includes(q)) ||
          (a.message || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [
    mySentAssignments,
    projectFilter,
    resolvedActiveProjectId,
    searchTerm,
    projects,
  ]);

  const questionnaireProgress = useMemo(() => {
    if (!workflowDataReady) {
      return { answered: 0, total: 0, percent: 0 };
    }
    return computeTasksProjectWorkflowProgress(
      assignmentsForProgress,
      questionsByProject,
      answersByProject,
    );
  }, [
    workflowDataReady,
    assignmentsForProgress,
    questionsByProject,
    answersByProject,
  ]);

  const formsScrollRef = useRef<HTMLDivElement>(null);

  const formStickyProps = {
    stickySectionHeaders: true as const,
    stickySectionTopClass: 'top-0',
    flushTopPadding: true,
    compactHorizontalPadding: true,
    scrollContainerRef: formsScrollRef,
    tasksViewMode: true as const,
  };

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-4 border-b border-slate-200/90 bg-slate-50 pb-4">
        {toolbarProject ? (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="min-w-0 truncate text-lg font-bold text-slate-900">
                {toolbarProject.project?.name || t.tasks.unknownProject}
              </h2>
              {questionnaireProgress.total > 0 ? (
                <span className="shrink-0 text-sm font-bold tabular-nums text-orange-500">
                  {formatQuestionnaireProgressLabel(questionnaireProgress)}
                </span>
              ) : null}
            </div>
            {!isTasksOnlyUser ? (
              <Link
                to={`/projects/${toolbarProject.projectId}`}
                className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wide text-blue-600 hover:underline"
              >
                {t.tasks.openProject}
                <ExternalLink size={12} />
              </Link>
            ) : null}
          </div>
        ) : null}

        <TasksQuestionsToolbar
          activeTab={toolbarTab}
          onTabChange={onToolbarTabChange}
          tabCounts={toolbarTabCounts}
          tabLabels={toolbarTabLabels}
          recentActivityFilter={recentActivityFilter}
          onRecentActivityFilterChange={setRecentActivityFilter}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">
            {layoutMode === 'grouped' ? (
              <>
                <span className="font-bold text-slate-900">
                  {filteredAssignmentCount} {t.tasks.summaryAssignments}
                </span>
                {!toolbarProject ? (
                  <>
                    <span className="mx-2 text-slate-300">·</span>
                    <span>
                      {projectGroups.length} {t.tasks.summaryProjects}
                    </span>
                  </>
                ) : null}
                <span className="mx-2 text-slate-300">·</span>
              </>
            ) : !toolbarProject ? (
              <>
                <span>
                  {projectGroups.length} {t.tasks.summaryProjects}
                </span>
                <span className="mx-2 text-slate-300">·</span>
              </>
            ) : null}
            <span>
              {visibleQuestionCount} {t.tasks.summaryQuestionsInFilter}
            </span>
            {recentActivityFilter !== 'all' ? (
              <>
                <span className="mx-2 text-slate-300">·</span>
                <span className="font-semibold text-blue-700">
                  {activityFilterBanner}
                </span>
              </>
            ) : null}
          </p>
          <div
            className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
            role="group"
            aria-label={t.tasks.viewAllQuestions}
          >
            <button
              type="button"
              onClick={() => setLayoutMode('flat')}
              className={cn(
                'rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all',
                layoutMode === 'flat'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {t.tasks.viewAllQuestions}
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grouped')}
              className={cn(
                'rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all',
                layoutMode === 'grouped'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {t.tasks.viewGroupByAssignment}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={formsScrollRef}
        className="tasks-forms-scroll flex h-0 min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        {projectFilter === 'all' && projectGroups.length > 1 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {projectGroups.map((g) => (
              <button
                key={g.projectId}
                type="button"
                onClick={() => setActiveProjectId(g.projectId)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-left text-sm font-semibold transition-all',
                  resolvedActiveProjectId === g.projectId
                    ? 'border-blue-200 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {g.project?.name || t.tasks.unknownProject}
                <span className="ml-2 text-[10px] font-bold tabular-nums text-slate-400">
                  ({g.assignments.length})
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {workflowDataLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">{t.tasks.loadingQuestions}</div>
        ) : null}

        {!workflowDataLoading && visibleGroups.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-20 text-center">
            <p className="text-lg font-bold text-slate-900">{t.tasks.noTasksFound}</p>
            <p className="mt-2 text-sm text-slate-500">{t.tasks.noTasksMatching}</p>
          </div>
        ) : null}

        {!workflowDataLoading
          ? visibleGroups.map((group) => (
              <section
                key={group.projectId}
                className="bg-[#F8F9FA]"
              >
              {layoutMode === 'flat' ? (
                  <TasksFlatQuestionsPanel
                    projectId={group.projectId}
                    assignments={group.assignments}
                    toolbarTab={toolbarTab}
                    recentActivityFilter={recentActivityFilter}
                    activityFilterBanner={activityFilterBanner}
                    onDataChange={onRefresh}
                    {...formStickyProps}
                  />
              ) : (
                <div className="divide-y divide-slate-100">
                  {group.assignments.map((assignment) => {
                    const assignerName =
                      assignment.assignedByName?.trim() ||
                      platformUsers.find((u) => u.id === assignment.assignedBy)?.name ||
                      t.tasks.unknownAssigner;
                    const recipient =
                      assignment.recipientType === 'user'
                        ? platformUsers.find((u) => u.id === assignment.recipientId)
                        : contacts.find((c) => c.id === assignment.recipientId);
                    const recipientName = recipient?.name || t.tasks.unknownRecipient;
                    const recipientEmail = recipient?.email?.trim() || '';

                    return (
                      <div
                        key={assignment.id}
                        className="space-y-4 border-t border-slate-100 px-0 py-4 first:border-t-0"
                      >
                        <TasksAssignmentSummaryCard
                          className="mx-4 border-blue-200/80"
                          totalAssignments={mySentAssignments.length}
                          assignment={assignment}
                          project={group.project}
                          assignerName={assignerName}
                          recipientName={recipientName}
                          recipientEmail={recipientEmail}
                          assignmentRef={getAssignmentRefDisplay(assignment)}
                          assignedDateMs={getAssignmentDateMs(assignment)}
                          dateLocale={dateLocale}
                          labels={summaryLabels}
                        />
                        <div>
                          <UserAssignmentResponse
                            assignment={assignment}
                            projectId={assignment.projectId}
                            toolbarTab={toolbarTab}
                            recentActivityFilter={recentActivityFilter}
                            activityFilterBanner={activityFilterBanner}
                            embedded
                            hideClose
                            tasksViewMode
                            onDataChange={onRefresh}
                            onClose={onRefresh}
                            {...formStickyProps}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </section>
            ))
          : null}
      </div>
    </div>
  );
}
