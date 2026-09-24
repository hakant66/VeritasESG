/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Assignment, Answer, AssigneeNoticeItem, Question } from '../../types';
import { normalizeAnswerAssigneeNotes } from '../../lib/answerAssigneeNotes';

export function resolveAssigneeNoticeItems(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
): AssigneeNoticeItem[] {
  if (assignment.assigneeNoticeItems?.length) {
    return assignment.assigneeNoticeItems;
  }

  const items: AssigneeNoticeItem[] = [];
  for (const ans of answers) {
    const matchesAssignment =
      ans.assignmentId === assignment.id ||
      (ans.contactId && ans.contactId === assignment.recipientId);
    if (!matchesAssignment) continue;

    const notes = normalizeAnswerAssigneeNotes(ans);
    const noteText = notes.map((n) => n.text).join(' · ') || ans.comment?.trim() || '';
    const hasEvidence = Boolean(ans.evidenceName?.trim());
    if (!noteText && !hasEvidence) continue;

    const q = questions.find((item) => item.id === ans.questionId);
    items.push({
      questionId: ans.questionId,
      questionKod: q?.kod?.trim() || undefined,
      questionText: q?.soru?.trim().slice(0, 160) || undefined,
      noteText: noteText || undefined,
      hasEvidence,
    });
  }
  return items;
}

export type RecipientAssigneeNoticeBannerLabels = {
  title: string;
  fromUser: string;
  sentAt: string;
  hasNotes: string;
  hasEvidence: string;
  clickReassign: string;
};

type RecipientAssigneeNoticeBannerProps = {
  recipientAssignments: Assignment[];
  questions: Question[];
  answers: Answer[];
  labels: RecipientAssigneeNoticeBannerLabels;
  dateLocale: string;
  onReassignQuestion: (assignment: Assignment, question: Question) => void;
};

function truncateText(text: string, max = 100): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function RecipientAssigneeNoticeBanner({
  recipientAssignments,
  questions,
  answers,
  labels,
  dateLocale,
  onReassignQuestion,
}: RecipientAssigneeNoticeBannerProps) {
  const notices = recipientAssignments
    .filter((a) => a.assigneeNoticeSentAt)
    .sort((a, b) => (b.assigneeNoticeSentAt || 0) - (a.assigneeNoticeSentAt || 0));

  if (notices.length === 0) return null;

  return (
    <div className="border-t border-amber-200 bg-amber-50 px-3 py-2.5 space-y-3">
      {notices.map((assignment) => {
        const name = assignment.assigneeNoticeSentByName?.trim() || 'Kullanıcı';
        const sentAt = assignment.assigneeNoticeSentAt
          ? new Date(assignment.assigneeNoticeSentAt).toLocaleString(dateLocale)
          : '';
        const items = resolveAssigneeNoticeItems(assignment, questions, answers);
        const summary = assignment.assigneeNoticeSummary?.trim();

        return (
          <div key={assignment.id} className="text-xs leading-relaxed text-amber-950">
            <p className="font-bold uppercase tracking-wide text-amber-800">{labels.title}</p>
            <p className="mt-0.5 font-medium">
              {labels.fromUser.replace('{name}', name)}
              {sentAt ? ` · ${labels.sentAt.replace('{date}', sentAt)}` : ''}
            </p>
            {items.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {items.map((item) => {
                  const question = questions.find((q) => q.id === item.questionId);
                  if (!question) return null;
                  const kod = item.questionKod || question.kod || '?';
                  const preview =
                    item.questionText ||
                    question.soru?.trim() ||
                    question.baslik?.trim() ||
                    '';
                  return (
                    <li key={`${assignment.id}-${item.questionId}`}>
                      <button
                        type="button"
                        onClick={() => onReassignQuestion(assignment, question)}
                        className="group w-full rounded-md border border-amber-200/90 bg-white/70 px-2.5 py-2 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/80"
                      >
                        <p className="font-semibold text-amber-950">
                          <span className="text-amber-900">{kod}</span>
                          {preview ? (
                            <span className="font-normal text-amber-950/85">
                              {' '}
                              — {truncateText(preview, 120)}
                            </span>
                          ) : null}
                        </p>
                        {item.noteText ? (
                          <p className="mt-1 text-amber-900/90">{item.noteText}</p>
                        ) : null}
                        {item.hasEvidence ? (
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            {labels.hasEvidence}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 group-hover:text-violet-800">
                          {labels.clickReassign}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : summary ? (
              <p className="mt-1 text-amber-900/90">{summary}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
