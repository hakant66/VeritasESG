import { useState } from 'react';
import { Loader2, MessageSquare, Save } from 'lucide-react';
import type { AnswerAssigneeNote } from '../../../types';
import { cn } from '../../../lib/utils';

export type TasksAnswerNotesSectionLabels = {
  addComment: string;
  notesForConsultant: string;
  saveNote: string;
  saving: string;
};

type TasksAnswerNotesSectionProps = {
  notes: AnswerAssigneeNote[];
  readonly?: boolean;
  saving?: boolean;
  onAddNote: (text: string, insertAfterIndex: number) => void | Promise<void>;
  labels: TasksAnswerNotesSectionLabels;
};

export function TasksAnswerNotesSection({
  notes,
  readonly = false,
  saving = false,
  onAddNote,
  labels,
}: TasksAnswerNotesSectionProps) {
  const [composerAfterIndex, setComposerAfterIndex] = useState<number | null>(null);
  const [draftText, setDraftText] = useState('');

  const openComposer = (insertAfterIndex: number) => {
    setComposerAfterIndex(insertAfterIndex);
    setDraftText('');
  };

  const closeComposer = () => {
    setComposerAfterIndex(null);
    setDraftText('');
  };

  const handleSave = async () => {
    const trimmed = draftText.trim();
    if (!trimmed || composerAfterIndex === null) return;
    try {
      await onAddNote(trimmed, composerAfterIndex);
      closeComposer();
    } catch {
      // Parent shows error; keep composer open for retry.
    }
  };

  const addButton = (insertAfterIndex: number) => (
    <button
      type="button"
      disabled={readonly || saving}
      onClick={() => openComposer(insertAfterIndex)}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest',
        'border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <MessageSquare size={14} />
      {labels.addComment}
    </button>
  );

  const composer = (insertAfterIndex: number) => (
    <div className="space-y-2">
      <textarea
        className="min-h-[80px] w-full rounded-none border border-slate-200 bg-slate-50 p-4 text-xs outline-none focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
        placeholder={labels.notesForConsultant}
        value={draftText}
        disabled={readonly || saving}
        onChange={(e) => setDraftText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={readonly || saving || !draftText.trim()}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} strokeWidth={2} />
          )}
          {saving ? labels.saving : labels.saveNote}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={closeComposer}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50"
        >
          ×
        </button>
      </div>
    </div>
  );

  if (notes.length === 0) {
    return (
      <div className="space-y-2">
        {composerAfterIndex === -1 ? composer(-1) : !readonly ? addButton(-1) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note, idx) => (
        <div key={note.id} className="space-y-2">
          <div className="whitespace-pre-wrap border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
            {note.text}
          </div>
          {composerAfterIndex === idx
            ? composer(idx)
            : !readonly
              ? addButton(idx)
              : null}
        </div>
      ))}
    </div>
  );
}
