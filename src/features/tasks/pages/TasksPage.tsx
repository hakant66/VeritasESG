/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Clock, 
  Calendar,
  User,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Paperclip,
  ClipboardList,
  Trash2,
  X,
  Settings,
  Mail,
} from 'lucide-react';
import * as DB from '../../../services/db';
import {
  Assignment,
  Project,
  PlatformUser,
  Answer,
} from '../../../types';
import { useAuth } from '../../../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useSettings } from '../../../lib/SettingsContext';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  assignmentDisplayStatusTone,
  labelForAssignmentDisplayStatus,
  resolveAssignmentDisplayStatus,
} from '../../../../lib/assignmentUrgency';
import Modal from '../../../components/ui/Modal';
import { PaginationBar, type PageSizeOption } from '../../../components/ui/PaginationBar';
import UserAssignmentResponse from '../../../components/project/UserAssignmentResponse';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../../components/admin/PageHelpGuidance';
import { TasksMyAssignmentsView } from '../components/TasksMyAssignmentsView';
import { AssignmentManageModal } from '../components/AssignmentManageModal';
import { formatQuestionnaireProgressLabel } from '../components/TasksQuestionnaireHeader';
import { isTasksPageFilterAdmin } from '../../../lib/userRoles';
import { canManageAssignment } from '../../../lib/assignmentManageAccess';
import { assignmentHasSubstantiveAnswers } from '../../../lib/assignmentAnswers';
import { deleteProjectAssignment, resendAssignmentEmail, approveProjectAssignment } from '../api/assignmentManage';
import { useTasksPageData } from '../hooks/useTasksPageData';
import { useTasksWorkflowData } from '../hooks/useTasksWorkflowData';
import {
  selectWorkflowAssignments,
  workflowProjectIdsFromAssignments,
} from '../lib/workflowProjectIds';
import {
  assignmentHasQuestionInToolbarTab,
  buildAssignmentQuestionWorkflowItems,
  countToolbarTabItems,
  isAssignmentLinkSent,
  type TasksToolbarTabId,
} from '../../../lib/questionWorkflow';

/** `Assignment.message` holds auto-generated REF (see ProjectDetailPage `buildAssignmentReference`). */
function getAssignmentRefDisplay(task: Assignment): string | null {
  const m = (task.message || '').trim();
  if (!m) return null;
  if (/^\d{12}-[A-Z0-9]{2,4}-[A-Z0-9]{5}$/i.test(m)) return m;
  return null;
}

/** Prefer beginDate when set; otherwise sentAt for "assignment date" on task cards. */
function getAssignmentDateMs(task: Assignment): number | undefined {
  if (typeof task.beginDate === 'number' && task.beginDate > 0) return task.beginDate;
  if (typeof task.sentAt === 'number' && task.sentAt > 0) return task.sentAt;
  return undefined;
}

function getAssignmentAnswerProgress(
  task: Assignment,
  projectAnswers: Answer[] = [],
): { answered: number; total: number; percent: number } {
  const questionIds = task.questionIds || [];
  const total = questionIds.length;
  if (total === 0) {
    return { answered: 0, total: 0, percent: 0 };
  }
  const scoped = projectAnswers.filter(
    (answer) =>
      questionIds.includes(answer.questionId) &&
      (answer.assignmentId === task.id || answer.contactId === task.recipientId),
  );
  const answered = questionIds.filter((questionId) =>
    scoped.some(
      (answer) =>
        answer.questionId === questionId && Boolean(answer.latestAnswer?.trim()),
    ),
  ).length;
  const percent = Math.round((answered / total) * 100);
  return { answered, total, percent };
}

export default function TasksPage() {
  const { user, profile, isAdmin, isTasksAndProfileOnly } = useAuth();
  const isTasksOnlyUser = isTasksAndProfileOnly;
  const showTasksProjectFilters = isTasksPageFilterAdmin(profile?.role);
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const location = useLocation();
  const bootstrapQuery = useTasksPageData(user?.uid);
  const bootstrap = bootstrapQuery.data;
  const assignments = bootstrap?.assignments ?? [];
  const projects = bootstrap?.projects ?? [];
  const contacts = bootstrap?.contacts ?? [];
  const myProjectAssignments = bootstrap?.myProjectAssignments ?? [];
  const platformUsers = bootstrap?.platformUsers ?? [];
  const loading = bootstrapQuery.isLoading;

  const workflowAssignments = useMemo(() => {
    if (!user || !bootstrap) return [];
    return selectWorkflowAssignments(bootstrap, user, profile);
  }, [bootstrap, user, profile]);

  const workflowProjectIds = useMemo(
    () => workflowProjectIdsFromAssignments(workflowAssignments),
    [workflowAssignments],
  );

  const workflowQuery = useTasksWorkflowData(workflowProjectIds);
  const questionsByProject = workflowQuery.data?.questionsByProject ?? {};
  const answersByProject = workflowQuery.data?.answersByProject ?? {};
  const workflowDataLoading = workflowQuery.isFetching && workflowProjectIds.length > 0;
  const workflowDataReady =
    workflowProjectIds.length === 0 || workflowQuery.isSuccess || workflowQuery.isError;

  const refreshTasks = useCallback(() => {
    void bootstrapQuery.refetch();
    if (workflowProjectIds.length > 0) {
      void workflowQuery.refetch();
    }
  }, [bootstrapQuery, workflowQuery, workflowProjectIds.length]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'my-pending' | 'my-completed' | 'my-assigned'>('all');
  const [tasksViewMode, setTasksViewMode] = useState<'manage' | 'my-tasks'>('manage');
  const [manageAssignment, setManageAssignment] = useState<Assignment | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [toolbarTab, setToolbarTab] = useState<TasksToolbarTabId>('questions_filter');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [taskListPage, setTaskListPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState<PageSizeOption>(10);
  const expandedQuestionnaireScrollRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'danger' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  });

  const showAlert = (title: string, description: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    setModal({ isOpen: true, title, description, type });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, type: 'confirm' | 'danger' = 'confirm') => {
    setModal({ isOpen: true, title, description, type, onConfirm });
  };

  useEffect(() => {
    const navState = location.state as {
      projectId?: string;
      highlightAssignmentId?: string;
    } | null;
    if (navState?.projectId) {
      setProjectFilter(navState.projectId);
    }
    if (navState?.highlightAssignmentId) {
      setExpandedTaskId(navState.highlightAssignmentId);
    }
  }, [location.state, assignments]);

  const handleDeleteAssignment = async (
    projectId: string,
    assignment: Assignment,
    options?: { hasAnswers?: boolean },
  ) => {
    const description = options?.hasAnswers
      ? t.tasks.deleteAssignmentWithAnswersDesc
      : t.tasks.deleteAssignmentDesc;

    showConfirm(
      t.tasks.deleteAssignment,
      description,
      async () => {
        try {
          const result = await deleteProjectAssignment(projectId, assignment.id);
          if (result.success) {
            setIsManageModalOpen(false);
            setManageAssignment(null);
            refreshTasks();
          } else {
            showAlert(t.tasks.deletionFailed, result.error || t.tasks.deletionFailedDesc, 'danger');
          }
        } catch (error) {
          console.error('Delete failed:', error);
          showAlert(t.common.error, t.tasks.unexpectedError, 'danger');
        }
      },
      'danger',
    );
  };

  const handleResendEmail = (task: Assignment) => {
    showConfirm(
      t.tasks.resendAssignmentEmail,
      t.tasks.resendAssignmentEmailConfirm,
      async () => {
        try {
          const result = await resendAssignmentEmail(task.projectId, task.id);
          if (!result.success) {
            showAlert(
              t.tasks.resendEmailFailed,
              result.error || t.tasks.resendEmailFailed,
              'danger',
            );
            return;
          }
          showAlert(
            t.tasks.resendAssignmentEmail,
            t.tasks.resendEmailSuccess.replace(
              '{email}',
              result.recipientEmail || '',
            ),
            'info',
          );
        } catch (error) {
          console.error('Resend failed:', error);
          showAlert(t.common.error, t.tasks.resendEmailFailed, 'danger');
        }
      },
    );
  };

  const handleCleanupOrphaned = async () => {
    const orphaned = assignments.filter(a => (!a.recipientId || (a.questionIds || []).length === 0) && a.status === 'completed');
    if (orphaned.length === 0) return;
    
    showConfirm(
      t.tasks.cleanupOrphanedTitle,
      t.tasks.cleanupOrphanedDesc.replace('{count}', orphaned.length.toString()),
      async () => {
        try {
          let count = 0;
          for (const a of orphaned) {
            const success = await DB.assignments.delete(a.projectId, a.id);
            if (success) count++;
          }
          showAlert(t.tasks.cleanupComplete, t.tasks.cleanupCompleteDesc.replace('{count}', count.toString()), 'info');
          refreshTasks();
        } catch (error) {
          console.error("Cleanup failed:", error);
          showAlert(t.common.error || 'Error', t.common.errorOccurred || 'An error occurred.', 'danger');
          refreshTasks();
        }
      },
      'danger'
    );
  };

  // Projects available for filtering based on user permissions
  const mySentAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => a.recipientId === user?.uid && isAssignmentLinkSent(a),
      ),
    [assignments, user?.uid],
  );

  const canSwitchTasksView =
    isTasksPageFilterAdmin(profile?.role) && mySentAssignments.length > 0;

  const showWorkflowView =
    mySentAssignments.length > 0 &&
    (!canSwitchTasksView || tasksViewMode === 'my-tasks');


  const workflowItems = useMemo(
    () =>
      buildAssignmentQuestionWorkflowItems(
        mySentAssignments,
        questionsByProject,
        answersByProject,
      ),
    [mySentAssignments, questionsByProject, answersByProject],
  );

  const toolbarTabCounts = useMemo(
    () => ({
      questions_filter: countToolbarTabItems(workflowItems, 'questions_filter'),
      sent_pending: countToolbarTabItems(workflowItems, 'sent_pending'),
      customer_responded: countToolbarTabItems(workflowItems, 'customer_responded'),
      sent_back: countToolbarTabItems(workflowItems, 'sent_back'),
      approved: countToolbarTabItems(workflowItems, 'approved'),
    }),
    [workflowItems],
  );

  const toolbarTabLabels = useMemo(
    () => ({
      questions_filter: t.tasks.questionsFilterLabel,
      sent_pending: t.tasks.workflowPendingQuestions,
      customer_responded: t.tasks.workflowAnswered,
      sent_back: t.tasks.workflowConsultantSentBack,
      approved: t.tasks.workflowConsultantApproved,
    }),
    [t],
  );

  const availableFilterProjects = useMemo(() => {
    if (showWorkflowView) {
      if (showTasksProjectFilters) {
        return projects;
      }
      const ids = new Set(mySentAssignments.map((a) => a.projectId));
      return projects.filter((p) => ids.has(p.id));
    }
    let baseProjects: Project[] = [];
    if (isAdmin || profile?.role === 'consultant') {
      baseProjects = projects;
    } else {
      const myProjectIds = (myProjectAssignments || []).map((pua) => pua.projectId);
      baseProjects = projects.filter((p) => myProjectIds.includes(p.id));
    }
    return Array.from(new Map((baseProjects || []).map((p) => [p.id, p])).values());
  }, [
    projects,
    myProjectAssignments,
    isAdmin,
    profile,
    showWorkflowView,
    mySentAssignments,
    showTasksProjectFilters,
  ]);

  const filterProjectsByCategory = useMemo(() => {
    const sorted = [...availableFilterProjects].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
    );
    return {
      projects: sorted.filter((p) => p.category !== 'Service'),
      services: sorted.filter((p) => p.category === 'Service'),
    };
  }, [availableFilterProjects]);

  const filteredTasks = useMemo(() => {
    // 1. Filter by role/permissions
    let tasks = assignments.filter(a => {
      // Platform admins and consultant managers/consultants see everything
      if (isAdmin || profile?.role === 'consultant') return true;
      
      // Project admins see all tasks for their projects
      const myPua = myProjectAssignments.find(pua => pua.projectId === a.projectId);
      if (myPua?.role === 'admin') return true;

      // Regular users see only tasks assigned to them
      if (a.recipientId === user?.uid) return true;

      return false;
    });

    // 2. Filter by project
    if (projectFilter !== 'all') {
      tasks = tasks.filter(t => t.projectId === projectFilter);
    }

    if (showWorkflowView) {
      const myIds = new Set(mySentAssignments.map((a) => a.id));
      tasks = tasks.filter((t) => myIds.has(t.id));
      if (workflowDataReady) {
        tasks = tasks.filter((t) =>
          assignmentHasQuestionInToolbarTab(
            t,
            toolbarTab,
            questionsByProject,
            answersByProject,
          ),
        );
      }
    }

    // 3. Filter by status
    if (!showWorkflowView && statusFilter === 'pending') {
      tasks = tasks.filter(t => t.status === 'pending');
    } else if (!showWorkflowView && statusFilter === 'completed') {
      tasks = tasks.filter(t => t.status === 'completed');
    } else if (!showWorkflowView && statusFilter === 'my-pending') {
      tasks = tasks.filter(t => t.status === 'pending' && t.recipientId === user?.uid);
    } else if (!showWorkflowView && statusFilter === 'my-completed') {
      tasks = tasks.filter(t => t.status === 'completed' && t.recipientId === user?.uid);
    } else if (!showWorkflowView && statusFilter === 'my-assigned') {
      const actorIds = new Set([user?.uid, profile?.id].filter(Boolean));
      tasks = tasks.filter((t) => t.assignedBy && actorIds.has(t.assignedBy));
    }

    // 3. Filter by search (project name or questions)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      tasks = tasks.filter((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        const ref = getAssignmentRefDisplay(t);
        return (
          (project?.name || '').toLowerCase().includes(lowerSearch) ||
          (ref && ref.toLowerCase().includes(lowerSearch)) ||
          (t.message || '').toLowerCase().includes(lowerSearch)
        );
      });
    }

    // Ensure uniqueness and sort
    const uniqueTasks = Array.from(new Map((tasks || []).map(t => [t.id, t])).values());
    
    return uniqueTasks.sort((a, b) => {
      const isMineA = a.recipientId === user?.uid;
      const isMineB = b.recipientId === user?.uid;
      const isPendingA = a.status === 'pending';
      const isPendingB = b.status === 'pending';

      // 1. My Pending
      if (isMineA && isPendingA && (!isMineB || !isPendingB)) return -1;
      if (isMineB && isPendingB && (!isMineA || !isPendingA)) return 1;

      // 2. Other Pending
      if (isPendingA && !isPendingB) return -1;
      if (isPendingB && !isPendingA) return 1;

      // 3. My Completed
      if (isMineA && !isMineB) return -1;
      if (isMineB && !isMineA) return 1;

      // Default: sort by last update
      return (b.sentAt || 0) - (a.sentAt || 0);
    });
  }, [
    assignments,
    projects,
    myProjectAssignments,
    isAdmin,
    profile,
    user,
    statusFilter,
    searchTerm,
    projectFilter,
    showWorkflowView,
    mySentAssignments,
    toolbarTab,
    workflowDataReady,
    questionsByProject,
    answersByProject,
  ]);

  useEffect(() => {
    setTaskListPage(1);
  }, [searchTerm, statusFilter, projectFilter, taskPageSize, toolbarTab]);

  const currentTaskPage = Math.min(Math.max(1, taskListPage), Math.max(1, Math.ceil(filteredTasks.length / taskPageSize)));
  const paginatedTasks = useMemo(() => {
    const start = (currentTaskPage - 1) * taskPageSize;
    return filteredTasks.slice(start, start + taskPageSize);
  }, [filteredTasks, currentTaskPage, taskPageSize]);

  const dateLocale = lang === 'tr' ? 'tr-TR' : 'en-GB';

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">{t.tasks.loadingTasks}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full max-w-none',
        showWorkflowView
          ? 'flex h-0 min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 md:p-8'
          : 'space-y-4 p-6 md:p-7',
      )}
    >
      <header className="flex shrink-0 flex-col justify-between gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <CheckSquare className="text-blue-600 shrink-0" size={32} strokeWidth={2.5} />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {showWorkflowView ? t.dashboard.myTasks : t.tasks.title}
            </h1>
          </div>
          <p className="mt-0.5 text-sm font-light text-slate-500">
            {showWorkflowView ? t.tasks.myTasksSubtitle : t.tasks.subtitle}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-start gap-3">
          {(settings.helpAssignmentsUrl || settings.helpAssignmentsMd) && (
            <PageHelpHeaderButton
              helpUrl={settings.helpAssignmentsUrl || ''}
              helpMd={settings.helpAssignmentsMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.tasks.tasksGuidance}
            />
          )}

          {(profile?.role === 'platform_admin' || profile?.role === 'consultant_manager') && assignments.some(a => (!a.recipientId || (a.questionIds || []).length === 0) && a.status === 'completed') && (
          <button
            onClick={handleCleanupOrphaned}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
          >
            <Trash2 size={13} />
            {t.tasks.cleanupOrphaned.replace('{count}', assignments.filter(a => (!a.recipientId || (a.questionIds || []).length === 0) && a.status === 'completed').length.toString())}
          </button>
        )}
        </div>
      </header>

      {canSwitchTasksView ? (
        <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          <button
            type="button"
            onClick={() => setTasksViewMode('manage')}
            className={cn(
              'rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
              tasksViewMode === 'manage'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            {t.tasks.manageAssignmentsTab}
          </button>
          <button
            type="button"
            onClick={() => setTasksViewMode('my-tasks')}
            className={cn(
              'rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
              tasksViewMode === 'my-tasks'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            {t.tasks.myTasksTab}
          </button>
        </div>
      ) : null}

      {/* Filters — hidden for single-project contributors; always shown for platform / consultant managers */}
      {(!showWorkflowView ||
        availableFilterProjects.length > 1 ||
        showTasksProjectFilters) ? (
      <div className="flex shrink-0 flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            placeholder={t.tasks.searchProjects}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative group min-w-[180px] w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <select
              className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer appearance-none transition-all shadow-sm"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">{t.tasks.allProjects}</option>
              {filterProjectsByCategory.projects.length > 0 ? (
                <optgroup label={t.tasks.filterGroupProjects}>
                  {filterProjectsByCategory.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {filterProjectsByCategory.services.length > 0 ? (
                <optgroup label={t.tasks.filterGroupServices}>
                  {filterProjectsByCategory.services.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-900 transition-colors">
              <ChevronDown size={13} />
            </div>
          </div>

          {!showWorkflowView ? (
            <div className="relative group min-w-[170px] w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <select
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer appearance-none transition-all shadow-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">{t.tasks.allStatuses}</option>
                <option value="pending">{t.tasks.allPending}</option>
                <option value="completed">{t.tasks.allCompleted}</option>
                <option value="my-pending">{t.tasks.myPending}</option>
                <option value="my-completed">{t.tasks.myCompleted}</option>
                {(isAdmin || isTasksPageFilterAdmin(profile?.role)) ? (
                  <option value="my-assigned">{t.tasks.myAssignedFilter}</option>
                ) : null}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-900 transition-colors">
                <ChevronDown size={13} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {showWorkflowView ? (
        <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <TasksMyAssignmentsView
          mySentAssignments={mySentAssignments}
          projects={projects}
          platformUsers={platformUsers}
          contacts={contacts}
          questionsByProject={questionsByProject}
          answersByProject={answersByProject}
          toolbarTab={toolbarTab}
          onToolbarTabChange={setToolbarTab}
          toolbarTabCounts={toolbarTabCounts}
          toolbarTabLabels={toolbarTabLabels}
          workflowDataReady={workflowDataReady}
          workflowDataLoading={workflowDataLoading}
          onRefresh={() => void refreshTasks()}
          projectFilter={projectFilter}
          searchTerm={searchTerm}
        />
        </div>
      ) : null}

      {/* Admin / consultant assignment list */}
      {!showWorkflowView ? (
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-100 rounded-xl">
            <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
              <CheckSquare size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.tasks.noTasksFound}</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">{t.tasks.noTasksMatching}</p>
          </div>
        ) : (
          <>
            {paginatedTasks.map((task) => {
            const project = projects.find(p => p.id === task.projectId);
            const recipient = task.recipientType === 'user'
              ? platformUsers.find(u => u.id === task.recipientId)
              : contacts.find(c => c.id === task.recipientId);
            const isMyTask = task.recipientId === user?.uid;
            const isExpanded = expandedTaskId === task.id;
            const assignerName =
              task.assignedByName?.trim() ||
              platformUsers.find((u) => u.id === task.assignedBy)?.name ||
              t.tasks.unknownAssigner;
            const recipientName = recipient?.name || t.tasks.unknownRecipient;
            const recipientEmail = recipient?.email?.trim() || '';
            const refStr = getAssignmentRefDisplay(task);
            const assignedMs = getAssignmentDateMs(task);
            const qCount = (task.questionIds || []).length;
            const taskProgress = getAssignmentAnswerProgress(
              task,
              answersByProject[task.projectId] || [],
            );
            const canManage = canManageAssignment(
              task,
              user,
              profile,
              myProjectAssignments,
            );
            const hasAnswers = assignmentHasSubstantiveAnswers(
              task,
              answersByProject[task.projectId] || [],
            );

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                className={cn(
                  "relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all group",
                  isMyTask ? "border-blue-100 ring-1 ring-blue-50" : "border-slate-100",
                  isExpanded && "ring-2 ring-blue-500 border-transparent shadow-lg"
                )}
              >
                <ClipboardList
                  size={70}
                  strokeWidth={2}
                  className="pointer-events-none absolute -right-3 -bottom-3 text-slate-100 opacity-60 transform -rotate-12 transition-transform duration-500 group-hover:rotate-0"
                  aria-hidden
                />
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="relative shrink-0 overflow-visible">
                      <div
                        className={cn(
                          'relative flex h-11 w-11 items-center justify-center rounded-lg border text-sm',
                          task.status === 'completed'
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                            : 'border-slate-100 bg-slate-50 text-slate-400',
                        )}
                      >
                        <CheckSquare size={22} />
                        {qCount > 0 && (
                          <span
                            className="absolute -bottom-1 -right-1 z-10 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white shadow-sm"
                            title={t.tasks.assignedInfo
                              .replace('{count}', String(qCount))
                              .replace('{s}', qCount !== 1 ? 's' : '')
                              .replace(
                                '{date}',
                                task.sentAt
                                  ? new Date(task.sentAt).toLocaleDateString(dateLocale)
                                  : '',
                              )
                              .replace('{name}', assignerName)}
                          >
                            {qCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isTasksOnlyUser ? (
                          <span className="font-bold text-sm text-slate-900">
                            {project?.name || t.tasks.unknownProject}
                          </span>
                        ) : (
                          <Link to={`/projects/${task.projectId}`} className="font-bold text-sm text-slate-900 hover:text-blue-600 flex items-center gap-1 group/link">
                            {project?.name || t.tasks.unknownProject}
                            <ExternalLink size={11} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </Link>
                        )}
                        {isMyTask && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase tracking-tighter rounded">{t.tasks.assignedToYou}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
                        <span className="truncate">{assignerName}</span>
                        <ArrowRight size={12} className="text-slate-300 shrink-0" aria-hidden />
                        <span className="truncate">{recipientName}</span>
                        {task.recipientType === 'contact' && (
                          <span className="text-[8px] bg-slate-100 px-1 py-0.5 rounded text-slate-500 shrink-0">{t.tasks.stakeholder}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {assignedMs != null && (
                          <span>{new Date(assignedMs).toLocaleDateString(dateLocale)}</span>
                        )}
                        {assignedMs != null && task.deadline && (
                          <span className="text-slate-300" aria-hidden>−</span>
                        )}
                        {task.deadline && (
                          <span className={task.status === 'pending' && task.deadline < Date.now() ? 'text-red-500 font-bold' : ''}>
                            {new Date(task.deadline).toLocaleDateString(dateLocale)}
                          </span>
                        )}
                        {refStr && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-600">{refStr}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                    {canManage ? (
                      <>
                        {isAssignmentLinkSent(task) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleResendEmail(task);
                            }}
                            className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title={t.tasks.resendAssignmentEmail}
                          >
                            <Mail size={16} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setManageAssignment(task);
                            setIsManageModalOpen(true);
                          }}
                          className="p-1.5 text-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded transition-all"
                          title={t.tasks.manageAssignmentTitle}
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteAssignment(task.projectId, task, {
                              hasAnswers,
                            });
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title={t.tasks.deleteAssignment}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : isAdmin && task.status === 'completed' ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteAssignment(task.projectId, task, {
                            hasAnswers,
                          });
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title={t.tasks.deleteAssignment}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}

                    <div className="text-right hidden sm:block min-w-[100px]">
                      <p className={cn(
                        'text-[9px] font-extrabold uppercase tracking-wider',
                        (() => {
                          const display = resolveAssignmentDisplayStatus({
                            status: task.status,
                            urgency: task.urgency,
                            deadline: task.deadline,
                          });
                          const tone = assignmentDisplayStatusTone(display);
                          if (tone === 'green') return 'text-emerald-500';
                          if (tone === 'violet') return 'text-violet-600';
                          if (tone === 'red') return 'text-red-500';
                          if (tone === 'orange') return 'text-orange-600';
                          if (tone === 'amber') return 'text-amber-600';
                          if (tone === 'slate') return 'text-slate-500';
                          return 'text-blue-600';
                        })()
                      )}>
                        {labelForAssignmentDisplayStatus(
                          resolveAssignmentDisplayStatus({
                            status: task.status,
                            urgency: task.urgency,
                            deadline: task.deadline,
                          }),
                          {
                            completed: t.projectDetail.completedStatus,
                            awaitingApproval: t.projectDetail.awaitingApprovalStatus,
                            overdue: t.projectDetail.overdueStatus,
                            noDeadline: t.projectDetail.statusNoDeadline,
                            urgent: t.projectDetail.urgencyUrgent,
                            approaching: t.projectDetail.statusApproaching,
                            normal: t.projectDetail.urgencyNormal,
                          },
                        )}
                      </p>
                      {task.completedAt ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {t.tasks.doneAt.replace('{date}', new Date(task.completedAt).toLocaleDateString())}
                        </p>
                      ) : taskProgress.total > 0 ? (
                        <p className="mt-0.5 text-[10px] font-bold tabular-nums text-orange-500">
                          {formatQuestionnaireProgressLabel(taskProgress)}
                        </p>
                      ) : null}
                    </div>

                    {task.status === 'awaiting_approval' &&
                    (task.approverId === user?.uid || isAdmin) ? (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const result = await approveProjectAssignment(
                            task.projectId,
                            task.id,
                          );
                          if (!result.success) {
                            alert(
                              result.error ||
                                t.projectDetail.approveAssignmentFailed,
                            );
                            return;
                          }
                          void refreshTasks();
                        }}
                        className="minimal-button-primary !py-1.5 px-4 flex items-center gap-1.5 h-9 shrink-0 text-sm shadow-md rounded-lg bg-violet-700 hover:bg-violet-600"
                      >
                        {t.projectDetail.approveAssignment}
                      </button>
                    ) : isMyTask && task.status === 'pending' ? (
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className={cn(
                          'minimal-button-primary !py-1.5 px-4 flex items-center gap-1.5 h-9 shrink-0 text-sm shadow-md rounded-lg',
                          isExpanded && 'bg-slate-900'
                        )}
                      >
                        {isExpanded ? (
                          <><X size={13} /> {t.tasks.close}</>
                        ) : (
                          <>{t.tasks.startWork} <ArrowRight size={13} /></>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded transition-all"
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-blue-100/80 bg-white"
                    >
                      <div
                        ref={expandedQuestionnaireScrollRef}
                        className="max-h-[min(80vh,900px)] overflow-y-auto overscroll-contain"
                      >
                        <div className="overflow-hidden border-x-0 border-b-0 border-t border-blue-100/60 bg-white">
                          <UserAssignmentResponse
                            assignment={task}
                            projectId={task.projectId}
                            embedded
                            tasksViewMode
                            stickySectionHeaders
                            scrollContainerRef={expandedQuestionnaireScrollRef}
                            onClose={() => {
                              setExpandedTaskId(null);
                              void refreshTasks();
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
            <PaginationBar
              page={currentTaskPage}
              pageSize={taskPageSize}
              totalItems={filteredTasks.length}
              onPageChange={setTaskListPage}
              onPageSizeChange={setTaskPageSize}
              rangeSummaryTemplate={t.common.paginationRangeSummary}
              perPageLabel={t.common.paginationPerPageLabel}
              pageOfLabel={(c, tot) =>
                t.common.paginationPageOf.replace('{current}', String(c)).replace('{total}', String(tot))
              }
              prevLabel={t.common.paginationPrev}
              nextLabel={t.common.paginationNext}
            />
          </>
        )}
      </div>
      ) : null}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />

      <PageHelpFullModal
        helpUrl={settings.helpAssignmentsUrl || ''}
        helpMd={settings.helpAssignmentsMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.tasks.tasksGuidance,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
          interactiveTutorial: t.projectDetail.interactiveTutorial,
          noVideo: t.tasks.noVideo,
          tutorialVideo: t.tasks.tutorialVideo,
        }}
      />

      <AssignmentManageModal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setManageAssignment(null);
        }}
        assignment={manageAssignment}
        project={projects.find((p) => p.id === manageAssignment?.projectId)}
        platformUsers={platformUsers}
        contacts={contacts}
        onSaved={() => void refreshTasks()}
        onDeleteRequest={(assignment) => {
          handleDeleteAssignment(assignment.projectId, assignment, {
            hasAnswers: assignmentHasSubstantiveAnswers(
              assignment,
              answersByProject[assignment.projectId] || [],
            ),
          });
        }}
      />
    </div>
  );
}
