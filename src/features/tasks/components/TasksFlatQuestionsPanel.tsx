/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Merged question form for one project (all assignments, no per-assignment grouping).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import * as DB from '../../../services/db';
import type {
  Answer,
  AnswerAssigneeNote,
  Assignment,
  ProjectPage,
  Question,
  QuestionAnswerFormat,
} from '../../../types';
import {
  insertAssigneeNoteAfterIndex,
  normalizeAnswerAssigneeNotes,
} from '../../../lib/answerAssigneeNotes';
import { useAuth } from '../../../lib/AuthContext';
import { parseApiErrorMessage } from '../../../lib/parseApiError';
import { canRespondOnTasksPage } from '../../../lib/taskRespondent';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  questionMatchesToolbarTab,
  type TasksToolbarTabId,
} from '../../../lib/questionWorkflow';
import {
  filterAndSortQuestionsByRecentActivity,
  type TasksRecentActivityFilterId,
} from '../../../lib/tasksQuestionDateFilter';
import { EmbeddedAssignmentForms } from '../../../components/project/EmbeddedAssignmentForms';
import { TasksNotifyProjectManagerBar } from './TasksNotifyProjectManagerBar';

function responseAnswerFormat(q: Question): QuestionAnswerFormat {
  return q.answerFormat ?? 'textarea';
}

const DATASET_COLORS = [
  { bg: 'bg-[#E3F2FD]', border: 'border-[#BBDEFB]', text: 'text-blue-900', activeBg: 'bg-[#BBDEFB]', dot: 'bg-blue-600', bar: 'bg-blue-500' },
  { bg: 'bg-[#F3E5F5]', border: 'border-[#E1BEE7]', text: 'text-purple-900', activeBg: 'bg-[#E1BEE7]', dot: 'bg-purple-600', bar: 'bg-purple-500' },
  { bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-900', activeBg: 'bg-[#C8E6C9]', dot: 'bg-green-600', bar: 'bg-green-500' },
  { bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-900', activeBg: 'bg-[#FFE0B2]', dot: 'bg-orange-600', bar: 'bg-orange-500' },
  { bg: 'bg-[#E0F2F1]', border: 'border-[#B2DFDB]', text: 'text-teal-900', activeBg: 'bg-[#B2DFDB]', dot: 'bg-teal-600', bar: 'bg-teal-500' },
  { bg: 'bg-[#FFFDE7]', border: 'border-[#FFF9C4]', text: 'text-yellow-900', activeBg: 'bg-[#FFF9C4]', dot: 'bg-yellow-600', bar: 'bg-yellow-500' },
];

type TasksFlatQuestionsPanelProps = {
  projectId: string;
  assignments: Assignment[];
  toolbarTab: TasksToolbarTabId;
  recentActivityFilter?: TasksRecentActivityFilterId;
  activityFilterBanner?: string;
  onDataChange?: () => void;
  stickySectionHeaders?: boolean;
  stickySectionTopClass?: string;
  flushTopPadding?: boolean;
  compactHorizontalPadding?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  tasksViewMode?: boolean;
  canEditResponse?: (assignment: Assignment) => boolean;
};

export function TasksFlatQuestionsPanel({
  projectId,
  assignments,
  toolbarTab,
  recentActivityFilter = 'all',
  activityFilterBanner,
  onDataChange,
  stickySectionHeaders,
  stickySectionTopClass,
  flushTopPadding,
  compactHorizontalPadding,
  scrollContainerRef,
  tasksViewMode = true,
  canEditResponse,
}: TasksFlatQuestionsPanelProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const primaryAssignment = assignments[0];

  const assignmentByQuestionId = useMemo(() => {
    const map = new Map<string, Assignment>();
    const sorted = [...assignments].sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
    for (const a of sorted) {
      for (const qid of a.questionIds || []) {
        if (!map.has(qid)) map.set(qid, a);
      }
    }
    return map;
  }, [assignments]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [pages, setPages] = useState<ProjectPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        id?: string;
        text?: string;
        comment?: string;
        notes?: AnswerAssigneeNote[];
        evidenceName?: string;
      }
    >
  >({});
  const [answerRecords, setAnswerRecords] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const loadData = useCallback(async () => {
    if (!primaryAssignment || assignments.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const project = await DB.projects.get(projectId);
      const allQuestions = await DB.questions.listForProject(
        projectId,
        project?.templateId,
      );
      const qidSet = new Set(assignmentByQuestionId.keys());
      const filteredQuestions = allQuestions.filter(
        (q) =>
          qidSet.has(q.id) ||
          (q.sourceQuestionId ? qidSet.has(q.sourceQuestionId) : false),
      );
      setQuestions(filteredQuestions);

      const projectPages = await DB.projects.listPages(projectId);
      const assignedPageIds = new Set(
        filteredQuestions.map((q) => q.pageId).filter(Boolean) as string[],
      );
      const filteredPages = projectPages.filter(
        (p) =>
          assignedPageIds.has(p.id) ||
          (p.sourceTemplatePageId && assignedPageIds.has(p.sourceTemplatePageId)),
      );
      setPages(filteredPages);
      setSelectedPageId((prev) =>
        prev && filteredPages.some((p) => p.id === prev) ? prev : filteredPages[0]?.id ?? null,
      );

      const allAnswers = await DB.projects.listAnswers(projectId);
      const assignmentIds = new Set(assignments.map((a) => a.id));
      const recipientIds = new Set(assignments.map((a) => a.recipientId));

      const ansMap: Record<
        string,
        {
          id?: string;
          text?: string;
          comment?: string;
          notes?: AnswerAssigneeNote[];
          evidenceName?: string;
        }
      > = {};
      const records: Answer[] = [];
      for (const data of allAnswers) {
        const belongs =
          (data.assignmentId && assignmentIds.has(data.assignmentId)) ||
          recipientIds.has(data.contactId);
        if (!belongs) continue;
        const qid = data.questionId;
        if (!qidSet.has(qid)) continue;
        records.push(data);
        if (!ansMap[qid]) {
          ansMap[qid] = {
            id: data.id,
            text: data.latestAnswer,
            comment: data.comment || '',
            notes: normalizeAnswerAssigneeNotes(data),
            evidenceName: data.evidenceName || '',
          };
        }
      }
      setAnswerRecords(records);
      setAnswers(ansMap);
    } catch (err) {
      console.error('Error loading flat task questions:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, assignments, assignmentByQuestionId, primaryAssignment]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleQuestions = useMemo(() => {
    const pageOrder = new Map(pages.map((p, i) => [p.id, i]));
    let list = [...questions];
    list = list.filter((q) => {
      const a = assignmentByQuestionId.get(q.id);
      if (!a) return false;
      return questionMatchesToolbarTab(q, answerRecords, a, toolbarTab);
    });
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
    assignmentByQuestionId,
    answerRecords,
    toolbarTab,
    recentActivityFilter,
  ]);

  const defaultCanEditResponse = useCallback(
    (a: Assignment) => canRespondOnTasksPage(a, user, profile),
    [user, profile],
  );

  const resolveCanEdit = canEditResponse ?? defaultCanEditResponse;

  const persistAnswerField = async (
    assignment: Assignment,
    qId: string,
    val: string,
    field: 'text' | 'comment' | 'evidenceName',
    answerDocId: string,
  ) => {
    const respondentId = assignment.recipientId;
    const actorId = user?.uid || user?.id || respondentId;
    const payload = {
      assignmentId: assignment.id,
      questionId: qId,
      contactId: respondentId,
      submittedByUserId: actorId,
      onBehalfOfUserId: respondentId,
      latestAnswer: field === 'text' ? val : answersRef.current[qId]?.text ?? '',
      comment: field === 'comment' ? val : answersRef.current[qId]?.comment,
      answerNotes: answersRef.current[qId]?.notes,
      evidenceName: field === 'evidenceName' ? val : answersRef.current[qId]?.evidenceName,
      workflowStatus:
        field === 'text' && val.trim()
          ? ('customer_responded' as const)
          : undefined,
    };

    const saved = await DB.projects.saveAnswer(projectId, answerDocId, payload);
    return saved;
  };

  const handleUpdateAnswer = async (
    qId: string,
    val: string,
    field: 'text' | 'comment' | 'evidenceName' = 'text',
  ) => {
    const assignment = assignmentByQuestionId.get(qId);
    if (!assignment) return;

    let answerDocId = '';
    setAnswers((prev) => {
      const current = prev[qId] || { text: '', comment: '', evidenceName: '' };
      answerDocId = current.id || `${assignment.recipientId}_${qId}`;
      return { ...prev, [qId]: { ...current, [field]: val } };
    });

    if (tasksViewMode && field === 'text') return;

    setSaveError(null);
    setSavingId(qId);
    try {
      const saved = await persistAnswerField(assignment, qId, val, field, answerDocId);
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
    const assignment = assignmentByQuestionId.get(qId);
    if (!assignment) return;

    const entry = answersRef.current[qId];
    const currentNotes = entry?.notes ?? [];
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
    const assignment = assignmentByQuestionId.get(qId);
    if (!assignment) {
      setSaveError(t.common.errorOccurred);
      return;
    }

    const entry = answersRef.current[qId];
    const text = entry?.text?.trim() ?? '';
    if (!text) return;

    const answerDocId = entry?.id || `${assignment.recipientId}_${qId}`;
    setSaveError(null);
    setSavingId(qId);
    setSavedId(null);
    try {
      const saved = await persistAnswerField(assignment, qId, text, 'text', answerDocId);
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

  const currentSelectedPageIdx = pages.findIndex((p) => p.id === selectedPageId);
  const currentPageColor =
    currentSelectedPageIdx !== -1
      ? DATASET_COLORS[currentSelectedPageIdx % DATASET_COLORS.length]
      : DATASET_COLORS[0];

  const getAssignmentForQuestion = useCallback(
    (q: Question) => assignmentByQuestionId.get(q.id) ?? primaryAssignment,
    [assignmentByQuestionId, primaryAssignment],
  );

  if (!primaryAssignment) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
          {t.tasks.loadingQuestions}
        </p>
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
      {tasksViewMode
        ? assignments.map((assignment) => (
            <TasksNotifyProjectManagerBar
              key={assignment.id}
              assignment={assignment}
              projectId={projectId}
              answers={answers}
              answerRecords={answerRecords}
              onNotified={onDataChange}
            />
          ))
        : null}
    <EmbeddedAssignmentForms
      assignment={primaryAssignment}
      getAssignmentForQuestion={getAssignmentForQuestion}
      projectId={projectId}
      hideSubmitBar
      tasksViewMode={tasksViewMode}
      canEditResponse={resolveCanEdit}
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
      isActuallyReadonly={false}
      isSubmitting={false}
      onUpdateAnswer={handleUpdateAnswer}
      onAddAnswerNote={tasksViewMode ? handleAddAnswerNote : undefined}
      onSaveTextAnswer={tasksViewMode ? handleSaveTextAnswer : undefined}
      savedQuestionId={savedId}
      activityFilterBanner={activityFilterBanner}
      onSubmitAssignment={() => {}}
      responseAnswerFormat={responseAnswerFormat}
    />
    </>
  );
}
