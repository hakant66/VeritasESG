/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CheckCircle2, HelpCircle, Loader2, XCircle } from 'lucide-react';
import type { Answer, Question } from '../../types';
import { FormsAnswerReviewComments } from './FormsAnswerReviewComments';
import {
  submitAuditReviewDecision,
  type AuditReviewDecision,
} from '../../lib/auditReviewApi';

export type AuditAnswerReviewLabels = {
  notesTitle: string;
  notesPlaceholder: string;
  notesSubmit: string;
  notesSaving: string;
  accept: string;
  reject: string;
  explanation: string;
  submitting: string;
  acceptLog: string;
  rejectLog: string;
  explanationLog: string;
  failed: string;
};

type AuditAnswerReviewPanelProps = {
  projectId: string;
  question: Question;
  answer: Answer;
  dateLocale: string;
  labels: AuditAnswerReviewLabels;
  savingNote?: boolean;
  onAddNote: (answerId: string, text: string) => void | Promise<void>;
  onReviewComplete?: () => void;
  authorName: string;
};

export function AuditAnswerReviewPanel({
  projectId,
  question,
  answer,
  dateLocale,
  labels,
  savingNote = false,
  onAddNote,
  onReviewComplete,
  authorName,
}: AuditAnswerReviewPanelProps) {
  const [submitting, setSubmitting] = useState<AuditReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questionLabel = [question.kod, question.soru].filter(Boolean).join(' — ');

  const buildLogText = (decision: AuditReviewDecision) => {
    const template =
      decision === 'accept'
        ? labels.acceptLog
        : decision === 'reject'
          ? labels.rejectLog
          : labels.explanationLog;
    return template.replace('{user}', authorName);
  };

  const handleDecision = async (decision: AuditReviewDecision) => {
    setSubmitting(decision);
    setError(null);
    try {
      const result = await submitAuditReviewDecision(projectId, answer.id, {
        decision,
        logText: buildLogText(decision),
        questionLabel,
      });
      if (!result.success) {
        throw new Error(result.error || labels.failed);
      }
      onReviewComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : labels.failed);
    } finally {
      setSubmitting(null);
    }
  };

  const reviewCommentLabels = {
    sectionTitle: labels.notesTitle,
    placeholder: labels.notesPlaceholder,
    submit: labels.notesSubmit,
    saving: labels.notesSaving,
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <FormsAnswerReviewComments
        answer={answer}
        canComment
        dateLocale={dateLocale}
        labels={reviewCommentLabels}
        saving={savingNote}
        onAddComment={onAddNote}
      />
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => void handleDecision('accept')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-900 transition-colors hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60"
        >
          {submitting === 'accept' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {submitting === 'accept' ? labels.submitting : labels.accept}
        </button>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => void handleDecision('reject')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-900 transition-colors hover:border-red-300 hover:bg-red-100 disabled:opacity-60"
        >
          {submitting === 'reject' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <XCircle size={14} />
          )}
          {submitting === 'reject' ? labels.submitting : labels.reject}
        </button>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => void handleDecision('explanation')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:opacity-60"
        >
          {submitting === 'explanation' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <HelpCircle size={14} />
          )}
          {submitting === 'explanation' ? labels.submitting : labels.explanation}
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
