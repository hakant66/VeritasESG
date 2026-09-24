/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Project-detail "forms" visual style for task assignment responses.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { flushSync } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  MessageSquare,
  Paperclip,
  FileUp,
  Trash2,
  ArrowUp,
  ArrowDown,
  Send,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { AnswerAssigneeNote, Assignment, Question, QuestionAnswerFormat } from '../../types';
import { TasksAnswerNotesSection } from '../../features/tasks/components/TasksAnswerNotesSection';
import { TasksEvidenceAttach } from '../../features/tasks/components/TasksEvidenceAttach';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import {
  QuestionGuidanceLightbulbButton,
  QuestionGuidanceMaterialsModal,
  countQuestionGuidanceMaterials,
  questionHasGuidanceMaterials,
} from './QuestionGuidanceMaterials';
import { HelpMarkdown } from '../ui/HelpMarkdown';
import {
  getQuestionWorkflowState,
  workflowStatusLabel,
} from '../../lib/questionWorkflow';
import { autofillTaskQuestionAnswer, fetchTaskLlmProviderSummary } from '../../lib/kbRag';
import { ApiClientError } from '../../lib/apiClient';
import {
  isLlmProviderId,
  LLM_PROVIDER_LABELS,
  type LlmProviderId,
} from '../../../lib/llmSettings.ts';

type PageColor = {
  bg: string;
  border: string;
  text: string;
  activeBg: string;
};

/** Avoid "GENEL BEYANLAR · GENEL BEYANLAR" when page title matches thematic group. */
function shouldPrefixTasksGroupWithPageTitle(
  pageTitle: string | null | undefined,
  groupName: string,
): boolean {
  const page = pageTitle?.trim() ?? '';
  const group = groupName.trim();
  if (!page) return false;
  return page.localeCompare(group, undefined, { sensitivity: 'accent' }) !== 0;
}

type EmbeddedAssignmentFormsProps = {
  assignment: Assignment;
  /** When questions span multiple assignments, resolve workflow per question. */
  getAssignmentForQuestion?: (q: Question) => Assignment;
  /** Hide assignment-level submit (e.g. flat all-questions view). */
  hideSubmitBar?: boolean;
  /** Sticky baslik cubugu (Görevler / proje formlari). */
  stickySectionHeaders?: boolean;
  /** e.g. top-[var(--tasks-sticky-offset)] when a page toolbar is already sticky */
  stickySectionTopClass?: string;
  /** Remove top padding (Görevler — tüm sorular görünümü). */
  flushTopPadding?: boolean;
  /** Full-width forms without side inset (Görevler grouped view). */
  compactHorizontalPadding?: boolean;
  /** Scroll parent for group/question navigation (Görevler forms pane). */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  /** Görevler sayfası: durum bandı ve workflow dropdown gizlenir. */
  tasksViewMode?: boolean;
  /** Plan sekmesi önizlemesi: kılavuz, örnek, not ve dosya ekleme UI gizlenir. */
  planPreviewMode?: boolean;
  /** Görevler: tarih filtresi aktifken renkli bant metni. */
  activityFilterBanner?: string;
  /** Görevler: soru bazında düzenlenebilirlik (yoksa isActuallyReadonly). */
  canEditResponse?: (assignment: Assignment) => boolean;
  /** Görevler: AI ile doldur için proje kimliği. */
  projectId?: string;
  visibleQuestions: Question[];
  selectedPageId: string | null;
  pages: { id: string; title: string }[];
  onSelectPage: (pageId: string) => void;
  pageColors: PageColor[];
  currentPageColor: PageColor;
  answers: Record<
    string,
    {
      text?: string;
      comment?: string;
      notes?: AnswerAssigneeNote[];
      evidenceName?: string;
    }
  >;
  answerRecords: import('../../types').Answer[];
  savingId: string | null;
  isActuallyReadonly: boolean;
  isSubmitting: boolean;
  onUpdateAnswer: (qId: string, val: string, field: 'text' | 'comment' | 'evidenceName') => void;
  /** Görevler: danışman notu ekle (insertAfterIndex: -1 = ilk not). */
  onAddAnswerNote?: (
    qId: string,
    text: string,
    insertAfterIndex: number,
  ) => void | Promise<void>;
  /** Görevler: yanıt metnini kaydet (textarea altındaki Kaydet). */
  onSaveTextAnswer?: (qId: string) => void;
  /** Son başarılı kayıt (Kaydet → Kaydedildi). */
  savedQuestionId?: string | null;
  onSubmitAssignment: () => void;
  responseAnswerFormat: (q: Question) => QuestionAnswerFormat;
};

export function EmbeddedAssignmentForms({
  assignment,
  getAssignmentForQuestion,
  hideSubmitBar = false,
  stickySectionHeaders = false,
  stickySectionTopClass = 'top-0',
  flushTopPadding = false,
  compactHorizontalPadding = false,
  scrollContainerRef,
  tasksViewMode = false,
  planPreviewMode = false,
  activityFilterBanner,
  canEditResponse,
  projectId,
  visibleQuestions,
  selectedPageId,
  pages,
  onSelectPage,
  pageColors,
  currentPageColor,
  answers,
  answerRecords,
  savingId,
  isActuallyReadonly,
  isSubmitting,
  onUpdateAnswer,
  onAddAnswerNote,
  onSaveTextAnswer,
  savedQuestionId = null,
  onSubmitAssignment,
  responseAnswerFormat,
}: EmbeddedAssignmentFormsProps) {
  const { t, lang } = useTranslation();
  const pd = t.projectDetail;
  const [guidanceModalQuestion, setGuidanceModalQuestion] = useState<Question | null>(null);
  const guidanceMaterialsLabels = useMemo(
    () => ({
      sectionTitle: pd.helpMaterialsSectionTitle,
      guidance: pd.guidance,
      example: pd.example,
      videoTitle: t.templates.aciklamaVideoUrlLabel,
      noContent: pd.formsHelpNoExtraContent,
    }),
    [pd, t],
  );
  const answerNoteLabels = useMemo(
    () => ({
      addComment: t.tasks.addComment,
      notesForConsultant: t.tasks.notesForConsultant,
      saveNote: t.tasks.saveNote,
      saving: t.tasks.saving,
    }),
    [t],
  );
  const renderTasksAnswerNotes = (
    qId: string,
    questionReadonly: boolean,
  ) => {
    if (!tasksViewMode || !onAddAnswerNote || planPreviewMode) return null;
    return (
      <TasksAnswerNotesSection
        notes={answers[qId]?.notes ?? []}
        readonly={questionReadonly}
        saving={savingId === qId}
        onAddNote={(text, insertAfterIndex) =>
          onAddAnswerNote(qId, text, insertAfterIndex)
        }
        labels={answerNoteLabels}
      />
    );
  };
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [autofillingLocalQuestionId, setAutofillingLocalQuestionId] = useState<string | null>(null);
  const [autofillingGeneralQuestionId, setAutofillingGeneralQuestionId] = useState<string | null>(
    null,
  );
  const [taskLlmTextProvider, setTaskLlmTextProvider] = useState<LlmProviderId | null>(null);
  const [taskLlmTextModel, setTaskLlmTextModel] = useState<string>('');
  const [taskLlmTextConfigured, setTaskLlmTextConfigured] = useState(true);

  useEffect(() => {
    if (!tasksViewMode || !projectId) return;
    let cancelled = false;
    void fetchTaskLlmProviderSummary()
      .then((summary) => {
        if (cancelled) return;
        const provider = summary.textProvider;
        setTaskLlmTextProvider(isLlmProviderId(provider) ? provider : null);
        setTaskLlmTextModel(String(summary.textModel || '').trim());
        setTaskLlmTextConfigured(Boolean(summary.textConfigured));
      })
      .catch(() => {
        if (!cancelled) {
          setTaskLlmTextProvider(null);
          setTaskLlmTextModel('');
          setTaskLlmTextConfigured(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tasksViewMode, projectId]);

  const generalAiProviderLabel = useMemo(() => {
    if (!taskLlmTextProvider) return t.tasks.aiGeneralAutofillNotConfigured;
    const name = LLM_PROVIDER_LABELS[taskLlmTextProvider][lang];
    if (taskLlmTextModel) {
      return t.tasks.aiGeneralAutofillProviderWithModel
        .replace('{provider}', name)
        .replace('{model}', taskLlmTextModel);
    }
    return t.tasks.aiGeneralAutofillProvider.replace('{provider}', name);
  }, [
    taskLlmTextProvider,
    taskLlmTextModel,
    lang,
    t.tasks.aiGeneralAutofillNotConfigured,
    t.tasks.aiGeneralAutofillProvider,
    t.tasks.aiGeneralAutofillProviderWithModel,
  ]);

  const handleLocalAiAutofillAnswer = useCallback(
    async (q: Question) => {
      if (!projectId || !tasksViewMode) return;
      const assignmentForQuestion = getAssignmentForQuestion?.(q) ?? assignment;
      setAutofillingLocalQuestionId(q.id);
      try {
        const result = await autofillTaskQuestionAnswer({
          projectId,
          questionId: q.id,
          assignmentId: assignmentForQuestion.id,
          lang,
          mode: 'local',
        });
        onUpdateAnswer(q.id, result.answer, 'text');
      } catch (err) {
        console.error('Task question local AI autofill failed', err);
        if (err instanceof ApiClientError) {
          if (err.code === 'kb-rag/no-indexed-docs') {
            alert(t.customers.aiAutofillNoKb);
            return;
          }
          if (err.code === 'kb-rag/llm-unavailable' || err.code === 'kb-rag/llm-not-configured') {
            alert(t.customers.aiAutofillGeminiBusy);
            return;
          }
        }
        alert(t.customers.aiAutofillFailed);
      } finally {
        setAutofillingLocalQuestionId(null);
      }
    },
    [
      projectId,
      tasksViewMode,
      getAssignmentForQuestion,
      assignment,
      lang,
      onUpdateAnswer,
      t.customers.aiAutofillFailed,
      t.customers.aiAutofillGeminiBusy,
      t.customers.aiAutofillNoKb,
    ],
  );

  const handleGeneralAiAutofillAnswer = useCallback(
    async (q: Question) => {
      if (!projectId || !tasksViewMode) return;
      const assignmentForQuestion = getAssignmentForQuestion?.(q) ?? assignment;
      setAutofillingGeneralQuestionId(q.id);
      try {
        const result = await autofillTaskQuestionAnswer({
          projectId,
          questionId: q.id,
          assignmentId: assignmentForQuestion.id,
          lang,
          mode: 'general',
        });
        onUpdateAnswer(q.id, result.answer, 'text');
      } catch (err) {
        console.error('Task question general AI autofill failed', err);
        if (err instanceof ApiClientError) {
          if (err.code === 'kb-rag/llm-unavailable' || err.code === 'kb-rag/llm-not-configured') {
            alert(t.customers.aiAutofillGeminiBusy);
            return;
          }
        }
        alert(t.customers.aiAutofillFailed);
      } finally {
        setAutofillingGeneralQuestionId(null);
      }
    },
    [
      projectId,
      tasksViewMode,
      getAssignmentForQuestion,
      assignment,
      lang,
      onUpdateAnswer,
      t.customers.aiAutofillFailed,
      t.customers.aiAutofillGeminiBusy,
    ],
  );

  const renderEvidenceAttach = (qId: string, questionReadonly: boolean) => {
    if (planPreviewMode) return null;
    if (tasksViewMode) {
      return (
        <TasksEvidenceAttach
          evidenceName={answers[qId]?.evidenceName}
          readonly={questionReadonly}
          saving={savingId === qId}
          attachLabel={t.tasks.attachFile}
          manageLabel={t.tasks.manageEvidence}
          onAttach={(fileName) => onUpdateAnswer(qId, fileName, 'evidenceName')}
          onRemove={() => onUpdateAnswer(qId, '', 'evidenceName')}
        />
      );
    }
    return null;
  };
  const pageTabsRef = useRef<HTMLDivElement>(null);
  const groupHeaderMeasureRef = useRef<HTMLDivElement>(null);
  const [pageTabsHeight, setPageTabsHeight] = useState(0);
  const [groupHeaderHeight, setGroupHeaderHeight] = useState(60);

  useLayoutEffect(() => {
    if (!stickySectionHeaders || tasksViewMode || pages.length <= 1) {
      setPageTabsHeight(0);
      return;
    }
    const el = pageTabsRef.current;
    if (!el) return;
    const update = () => setPageTabsHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stickySectionHeaders, pages.length, selectedPageId, tasksViewMode]);

  const showPageTabs = !tasksViewMode && pages.length > 1;

  const pageQuestions = useMemo(
    () =>
      tasksViewMode
        ? visibleQuestions
        : visibleQuestions.filter((q) => !selectedPageId || q.pageId === selectedPageId),
    [visibleQuestions, selectedPageId, tasksViewMode],
  );

  const flatQuestions = pageQuestions;

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev };
      const groupNames = new Set(
        pageQuestions.map((q) => q.thematicGroup || pd.generalDeclarations),
      );
      for (const g of groupNames) {
        if (next[`group-guidance-${g}`] === undefined) {
          next[`group-guidance-${g}`] = false;
        }
      }
      for (const q of pageQuestions) {
        if (next[`guidance-${q.id}`] === undefined) {
          next[`guidance-${q.id}`] = false;
        }
        if (next[`example-${q.id}`] === undefined) {
          next[`example-${q.id}`] = false;
        }
      }
      return next;
    });
  }, [pageQuestions, pd.generalDeclarations, tasksViewMode]);

  const groupEntries = useMemo(() => {
    if (tasksViewMode) {
      const entries: Array<{
        groupName: string;
        pageId: string;
        pageTitle: string | null;
        pageIndex: number;
        groupIndexOnPage: number;
      }> = [];
      const seen = new Set<string>();
      for (const [pageIndex, page] of pages.entries()) {
        let groupIndexOnPage = 0;
        for (const q of pageQuestions) {
          if (q.pageId !== page.id) continue;
          const groupName = q.thematicGroup || pd.generalDeclarations;
          const key = `${page.id}::${groupName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          entries.push({
            groupName,
            pageId: page.id,
            pageTitle: page.title,
            pageIndex,
            groupIndexOnPage: groupIndexOnPage++,
          });
        }
      }
      return entries;
    }

    const names = Array.from(
      new Set(pageQuestions.map((q) => q.thematicGroup || pd.generalDeclarations)),
    ) as string[];
    const pageIndex = Math.max(0, pages.findIndex((p) => p.id === selectedPageId));
    return names.map((groupName, groupIndexOnPage) => ({
      groupName,
      pageId: selectedPageId || '',
      pageTitle: null as string | null,
      pageIndex,
      groupIndexOnPage,
    }));
  }, [tasksViewMode, pageQuestions, pages, selectedPageId, pd.generalDeclarations]);

  useLayoutEffect(() => {
    if (!stickySectionHeaders) {
      setGroupHeaderHeight(0);
      return;
    }
    const el = groupHeaderMeasureRef.current;
    if (!el) return;
    const update = () => setGroupHeaderHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stickySectionHeaders, groupEntries.length, selectedPageId, expandedSections]);

  const questionHeaderStickyTop = stickySectionHeaders
    ? pageTabsHeight + groupHeaderHeight
    : 0;

  const buildGroupScope = (entry: { groupName: string; pageId: string }) =>
    `${entry.pageId || selectedPageId || 'all'}-${encodeURIComponent(entry.groupName)}`;

  const TASKS_STICKY_GROUP_OFFSET_PX = 56;

  const scrollFormsTarget = useCallback(
    (elementId: string) => {
      const scrollEl = scrollContainerRef?.current;
      const target = document.getElementById(elementId);
      if (!scrollEl || !target) {
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const targetTop =
        target.getBoundingClientRect().top -
        scrollEl.getBoundingClientRect().top +
        scrollEl.scrollTop;

      const isGroupHeader = elementId.startsWith('task-form-group-hdr-');
      let offset = 0;
      if (!isGroupHeader) {
        const groupHeader = target
          .closest('[data-task-form-group]')
          ?.querySelector<HTMLElement>('[id^="task-form-group-hdr-"]');
        offset = groupHeader?.offsetHeight ?? TASKS_STICKY_GROUP_OFFSET_PX;
      }

      scrollEl.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior: 'smooth',
      });
    },
    [scrollContainerRef],
  );

  const expandGroup = (groupScope: string) => {
    setExpandedSections((prev) => {
      if (!prev[`group-collapsed-${groupScope}`]) return prev;
      const next = { ...prev };
      delete next[`group-collapsed-${groupScope}`];
      return next;
    });
  };

  const scrollToQuestion = (questionId: string) => {
    const q = pageQuestions.find((pq) => pq.id === questionId);
    if (q) {
      const groupScope = buildGroupScope({
        groupName: q.thematicGroup || pd.generalDeclarations,
        pageId: q.pageId || '',
      });
      flushSync(() => expandGroup(groupScope));
      scrollFormsTarget(`task-form-question-${questionId}`);
      return;
    }
    scrollFormsTarget(`task-form-question-${questionId}`);
  };

  const navigateToGroup = (entry: { groupName: string; pageId: string }) => {
    const groupScope = buildGroupScope(entry);
    flushSync(() => expandGroup(groupScope));
    scrollFormsTarget(`task-form-group-hdr-${groupScope}`);
  };

  const toggleGroupCollapsed = (groupScope: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [`group-collapsed-${groupScope}`]: !prev[`group-collapsed-${groupScope}`],
    }));
  };

  return (
    <div className="space-y-0">
      {showPageTabs ? (
        <div
          ref={pageTabsRef}
          className={cn(
            'flex items-end gap-1.5 overflow-x-auto border-b border-slate-200/70 bg-[#F8F9FA] pb-0 pt-1 no-scrollbar',
            stickySectionHeaders && 'sticky top-0 z-[25] shadow-sm',
          )}
        >
          {pages.map((page, idx) => {
            const isSelected = selectedPageId === page.id;
            const color = pageColors[idx % pageColors.length];
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectPage(page.id)}
                className={cn(
                  'shrink-0 rounded-t-[14px] border-t-2 border-l-2 border-r-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight transition-opacity',
                  color.bg,
                  color.border,
                  color.text,
                  isSelected ? 'z-20 mb-[-1px] opacity-100 shadow-sm' : 'opacity-70 hover:opacity-100',
                )}
              >
                {page.title}
              </button>
            );
          })}
        </div>
      ) : null}

      {tasksViewMode && activityFilterBanner ? (
        <div
          className={cn(
            'flex min-h-[2.75rem] flex-wrap items-center gap-x-3 gap-y-1 border-b px-5 py-2',
            currentPageColor.bg,
            currentPageColor.border,
            currentPageColor.text,
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.15em]">
            {activityFilterBanner}
          </p>
          <p className="text-[9px] font-semibold opacity-80">
            {t.tasks.recentActivityFilterBanner}
          </p>
        </div>
      ) : null}

      <section
        className={cn(
          'bg-[#F8F9FA] pb-6',
          flushTopPadding || compactHorizontalPadding
            ? 'space-y-0 rounded-none px-0 pt-0'
            : 'space-y-4 rounded-b-xl px-1 pt-4 sm:px-2',
        )}
      >
        {pageQuestions.length === 0 ? (
          <div className="rounded-none border border-dashed border-slate-200 bg-white px-8 py-12 text-center text-sm text-slate-500">
            {t.tasks.noTasksMatching}
          </div>
        ) : null}

        {groupEntries.map((entry, groupIdx) => {
          const groupQuestions = pageQuestions.filter(
            (q) =>
              (q.thematicGroup || pd.generalDeclarations) === entry.groupName &&
              (!tasksViewMode || q.pageId === entry.pageId),
          );
          const groupScope = buildGroupScope(entry);
          const groupCollapsed = Boolean(expandedSections[`group-collapsed-${groupScope}`]);
          const groupGuidanceShown = expandedSections[`group-guidance-${entry.groupName}`] !== false;
          const groupGuidanceMaterialsCount = groupQuestions.filter((gq) =>
            questionHasGuidanceMaterials(gq.aciklama, gq.ornekYanit, gq.aciklamaVideoUrl),
          ).length;
          const isFirstGroup = groupIdx === 0;
          const isLastGroup = groupIdx === groupEntries.length - 1;
          const groupColor = tasksViewMode
            ? pageColors[(entry.pageIndex + entry.groupIndexOnPage) % pageColors.length]
            : currentPageColor;
          const groupToolbarColor = tasksViewMode ? groupColor : currentPageColor;

          return (
            <div
              key={groupScope}
              data-task-form-group
              className={cn(
                'border-x border-b border-slate-200 bg-white',
                tasksViewMode ? 'shadow-none' : 'shadow-sm',
                groupIdx === 0 && 'border-t',
              )}
            >
              <div
                id={`task-form-group-hdr-${groupScope}`}
                ref={groupIdx === 0 ? groupHeaderMeasureRef : undefined}
                title={
                  groupCollapsed
                    ? pd.formsExpandGroupSection
                    : pd.formsCollapseGroupSection
                }
                onDoubleClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  toggleGroupCollapsed(groupScope);
                }}
                className={cn(
                  'flex min-w-0 cursor-default items-center justify-between gap-3 border-b',
                  tasksViewMode ? 'h-[60px] min-h-[60px] shrink-0 pl-5 pr-4' : 'px-4 py-3',
                  stickySectionHeaders && 'sticky z-20',
                  stickySectionHeaders && !tasksViewMode && 'shadow-sm',
                  stickySectionHeaders && pageTabsHeight <= 0 && 'top-0',
                  stickySectionHeaders && pageTabsHeight > 0 && 'top-auto',
                  groupColor.bg,
                  tasksViewMode ? groupColor.border : currentPageColor.border,
                )}
                style={
                  stickySectionHeaders
                    ? { top: pageTabsHeight }
                    : undefined
                }
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <h3
                    className={cn(
                      'min-w-0 truncate uppercase',
                      tasksViewMode
                        ? 'text-xs font-extrabold tracking-widest sm:text-[13px]'
                        : 'text-xs font-black tracking-[0.15em]',
                      groupColor.text,
                    )}
                  >
                    {tasksViewMode &&
                    pages.length > 1 &&
                    shouldPrefixTasksGroupWithPageTitle(entry.pageTitle, entry.groupName) ? (
                      <>
                        <span className="opacity-70">{entry.pageTitle}</span>
                        <span className="mx-1.5 font-normal opacity-40">·</span>
                      </>
                    ) : null}
                    {entry.groupName}
                  </h3>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums leading-none',
                      groupColor.activeBg,
                      groupColor.text,
                    )}
                  >
                    {groupQuestions.length}
                    {tasksViewMode ? (
                      <span className="ml-1 font-semibold normal-case tracking-normal opacity-80">
                        {t.tasks.items}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleGroupCollapsed(groupScope);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title={
                      groupCollapsed
                        ? pd.formsExpandGroupSection
                        : pd.formsCollapseGroupSection
                    }
                    aria-label={
                      groupCollapsed
                        ? pd.formsExpandGroupSection
                        : pd.formsCollapseGroupSection
                    }
                    aria-expanded={!groupCollapsed}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all hover:bg-white',
                      groupToolbarColor.border,
                      groupToolbarColor.text,
                      groupCollapsed
                        ? 'bg-white/70 opacity-80'
                        : 'bg-white shadow-sm ring-1 ring-black/[0.06]',
                    )}
                  >
                    <ChevronDown
                      size={16}
                      strokeWidth={2}
                      className={cn(
                        'transition-transform duration-200',
                        groupCollapsed && '-rotate-90',
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={isFirstGroup}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isFirstGroup) navigateToGroup(groupEntries[groupIdx - 1]!);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white/70 transition-all hover:bg-white',
                      groupToolbarColor.border,
                      groupToolbarColor.text,
                      isFirstGroup && 'cursor-not-allowed opacity-40',
                    )}
                    aria-label="Previous section"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={isLastGroup}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isLastGroup) navigateToGroup(groupEntries[groupIdx + 1]!);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white/70 transition-all hover:bg-white',
                      groupToolbarColor.border,
                      groupToolbarColor.text,
                      isLastGroup && 'cursor-not-allowed opacity-40',
                    )}
                    aria-label="Next section"
                  >
                    <ArrowDown size={16} />
                  </button>
                  {!tasksViewMode ? (
                    <QuestionGuidanceLightbulbButton
                      count={groupGuidanceMaterialsCount}
                      active={
                        groupGuidanceShown ||
                        (guidanceModalQuestion !== null &&
                          groupQuestions.some((gq) => gq.id === guidanceModalQuestion.id))
                      }
                      interactive={false}
                      title={`Bu bölümde ${groupGuidanceMaterialsCount} soruda Video, Kılavuz veya Örnek içerik bulunmaktadır. Bu bölümdeki yardımcı içerikleri göster`}
                      className={cn(
                        'h-9 min-w-9',
                        groupToolbarColor.border,
                        groupToolbarColor.text,
                      )}
                    />
                  ) : null}
                </div>
              </div>

              {!groupCollapsed ? (
                <div
                  className={cn(
                    tasksViewMode ? 'divide-y divide-slate-100/90' : 'divide-y divide-slate-100',
                  )}
                >
                  {groupQuestions.map((q, qIdx) => {
                    const globalIdx = flatQuestions.findIndex((fq) => fq.id === q.id);
                    const useGroupScopedNav = tasksViewMode && stickySectionHeaders;
                    const canNavigatePrev = useGroupScopedNav
                      ? qIdx > 0
                      : globalIdx > 0;
                    const canNavigateNext = useGroupScopedNav
                      ? qIdx < groupQuestions.length - 1
                      : globalIdx >= 0 && globalIdx < flatQuestions.length - 1;
                    const prevId = canNavigatePrev
                      ? useGroupScopedNav
                        ? groupQuestions[qIdx - 1]?.id
                        : flatQuestions[globalIdx - 1]?.id
                      : undefined;
                    const nextId = canNavigateNext
                      ? useGroupScopedNav
                        ? groupQuestions[qIdx + 1]?.id
                        : flatQuestions[globalIdx + 1]?.id
                      : undefined;
                    const questionCollapsed = Boolean(
                      expandedSections[`question-collapsed-${q.id}`],
                    );
                    const questionNavBtnClass =
                      'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200/80 disabled:hover:bg-white';
                    const questionGuidanceCount = countQuestionGuidanceMaterials(
                      q.aciklama,
                      q.ornekYanit,
                      q.aciklamaVideoUrl,
                    );
                    const workflowState = getQuestionWorkflowState(q, answerRecords, [
                      getAssignmentForQuestion?.(q) ?? assignment,
                    ]);
                    const hasAnswer = Boolean(answers[q.id]?.text?.trim());
                    const questionAssignment = getAssignmentForQuestion?.(q) ?? assignment;
                    const questionReadonly = tasksViewMode
                      ? canEditResponse
                        ? !canEditResponse(questionAssignment)
                        : isActuallyReadonly
                      : canEditResponse
                        ? !canEditResponse(questionAssignment)
                        : isActuallyReadonly;
                    const questionPadX = compactHorizontalPadding ? 'px-4' : 'px-6';
                    const groupLabel = q.thematicGroup || pd.generalDeclarations;
                    const showBaslikTag =
                      Boolean(q.baslik?.trim()) &&
                      q.baslik !== groupLabel &&
                      q.baslik !== 'Genel Beyanlar';
                    if (tasksViewMode && !stickySectionHeaders) {
                      return (
                        <div
                          id={`task-form-question-${q.id}`}
                          key={q.id}
                          className="px-4 py-3"
                        >
                          <div className="tasks-question-card space-y-4 border border-slate-200 bg-white p-5 shadow-sm">
                            {showBaslikTag ? (
                              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                {q.baslik}
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-bold tabular-nums tracking-wide text-slate-800">
                                {globalIdx + 1}: {q.kod}
                              </span>
                              <div className="flex shrink-0 items-center gap-2">
                              {savingId === q.id ? (
                                <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                                  <Loader2 size={12} className="animate-spin" />
                                  {t.tasks.saving}
                                </div>
                              ) : hasAnswer ? (
                                <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                                  <CheckCircle2 size={12} />
                                  {t.tasks.saved}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                  <Clock size={12} />
                                  {t.tasks.pending}
                                </div>
                              )}
                              </div>
                            </div>

                            <div className="min-w-0 max-w-none">
                              <HelpMarkdown className="tasks-question-markdown">
                                {q.soru || ''}
                              </HelpMarkdown>
                            </div>

                            {responseAnswerFormat(q) === 'textarea' ? (
                              <textarea
                                rows={5}
                                value={answers[q.id]?.text || ''}
                                onChange={(e) => onUpdateAnswer(q.id, e.target.value, 'text')}
                                placeholder={
                                  questionReadonly
                                    ? t.tasks.noResponseProvided
                                    : t.tasks.writeResponsePlaceholder
                                }
                                disabled={questionReadonly}
                                className="min-h-[120px] w-full rounded-none border border-slate-200 bg-white p-4 text-sm shadow-sm outline-none transition-all placeholder:text-slate-300 focus:ring-1 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                              />
                            ) : (
                              <input
                                type="number"
                                step={responseAnswerFormat(q) === 'integer' ? 1 : 'any'}
                                value={answers[q.id]?.text ?? ''}
                                onChange={(e) => onUpdateAnswer(q.id, e.target.value, 'text')}
                                disabled={questionReadonly}
                                className="w-full max-w-md rounded-none border border-slate-200 bg-white p-4 text-sm shadow-sm outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50"
                              />
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                                {renderEvidenceAttach(q.id, questionReadonly)}
                              </div>
                              {onSaveTextAnswer &&
                              Boolean(answers[q.id]?.text?.trim()) &&
                              !questionReadonly ? (
                                <button
                                  type="button"
                                  onClick={() => void onSaveTextAnswer(q.id)}
                                  disabled={savingId === q.id}
                                  className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {savingId === q.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Save size={14} strokeWidth={2} />
                                  )}
                                  {savingId === q.id
                                    ? t.common.saving
                                    : savedQuestionId === q.id
                                      ? t.common.saved
                                      : t.common.save}
                                </button>
                              ) : null}
                            </div>

                            {renderTasksAnswerNotes(q.id, questionReadonly)}

                            <div className="border-t border-dashed border-slate-200 pt-4 text-center">
                              <p className="text-sm font-medium text-slate-500">
                                {workflowStatusLabel(workflowState, pd)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        id={`task-form-question-${q.id}`}
                        key={q.id}
                        className={cn(
                          'transition-colors hover:bg-slate-50/40',
                          tasksViewMode
                            ? cn(
                                'bg-white pt-0 pb-0',
                                stickySectionHeaders && 'scroll-mt-[8.125rem]',
                              )
                            : cn(
                                'space-y-5 p-6',
                                stickySectionHeaders && 'scroll-mt-[8.125rem]',
                                !stickySectionHeaders && 'scroll-mt-16',
                              ),
                        )}
                        style={
                          stickySectionHeaders
                            ? {
                                scrollMarginTop: `${questionHeaderStickyTop + 70}px`,
                              }
                            : undefined
                        }
                      >
                        <header
                          title={
                            tasksViewMode
                              ? questionCollapsed
                                ? pd.formsExpandQuestion
                                : pd.formsCollapseQuestion
                              : undefined
                          }
                          onDoubleClick={(e) => {
                            if (!tasksViewMode) return;
                            if ((e.target as HTMLElement).closest('button')) return;
                            setExpandedSections((prev) => ({
                              ...prev,
                              [`question-collapsed-${q.id}`]:
                                !prev[`question-collapsed-${q.id}`],
                            }));
                          }}
                          className={cn(
                            stickySectionHeaders &&
                              (tasksViewMode
                                ? 'sticky z-[19] flex h-[70px] min-h-[70px] shrink-0 cursor-default items-center border-b border-slate-200 bg-white pl-5 pr-4'
                                : cn(
                                    'sticky z-[19] -mx-6 border-b border-slate-100 bg-white/95 px-6 py-2 shadow-sm backdrop-blur-sm',
                                    compactHorizontalPadding && '-mx-4 px-4',
                                  )),
                          )}
                          style={
                            stickySectionHeaders
                              ? { top: questionHeaderStickyTop }
                              : undefined
                          }
                        >
                          <div className="flex w-full min-w-0 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 shrink-0 text-[13px] font-bold tabular-nums tracking-wide text-slate-800">
                                {globalIdx + 1}: {q.kod}
                              </p>
                            </div>
                            <div className="ml-auto flex shrink-0 items-center gap-1.5">
                              {tasksViewMode ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSections((prev) => ({
                                      ...prev,
                                      [`question-collapsed-${q.id}`]:
                                        !prev[`question-collapsed-${q.id}`],
                                    }))
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50"
                                  aria-expanded={!questionCollapsed}
                                  aria-label={
                                    questionCollapsed
                                      ? pd.formsExpandQuestion
                                      : pd.formsCollapseQuestion
                                  }
                                  title={
                                    questionCollapsed
                                      ? pd.formsExpandQuestion
                                      : pd.formsCollapseQuestion
                                  }
                                >
                                  <ChevronDown
                                    size={14}
                                    strokeWidth={2}
                                    className={cn(
                                      'transition-transform duration-200',
                                      questionCollapsed && '-rotate-90',
                                    )}
                                  />
                                </button>
                              ) : null}
                              {tasksViewMode && stickySectionHeaders ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={!canNavigatePrev}
                                    onClick={() => {
                                      if (prevId) scrollToQuestion(prevId);
                                    }}
                                    className={questionNavBtnClass}
                                    aria-label="Previous question"
                                  >
                                    <ArrowUp size={14} strokeWidth={2} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canNavigateNext}
                                    onClick={() => {
                                      if (nextId) scrollToQuestion(nextId);
                                    }}
                                    className={questionNavBtnClass}
                                    aria-label="Next question"
                                  >
                                    <ArrowDown size={14} strokeWidth={2} />
                                  </button>
                                </>
                              ) : null}
                              {!tasksViewMode && stickySectionHeaders ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={!canNavigatePrev}
                                    onClick={() => {
                                      if (prevId) scrollToQuestion(prevId);
                                    }}
                                    className={questionNavBtnClass}
                                    aria-label="Previous question"
                                  >
                                    <ChevronUp size={14} strokeWidth={2} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canNavigateNext}
                                    onClick={() => {
                                      if (nextId) scrollToQuestion(nextId);
                                    }}
                                    className={questionNavBtnClass}
                                    aria-label="Next question"
                                  >
                                    <ChevronDown size={14} strokeWidth={2} />
                                  </button>
                                </>
                              ) : null}
                              {!planPreviewMode && !tasksViewMode ? (
                                <QuestionGuidanceLightbulbButton
                                  count={questionGuidanceCount}
                                  active={guidanceModalQuestion?.id === q.id}
                                  onClick={() => setGuidanceModalQuestion(q)}
                                  title={pd.formsQuestionShowGuidance}
                                  icon="info"
                                  showWhenEmpty
                                  className={cn(
                                    'border-slate-200/80 text-slate-600',
                                    guidanceModalQuestion?.id === q.id &&
                                      cn(
                                        currentPageColor.bg,
                                        currentPageColor.border,
                                        currentPageColor.text,
                                      ),
                                  )}
                                />
                              ) : null}
                            </div>
                          </div>
                        </header>

                        {!tasksViewMode || !expandedSections[`question-collapsed-${q.id}`] ? (
                        <div
                          className={cn(
                            tasksViewMode
                              ? 'space-y-5 pb-6 pl-5 pr-4 pt-5'
                              : 'contents',
                          )}
                        >
                        {!tasksViewMode ? (
                          <hr className="border-slate-200" aria-hidden />
                        ) : null}

                        <div className="min-w-0 max-w-none">
                          <HelpMarkdown
                            className={tasksViewMode ? 'tasks-question-markdown' : undefined}
                          >
                            {q.soru || ''}
                          </HelpMarkdown>
                        </div>

                        {!tasksViewMode && !hasAnswer && !questionReadonly ? (
                          <div className="flex min-h-[48px] w-full items-center justify-center rounded-none border border-dashed border-slate-200 bg-slate-50 px-5 py-3 text-sm italic text-slate-400">
                            {pd.waitingResponse}
                          </div>
                        ) : null}

                        {responseAnswerFormat(q) === 'textarea' ? (
                          <>
                            {tasksViewMode &&
                            projectId &&
                            !questionReadonly &&
                            !planPreviewMode ? (
                              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                <div className="flex flex-wrap items-start gap-3">
                                  <button
                                    type="button"
                                    disabled={
                                      autofillingLocalQuestionId === q.id ||
                                      autofillingGeneralQuestionId === q.id ||
                                      savingId === q.id
                                    }
                                    onClick={() => void handleLocalAiAutofillAnswer(q)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-50"
                                  >
                                    {autofillingLocalQuestionId === q.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Sparkles size={16} />
                                    )}
                                    {autofillingLocalQuestionId === q.id
                                      ? t.tasks.aiLocalAutofillLoading
                                      : t.tasks.aiLocalAutofillButton}
                                  </button>
                                  <div className="flex flex-col items-start gap-1">
                                    <button
                                      type="button"
                                      disabled={
                                        autofillingLocalQuestionId === q.id ||
                                        autofillingGeneralQuestionId === q.id ||
                                        savingId === q.id ||
                                        !taskLlmTextConfigured
                                      }
                                      onClick={() => void handleGeneralAiAutofillAnswer(q)}
                                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-bold text-violet-800 transition-colors hover:bg-violet-50 disabled:opacity-50"
                                    >
                                      {autofillingGeneralQuestionId === q.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                      ) : (
                                        <Sparkles size={16} />
                                      )}
                                      {autofillingGeneralQuestionId === q.id
                                        ? t.tasks.aiGeneralAutofillLoading
                                        : t.tasks.aiGeneralAutofillButton}
                                    </button>
                                    <span className="text-[10px] font-medium text-slate-500 pl-1">
                                      {generalAiProviderLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            <textarea
                              rows={5}
                              value={answers[q.id]?.text || ''}
                              onChange={(e) => onUpdateAnswer(q.id, e.target.value, 'text')}
                              placeholder={
                                questionReadonly
                                  ? t.tasks.noResponseProvided
                                  : t.tasks.writeResponsePlaceholder
                              }
                              disabled={questionReadonly}
                              className="min-h-[120px] w-full rounded-none border border-slate-200 bg-white p-4 text-sm shadow-sm outline-none transition-all placeholder:text-slate-300 focus:ring-1 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                            />
                          </>
                        ) : (
                          <input
                            type="number"
                            step={responseAnswerFormat(q) === 'integer' ? 1 : 'any'}
                            value={answers[q.id]?.text ?? ''}
                            onChange={(e) => onUpdateAnswer(q.id, e.target.value, 'text')}
                            disabled={questionReadonly}
                            className="w-full max-w-md rounded-none border border-slate-200 bg-white p-4 text-sm shadow-sm outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50"
                          />
                        )}

                        {!tasksViewMode && savingId === q.id ? (
                          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                            <Loader2 size={10} className="animate-spin" />
                            {t.tasks.saving}
                          </p>
                        ) : null}

                        {!planPreviewMode ? (
                        <>
                        <div
                          className={cn(
                            'flex flex-wrap items-center gap-3',
                            tasksViewMode && 'justify-between',
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            {!tasksViewMode ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveCommentId(activeCommentId === q.id ? null : q.id)
                              }
                              className={cn(
                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest',
                                answers[q.id]?.comment || activeCommentId === q.id
                                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-500',
                              )}
                            >
                              <MessageSquare size={14} />
                              {answers[q.id]?.comment
                                ? t.tasks.editComment
                                : t.tasks.addComment}
                            </button>
                            ) : null}
                            {!tasksViewMode ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveEvidenceId(activeEvidenceId === q.id ? null : q.id)
                              }
                              className={cn(
                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest',
                                answers[q.id]?.evidenceName || activeEvidenceId === q.id
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 text-slate-500',
                              )}
                            >
                              <Paperclip size={14} />
                              {answers[q.id]?.evidenceName
                                ? t.tasks.manageEvidence
                                : t.tasks.attachFile}
                            </button>
                            ) : null}
                          </div>
                          {tasksViewMode &&
                          onSaveTextAnswer &&
                          Boolean(answers[q.id]?.text?.trim()) &&
                          !questionReadonly ? (
                            <button
                              type="button"
                              onClick={() => void onSaveTextAnswer(q.id)}
                              disabled={savingId === q.id}
                              className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingId === q.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Save size={14} strokeWidth={2} />
                              )}
                              {savingId === q.id
                                ? t.common.saving
                                : savedQuestionId === q.id
                                  ? t.common.saved
                                  : t.common.save}
                            </button>
                          ) : null}
                        </div>
                        {tasksViewMode ? renderEvidenceAttach(q.id, questionReadonly) : null}
                        </>

                        ) : null}

                        {!planPreviewMode && !tasksViewMode && activeCommentId === q.id ? (
                          <textarea
                            className="min-h-[80px] w-full rounded-none border border-slate-200 bg-slate-50 p-4 text-xs outline-none focus:ring-1 focus:ring-slate-300"
                            placeholder={t.tasks.notesForConsultant}
                            value={answers[q.id]?.comment || ''}
                            disabled={questionReadonly}
                            onChange={(e) => onUpdateAnswer(q.id, e.target.value, 'comment')}
                          />
                        ) : null}

                        {renderTasksAnswerNotes(q.id, questionReadonly)}

                        {!planPreviewMode && !tasksViewMode && activeEvidenceId === q.id ? (
                          <div className="border border-slate-200 bg-slate-50 p-4">
                            {answers[q.id]?.evidenceName ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-800">
                                  {answers[q.id]?.evidenceName}
                                </span>
                                {!questionReadonly ? (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateAnswer(q.id, '', 'evidenceName')}
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <label className="relative block cursor-pointer">
                                <input
                                  type="file"
                                  className="absolute inset-0 opacity-0"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onUpdateAnswer(q.id, file.name, 'evidenceName');
                                  }}
                                />
                                <div className="flex flex-col items-center gap-2 border border-dashed border-slate-300 bg-white py-6">
                                  <FileUp size={20} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-600">
                                    {t.tasks.uploadEvidence}
                                  </span>
                                </div>
                              </label>
                            )}
                          </div>
                        ) : null}

                        {!tasksViewMode ? (
                          <div className="pt-1">
                            <select
                              value={workflowState}
                              disabled
                              className={cn(
                                'w-full max-w-md rounded-none border border-slate-200 bg-white py-2 pl-3 pr-8 text-[9px] font-bold uppercase tracking-widest text-slate-700',
                                workflowState === 'sent_back' &&
                                  'border-amber-200 bg-amber-50/80 text-amber-900',
                                workflowState === 'approved' &&
                                  'border-emerald-200 bg-emerald-50/90 text-emerald-900',
                              )}
                            >
                              <option value={workflowState}>
                                {workflowStatusLabel(workflowState, pd)}
                              </option>
                            </select>
                          </div>
                        ) : null}
                        </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {!hideSubmitBar && !isActuallyReadonly ? (
          <div className="flex justify-end border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onSubmitAssignment}
              disabled={isSubmitting}
              className="minimal-button-primary inline-flex items-center gap-2 px-8"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {t.tasks.submitToConsultant}
            </button>
          </div>
        ) : null}
      </section>

      <QuestionGuidanceMaterialsModal
        isOpen={guidanceModalQuestion !== null}
        onClose={() => setGuidanceModalQuestion(null)}
        questionTitle={
          guidanceModalQuestion?.baslik?.trim() ||
          (guidanceModalQuestion?.kod ? `#${guidanceModalQuestion.kod}` : null)
        }
        questionText={guidanceModalQuestion?.soru}
        aciklama={guidanceModalQuestion?.aciklama}
        ornekYanit={guidanceModalQuestion?.ornekYanit}
        videoUrl={guidanceModalQuestion?.aciklamaVideoUrl}
        labels={guidanceMaterialsLabels}
      />
    </div>
  );
}
