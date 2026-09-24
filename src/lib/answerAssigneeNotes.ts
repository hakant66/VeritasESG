import type { AnswerAssigneeNote } from '../types';

export function normalizeAnswerAssigneeNotes(answer: {
  answerNotes?: AnswerAssigneeNote[];
  comment?: string;
  updatedAt?: number;
}): AnswerAssigneeNote[] {
  const fromArray = answer.answerNotes?.filter((n) => n?.text?.trim());
  if (fromArray?.length) return fromArray;
  const legacy = answer.comment?.trim();
  if (legacy) {
    return [
      {
        id: 'legacy-comment',
        text: legacy,
        createdAt: answer.updatedAt ?? Date.now(),
      },
    ];
  }
  return [];
}

export function insertAssigneeNoteAfterIndex(
  notes: AnswerAssigneeNote[],
  insertAfterIndex: number,
  text: string,
): AnswerAssigneeNote[] {
  const trimmed = text.trim();
  if (!trimmed) return notes;
  const note: AnswerAssigneeNote = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    text: trimmed,
    createdAt: Date.now(),
  };
  const next = [...notes];
  next.splice(insertAfterIndex + 1, 0, note);
  return next;
}
