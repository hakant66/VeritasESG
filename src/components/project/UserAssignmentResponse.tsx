/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, type RefObject } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import * as DB from '../../services/db';
import {
  Question,
  Answer,
  AnswerAssigneeNote,
  Assignment,
  ProjectPage,
  QuestionAnswerFormat,
} from '../../types';
import {
  insertAssigneeNoteAfterIndex,
  normalizeAnswerAssigneeNotes,
} from '../../lib/answerAssigneeNotes';
import {
  questionMatchesToolbarTab,
  type TasksToolbarTabId,
} from '../../lib/questionWorkflow';
import {
  filterAndSortQuestionsByRecentActivity,
  type TasksRecentActivityFilterId,
} from '../../lib/tasksQuestionDateFilter';
import { useAuth } from '../../lib/AuthContext';
import { parseApiErrorMessage } from '../../lib/parseApiError';
import { canRespondOnTasksPage } from '../../lib/taskRespondent';
import { questionMatchesAssignmentIds } from '../../lib/projectQuestionUtils';
import { useTranslation } from '../../hooks/useTranslation';
import { TasksQuestionnaireHeader } from '../../features/tasks/components/TasksQuestionnaireHeader';
import { TasksNotifyProjectManagerBar } from '../../features/tasks/components/TasksNotifyProjectManagerBar';
import { EmbeddedAssignmentForms } from './EmbeddedAssignmentForms';
import {
  submitAssignmentForApproval,
} from '../../features/tasks/api/assignmentManage';
import { resolveStatusAfterAssigneeComplete } from '../../../lib/assignmentApproval';
import { getAuthToken } from '../../lib/authToken';

function responseAnswerFormat(q: Question): QuestionAnswerFormat {
  return q.answerFormat ?? 'textarea';
}

interface UserAssignmentResponseProps {
  assignment: Assignment;
  projectId: string;
  onClose: () => void;
  readonly?: boolean;
  /** When set, only questions matching this toolbar tab are shown. */
  toolbarTab?: TasksToolbarTabId;
  recentActivityFilter?: TasksRecentActivityFilterId;
  activityFilterBanner?: string;
  /** Tasks page: hide duplicate header, show form only. */
  embedded?: boolean;
  hideClose?: boolean;
  /** Parent refreshes workflow counts after saves. */
  onDataChange?: () => void;
  stickySectionHeaders?: boolean;
  stickySectionTopClass?: string;
  flushTopPadding?: boolean;
  compactHorizontalPadding?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  tasksViewMode?: boolean;
  showQuestionnaireHeader?: boolean;
  /** Parent renders questionnaire header elsewhere (e.g. plan preview left pane). */
  onQuestionnaireHeaderData?: (data: {
    visibleQuestionIds: string[];
    answers: Record<string, { text?: string; comment?: string; evidenceName?: string }>;
    progressBarClassName: string;
  }) => void;
  /** Plan sekmesi önizlemesi: kılavuz, örnek, not ve dosya ekleme UI gizlenir. */
  planPreviewMode?: boolean;
}

export default function UserAssignmentResponse({
  assignment,
  projectId,
  onClose,
  readonly: initialReadonly,
  toolbarTab,
  recentActivityFilter = 'all',
  activityFilterBanner,
  embedded,
  hideClose,
  onDataChange,
  stickySectionHeaders,
  stickySectionTopClass,
  flushTopPadding,
  compactHorizontalPadding,
  scrollContainerRef,
  tasksViewMode = false,
  showQuestionnaireHeader,
  onQuestionnaireHeaderData,
  planPreviewMode = false,
}: UserAssignmentResponseProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const isActuallyReadonly =
    initialReadonly || !canRespondOnTasksPage(assignment, user, profile);
  const effectiveTasksViewMode = tasksViewMode || !embedded;
  const shouldShowQuestionnaireHeader =
    showQuestionnaireHeader ?? !effectiveTasksViewMode;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [answerRecords, setAnswerRecords] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(assignment.status === 'completed');

  useEffect(() => {
    loadData();
  }, [assignment, projectId]);

  async function loadData() {
    setLoading(true);
    try {
      // Get the questions for this assignment
      const project = await DB.projects.get(projectId);
      const allQuestions = await DB.questions.listForProject(
        projectId,
        project?.templateId,
      );
      const filteredQuestions = allQuestions.filter((q) =>
        questionMatchesAssignmentIds(q, assignment.questionIds),
      );
      setQuestions(filteredQuestions);

      // Load project pages to group questions
      const projectPages = await DB.projects.listPages(projectId);
      // Filter pages to only those that have at least one question in this assignment
      const assignedPageIds = new Set(
        filteredQuestions.map((q) => q.pageId).filter(Boolean) as string[],
      );
      const filteredPages = projectPages.filter(
        (p) =>
          assignedPageIds.has(p.id) ||
          (p.sourceTemplatePageId && assignedPageIds.has(p.sourceTemplatePageId)),
      );
      setPages(filteredPages);
      if (filteredPages.length > 0 && !selectedPageId) {
        setSelectedPageId(filteredPages[0].id);
      }

      // Load existing answers
      // We check for both assignmentId match or recipientId + questionId match (legacy)
      const aSnap = await DB.getDocs(DB.query(
        DB.collection(DB.db, `projects/${projectId}/answers`),
        DB.where('assignmentId', '==', assignment.id)
      ));
      
      let finalDocs = aSnap.docs;
      
      // If none found by assignmentId, try recipientId (legacy fallback)
      if (finalDocs.length === 0) {
        const legacySnap = await DB.getDocs(DB.query(
          DB.collection(DB.db, `projects/${projectId}/answers`),
          DB.where('contactId', '==', assignment.recipientId)
        ));
        finalDocs = legacySnap.docs;
      }

      const ansMap: Record<string, any> = {};
      const records: Answer[] = [];
      finalDocs.forEach(d => {
        const data = d.data();
        records.push({ id: d.id, ...data } as Answer);
        ansMap[data.questionId] = {
          id: d.id,
          text: data.latestAnswer,
          comment: data.comment || '',
          notes: normalizeAnswerAssigneeNotes(data as Answer),
          evidenceName: data.evidenceName || '',
        };
      });
      setAnswerRecords(records);
      setAnswers(ansMap);
    } catch (err) {
      console.error("Error loading task data:", err);
    } finally {
      setLoading(false);
    }
  }

  const canEditThisAssignment = canRespondOnTasksPage(assignment, user, profile);

  const persistAnswerField = async (
    qId: string,
    val: string,
    field: 'text' | 'comment' | 'evidenceName',
    answerDocId: string,
  ) => {
    const respondentId = assignment.recipientId;
    const actorId = user?.uid || user?.id || respondentId;
    return DB.projects.saveAnswer(projectId, answerDocId, {
      assignmentId: assignment.id,
      questionId: qId,
      contactId: respondentId,
      submittedByUserId: actorId,
      onBehalfOfUserId: respondentId,
      latestAnswer: field === 'text' ? val : answersRef.current[qId]?.text ?? '',
      comment: field === 'comment' ? val : answersRef.current[qId]?.comment,
      answerNotes: answersRef.current[qId]?.notes as AnswerAssigneeNote[] | undefined,
      evidenceName: field === 'evidenceName' ? val : answersRef.current[qId]?.evidenceName,
      workflowStatus:
        field === 'text' && val.trim() ? 'customer_responded' : undefined,
    });
  };

  const handleUpdateAnswer = async (qId: string, val: string, field: 'text' | 'comment' | 'evidenceName' = 'text') => {
    let answerDocId = '';
    setAnswers((prev) => {
      const current = prev[qId] || { text: '', comment: '', evidenceName: '' };
      answerDocId = current.id || `${assignment.recipientId}_${qId}`;
      return { ...prev, [qId]: { ...current, [field]: val } };
    });

    if (!effectiveTasksViewMode && (isCompleted || isActuallyReadonly)) {
      return;
    }
    if (effectiveTasksViewMode && field === 'text') {
      return;
    }
    if (assignment.status === 'completed') {
      return;
    }

    setSaveError(null);
    setSavingId(qId);
    try {
      const saved = await persistAnswerField(qId, val, field, answerDocId);
      const resolvedId = saved.id || answerDocId;
      setAnswers((prev) => ({
        ...prev,
        [qId]: { ...prev[qId], id: resolvedId },
      }));
      if (field === 'text') {
        setAnswerRecords((prev) => {
          const idx = prev.findIndex((r) => r.questionId === qId);
          const next = [...prev];
          const patch = {
            id: resolvedId,
            projectId,
            assignmentId: assignment.id,
            questionId: qId,
            contactId: assignment.recipientId,
            latestAnswer: val,
            submittedAt: Date.now(),
            updatedAt: Date.now(),
            workflowStatus: 'customer_responded' as const,
          };
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...patch };
          } else {
            next.push(patch as Answer);
          }
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      setSaveError(parseApiErrorMessage(err, t.common.errorOccurred));
    } finally {
      setTimeout(() => setSavingId(null), 800);
    }
  };

  const handleAddAnswerNote = async (
    qId: string,
    text: string,
    insertAfterIndex: number,
  ) => {
    const entry = answersRef.current[qId];
    const currentNotes = (entry?.notes as AnswerAssigneeNote[] | undefined) ?? [];
    const nextNotes = insertAssigneeNoteAfterIndex(currentNotes, insertAfterIndex, text);
    const answerDocId = entry?.id || `${assignment.recipientId}_${qId}`;

    setSaveError(null);
    setSavingId(qId);
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], id: answerDocId, notes: nextNotes },
    }));

    try {
      const saved = await DB.projects.addAnswerAssigneeNote(projectId, answerDocId, {
        text,
        insertAfterIndex,
        assignmentId: assignment.id,
        questionId: qId,
        contactId: assignment.recipientId,
      });
      const resolvedId = saved.id || answerDocId;
      const notes = normalizeAnswerAssigneeNotes(saved);
      setAnswers((prev) => ({
        ...prev,
        [qId]: { ...prev[qId], id: resolvedId, notes },
      }));
    } catch (err) {
      console.error(err);
      setAnswers((prev) => ({
        ...prev,
        [qId]: { ...prev[qId], notes: currentNotes },
      }));
      setSaveError(parseApiErrorMessage(err, t.common.errorOccurred));
      throw err;
    } finally {
      setTimeout(() => setSavingId(null), 800);
    }
  };

  const handleSaveTextAnswer = async (qId: string) => {
    const entry = answersRef.current[qId];
    const text = entry?.text?.trim() ?? '';
    if (!text) return;

    const answerDocId = entry?.id || `${assignment.recipientId}_${qId}`;
    setSaveError(null);
    setSavingId(qId);
    setSavedId(null);
    try {
      const saved = await persistAnswerField(qId, text, 'text', answerDocId);
      const resolvedId = saved.id || answerDocId;
      setAnswers((prev) => ({
        ...prev,
        [qId]: { ...prev[qId], id: resolvedId, text },
      }));
      setAnswerRecords((prev) => {
        const idx = prev.findIndex((r) => r.questionId === qId);
        const next = [...prev];
        const patch = {
          id: resolvedId,
          projectId,
          assignmentId: assignment.id,
          questionId: qId,
          contactId: assignment.recipientId,
          latestAnswer: text,
          submittedAt: Date.now(),
          updatedAt: Date.now(),
          workflowStatus: 'customer_responded' as const,
        };
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...patch };
        } else {
          next.push(patch as Answer);
        }
        return next;
      });
      setSavedId(qId);
      setTimeout(() => setSavedId(null), 2000);
      onDataChange?.();
    } catch (err) {
      console.error(err);
      setSaveError(parseApiErrorMessage(err, t.common.errorOccurred));
    } finally {
      setTimeout(() => setSavingId(null), 800);
    }
  };

  const handleMarkAsComplete = async () => {
    setIsSubmitting(true);
    try {
      const nextStatus = resolveStatusAfterAssigneeComplete({
        approverId: assignment.approverId,
      });
      if (nextStatus === 'awaiting_approval' && getAuthToken()) {
        const result = await submitAssignmentForApproval(projectId, assignment.id, {
          clientOrigin: window.location.origin,
        });
        if (!result.success) {
          throw new Error(result.error || t.tasks.submissionFailed);
        }
      } else if (nextStatus === 'awaiting_approval') {
        await DB.setDoc(
          DB.doc(DB.db, `projects/${projectId}/assignments`, assignment.id),
          {
            status: 'awaiting_approval',
            submittedForApprovalAt: Date.now(),
          },
          { merge: true },
        );
      } else {
        await DB.setDoc(
          DB.doc(DB.db, `projects/${projectId}/assignments`, assignment.id),
          {
            status: 'completed',
            completedAt: Date.now(),
          },
          { merge: true },
        );
      }
      setIsCompleted(true);
      onDataChange?.();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t.tasks.submissionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignmentByQuestionId = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const qid of assignment.questionIds || []) {
      map.set(qid, assignment);
    }
    return map;
  }, [assignment]);

  const visibleQuestions = useMemo(() => {
    const pageOrder = new Map(pages.map((p, i) => [p.id, i]));
    let list = toolbarTab
      ? questions.filter((q) =>
          questionMatchesToolbarTab(q, answerRecords, assignment, toolbarTab),
        )
      : [...questions];
    return filterAndSortQuestionsByRecentActivity(
      list,
      answerRecords,
      assignmentByQuestionId,
      recentActivityFilter,
      pageOrder,
    );
  }, [
    questions,
    pages,
    toolbarTab,
    answerRecords,
    assignment,
    assignmentByQuestionId,
    recentActivityFilter,
  ]);

  const currentSelectedPageIdx = pages.findIndex(p => p.id === selectedPageId);
  const DATASET_COLORS = [
    { bg: 'bg-[#E3F2FD]', border: 'border-[#BBDEFB]', text: 'text-blue-900', activeBg: 'bg-[#BBDEFB]', dot: 'bg-blue-600', bar: 'bg-blue-500' },
    { bg: 'bg-[#F3E5F5]', border: 'border-[#E1BEE7]', text: 'text-purple-900', activeBg: 'bg-[#E1BEE7]', dot: 'bg-purple-600', bar: 'bg-purple-500' },
    { bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-900', activeBg: 'bg-[#C8E6C9]', dot: 'bg-green-600', bar: 'bg-green-500' },
    { bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-900', activeBg: 'bg-[#FFE0B2]', dot: 'bg-orange-600', bar: 'bg-orange-500' },
    { bg: 'bg-[#E0F2F1]', border: 'border-[#B2DFDB]', text: 'text-teal-900', activeBg: 'bg-[#B2DFDB]', dot: 'bg-teal-600', bar: 'bg-teal-500' },
    { bg: 'bg-[#FFFDE7]', border: 'border-[#FFF9C4]', text: 'text-yellow-900', activeBg: 'bg-[#FFF9C4]', dot: 'bg-yellow-600', bar: 'bg-yellow-500' },
  ];
  const currentPageColor = currentSelectedPageIdx !== -1 ? DATASET_COLORS[currentSelectedPageIdx % DATASET_COLORS.length] : DATASET_COLORS[0];

  useEffect(() => {
    if (!onQuestionnaireHeaderData || loading) return;
    onQuestionnaireHeaderData({
      visibleQuestionIds: visibleQuestions.map((q) => q.id),
      answers,
      progressBarClassName: currentPageColor.bar,
    });
  }, [
    onQuestionnaireHeaderData,
    loading,
    visibleQuestions,
    answers,
    currentPageColor.bar,
  ]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="animate-spin text-blue-600" size={32} />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{t.tasks.loadingQuestions}</p>
    </div>
  );

  if (isCompleted) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-6">
        <div className="text-emerald-500 mx-auto flex items-center justify-center">
          <CheckCircle2 size={64} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t.tasks.assignmentSubmitted}</h2>
        <p className="text-slate-500 text-sm font-medium">{t.tasks.assignmentSubmittedDesc}</p>
        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={() => setIsCompleted(false)}
            className="text-blue-600 font-bold hover:underline text-sm uppercase tracking-widest"
          >
            {t.tasks.reviewEditAnswers}
          </button>
          {!hideClose ? (
            <button
              onClick={onClose}
              className="minimal-button-primary bg-slate-900 text-white !py-3"
            >
              {t.tasks.closeTask}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {saveError ? (
        <p className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {saveError}
        </p>
      ) : null}
      {shouldShowQuestionnaireHeader && effectiveTasksViewMode ? (
        <TasksQuestionnaireHeader
          visibleQuestionIds={visibleQuestions.map((q) => q.id)}
          answers={answers}
          progressBarClassName={currentPageColor.bar}
        />
      ) : null}
      {effectiveTasksViewMode ? (
        <TasksNotifyProjectManagerBar
          assignment={assignment}
          projectId={projectId}
          answers={answers}
          answerRecords={answerRecords}
          onNotified={() => {
            onDataChange?.();
            void loadData();
          }}
        />
      ) : null}
      <EmbeddedAssignmentForms
        assignment={assignment}
        projectId={projectId}
        tasksViewMode={effectiveTasksViewMode}
        canEditResponse={effectiveTasksViewMode ? () => canEditThisAssignment : undefined}
        stickySectionHeaders={stickySectionHeaders}
        stickySectionTopClass={stickySectionTopClass}
        flushTopPadding={flushTopPadding}
        compactHorizontalPadding={compactHorizontalPadding}
        scrollContainerRef={scrollContainerRef}
        visibleQuestions={visibleQuestions}
        selectedPageId={selectedPageId}
        pages={pages}
        onSelectPage={setSelectedPageId}
        pageColors={DATASET_COLORS}
        currentPageColor={currentPageColor}
        answers={answers}
        answerRecords={answerRecords}
        savingId={savingId}
        isActuallyReadonly={isActuallyReadonly}
        isSubmitting={isSubmitting}
        onUpdateAnswer={handleUpdateAnswer}
        onAddAnswerNote={effectiveTasksViewMode ? handleAddAnswerNote : undefined}
        onSaveTextAnswer={effectiveTasksViewMode ? handleSaveTextAnswer : undefined}
        savedQuestionId={effectiveTasksViewMode ? savedId : null}
        activityFilterBanner={activityFilterBanner}
        onSubmitAssignment={() => void handleMarkAsComplete()}
        responseAnswerFormat={responseAnswerFormat}
        hideSubmitBar={effectiveTasksViewMode && hideClose}
        planPreviewMode={planPreviewMode}
      />
    </>
  );
}
