/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import type { Assignment, Answer } from '../../../types';
import { normalizeAnswerAssigneeNotes } from '../../../lib/answerAssigneeNotes';
import { useTranslation } from '../../../hooks/useTranslation';
import { notifyProjectManagerForAssignment } from '../api/assignmentNotify';

type TasksNotifyProjectManagerBarProps = {
  assignment: Assignment;
  projectId: string;
  answers: Record<string, { notes?: unknown[]; comment?: string; evidenceName?: string }>;
  answerRecords?: Answer[];
  disabled?: boolean;
  onNotified?: () => void;
};

function assignmentHasAssigneeContent(
  assignment: Assignment,
  answers: Record<string, { notes?: unknown[]; comment?: string; evidenceName?: string }>,
  answerRecords: Answer[],
): boolean {
  for (const record of answerRecords) {
    if (record.assignmentId !== assignment.id) continue;
    const notes = normalizeAnswerAssigneeNotes(record);
    if (notes.length > 0) return true;
    if (String(record.evidenceName || '').trim()) return true;
    if (String(record.comment || '').trim()) return true;
  }
  for (const entry of Object.values(answers)) {
    const notes = normalizeAnswerAssigneeNotes(entry);
    if (notes.length > 0) return true;
    if (String(entry.evidenceName || '').trim()) return true;
    if (String(entry.comment || '').trim()) return true;
  }
  return false;
}

export function TasksNotifyProjectManagerBar({
  assignment,
  projectId,
  answers,
  answerRecords = [],
  disabled = false,
  onNotified,
}: TasksNotifyProjectManagerBarProps) {
  const { t } = useTranslation();
  const labels = t.tasks.notifyProjectManager;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasContent = useMemo(
    () => assignmentHasAssigneeContent(assignment, answers, answerRecords),
    [assignment, answers, answerRecords],
  );

  if (disabled || !hasContent) return null;

  const handleNotify = async () => {
    setSending(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await notifyProjectManagerForAssignment(projectId, assignment.id);
      if (!result.success) {
        throw new Error(result.error || labels.failed);
      }
      setSuccess(true);
      onNotified?.();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : labels.failed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-4 mb-3 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-violet-900 leading-relaxed">{labels.hint}</p>
        <button
          type="button"
          disabled={sending}
          onClick={() => void handleNotify()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-violet-800 disabled:opacity-60"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : success ? (
            <CheckCircle2 size={14} />
          ) : (
            <Send size={14} />
          )}
          {sending ? labels.sending : success ? labels.sent : labels.button}
        </button>
      </div>
      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
