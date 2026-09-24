/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { Answer } from '../../types';

export type FormsAnswerReviewCommentsLabels = {
  sectionTitle: string;
  placeholder: string;
  submit: string;
  saving: string;
};

export type FormsAnswerReviewCommentsProps = {
  answer: Answer;
  canComment: boolean;
  dateLocale: string;
  labels: FormsAnswerReviewCommentsLabels;
  saving?: boolean;
  onAddComment: (answerId: string, text: string) => void | Promise<void>;
};

export function FormsAnswerReviewComments({
  answer,
  canComment,
  dateLocale,
  labels,
  saving = false,
  onAddComment,
}: FormsAnswerReviewCommentsProps) {
  const [draft, setDraft] = useState('');
  const comments = [...(answer.reviewComments || [])].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text || saving) return;
    void Promise.resolve(onAddComment(answer.id, text)).then(() => setDraft(''));
  };

  if (comments.length === 0 && !canComment) return null;

  return (
    <div className="space-y-3">
      {comments.length > 0 ? (
        <div className="rounded-lg border border-violet-100/90 bg-violet-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-violet-700">
            <MessageSquare size={12} aria-hidden />
            {labels.sectionTitle}
          </p>
          <ul className="space-y-3">
            {comments.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-violet-100/80 bg-white/90 px-3 py-2.5"
              >
                <p className="text-xs font-medium leading-relaxed text-slate-700">{entry.text}</p>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-600">{entry.authorName}</span>
                  {' · '}
                  {new Date(entry.createdAt).toLocaleString(dateLocale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {canComment ? (
        <div className="rounded-lg border border-violet-100/90 bg-white p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={labels.placeholder}
            rows={3}
            disabled={saving}
            className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200 disabled:opacity-60"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={saving || !draft.trim()}
              onClick={handleSubmit}
              className="inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-violet-900 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? labels.saving : labels.submit}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
