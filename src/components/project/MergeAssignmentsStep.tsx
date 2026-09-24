/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { AlertCircle, Calendar, UserCheck, Zap } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { HelpMarkdown } from '../ui/HelpMarkdown';
import type { Assignment, Contact, PlatformUser, Question } from '../../types';
import {
  normalizeAssignmentUrgency,
  type AssignmentUrgencyLevel,
} from '../../../lib/assignmentUrgency';

const MERGE_BASLIK_EMPTY = '__merge_baslik_empty__';

export type MergeApproverOption = {
  key: string;
  label: string;
};

export type MergeAssignmentsStepProps = {
  assignments: Assignment[];
  selectedAssignmentIds: string[];
  onToggleAssignment: (id: string) => void;
  beginDate: string;
  deadline: string;
  urgency: AssignmentUrgencyLevel;
  approverKey: string;
  approverOptions: MergeApproverOption[];
  onBeginDateChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onUrgencyChange: (value: AssignmentUrgencyLevel) => void;
  onApproverChange: (value: string) => void;
  questions: Question[];
  recipientId?: string;
  contacts: Contact[];
  platformUsers: PlatformUser[];
  disabled?: boolean;
};

export function MergeAssignmentsStep({
  assignments,
  selectedAssignmentIds,
  onToggleAssignment,
  beginDate,
  deadline,
  urgency,
  approverKey,
  approverOptions,
  onBeginDateChange,
  onDeadlineChange,
  onUrgencyChange,
  onApproverChange,
  questions,
  recipientId,
  contacts,
  platformUsers,
  disabled = false,
}: MergeAssignmentsStepProps) {
  const { t } = useTranslation();
  const pd = t.projectDetail;

  const getRecipientInfo = (assignment: Assignment) => {
    const recipient =
      platformUsers.find((u) => u.id === assignment.recipientId) ||
      contacts.find((c) => c.id === assignment.recipientId);
    return recipient || { name: '—', email: '', id: assignment.recipientId };
  };

  const selectedSet = new Set(selectedAssignmentIds);
  const selectedAssignments = assignments.filter((a) => selectedSet.has(a.id));

  const questionsGrouped = useMemo(() => {
    const keyFor = (q: Question) => (q.baslik || '').trim() || MERGE_BASLIK_EMPTY;
    const order: string[] = [];
    for (const q of questions) {
      const k = keyFor(q);
      if (!order.includes(k)) order.push(k);
    }
    return order.map((key) => ({
      key,
      label:
        key === MERGE_BASLIK_EMPTY ? t.templates.fieldLabelUntagged : key,
      items: questions.filter((q) => keyFor(q) === key),
    }));
  }, [questions, t.templates.fieldLabelUntagged]);

  const recipient =
    recipientId != null
      ? platformUsers.find((u) => u.id === recipientId) ||
        contacts.find((c) => c.id === recipientId)
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-x-auto overscroll-x-contain lg:flex-row lg:items-stretch lg:gap-10">
      {/* Left: dates (+ multi-recipient assignment pickers) */}
      <div className="flex w-full max-w-full shrink-0 flex-col gap-6 bg-white lg:sticky lg:top-0 lg:left-0 lg:z-20 lg:max-h-[min(76vh,840px)] lg:w-[22rem] lg:min-w-[min(22rem,100%)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-slate-100 lg:pr-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Calendar size={12} className="shrink-0" />
              <span className="truncate">{pd.beginDate}</span>
            </label>
            <input
              type="date"
              value={beginDate}
              onChange={(e) => onBeginDateChange(e.target.value)}
              disabled={disabled}
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Calendar size={12} className="shrink-0" />
              <span className="truncate">{pd.deadline}</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => onDeadlineChange(e.target.value)}
              disabled={disabled}
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Zap size={12} className="shrink-0" />
            <span className="truncate">{pd.urgencyLabel}</span>
          </label>
          <select
            value={urgency}
            onChange={(e) => onUrgencyChange(normalizeAssignmentUrgency(e.target.value))}
            disabled={disabled}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
          >
            <option value="normal">{pd.urgencyNormal}</option>
            <option value="urgent">{pd.urgencyUrgent}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <UserCheck size={12} className="shrink-0" />
            <span className="truncate">{pd.approverLabel}</span>
          </label>
          <select
            value={approverKey}
            onChange={(e) => onApproverChange(e.target.value)}
            disabled={disabled}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-slate-900"
          >
            <option value="">{pd.approverSelectPlaceholder}</option>
            {approverOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {beginDate && deadline && beginDate > deadline ? (
          <p className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-red-500">
            <AlertCircle size={12} /> {pd.beginDateBeforeDeadline}
          </p>
        ) : null}

        {recipient ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-blue-900">
              {pd.mergeOpenAssignmentsSummary}
            </div>
            <div className="mt-1 text-sm font-semibold text-blue-900">{recipient.name}</div>
            <div className="mt-0.5 text-xs text-blue-700">
              {selectedAssignments.length} {t.tasks.summaryAssignments} • {questions.length}{' '}
              {t.tasks.summaryQuestionsInFilter}
            </div>
          </div>
        ) : null}

        {!recipientId ? (
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {pd.mergeSelectAssignments
                .replace('{selected}', String(selectedAssignmentIds.length))
                .replace('{total}', String(assignments.length))}
            </label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {assignments.map((assignment) => {
                const info = getRecipientInfo(assignment);
                const questionCount = assignment.questionIds?.length || 0;
                const isChecked = selectedSet.has(assignment.id);
                return (
                  <label
                    key={assignment.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-blue-300 hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleAssignment(assignment.id)}
                      disabled={disabled}
                      className="h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900">{info.name}</div>
                      <div className="text-[10px] text-slate-600">
                        {questionCount} {t.tasks.summaryQuestionsInFilter}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Right: included questions (read-only, no checkboxes) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4 overflow-hidden">
        <label className="border-b border-slate-100 pb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {pd.mergeIncludedQuestions.replace('{count}', String(questions.length))}
        </label>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 lg:min-h-[min(52vh,560px)]">
          {questionsGrouped.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              {t.projectDetail.assignQuestionsNoMatch}
            </p>
          ) : (
            questionsGrouped.map((group) => (
              <div
                key={group.key}
                className="divide-y divide-slate-100 overflow-hidden border border-slate-200 bg-white shadow-sm"
              >
                <div className="bg-slate-50 px-4 py-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 sm:text-[13px]">
                    {group.label}
                  </h4>
                </div>
                {group.items.map((q) => {
                  const qIdx = questions.findIndex(fq => fq.id === q.id) + 1;
                  return (
                  <div key={q.id} className="space-y-1.5 bg-white p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500/70">
                      {qIdx}: {q.kod}
                    </span>
                    <HelpMarkdown
                      emptyFallback={<p className="text-sm italic text-slate-400">—</p>}
                    >
                      {q.soru || ''}
                    </HelpMarkdown>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
