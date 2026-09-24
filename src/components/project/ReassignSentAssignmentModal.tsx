/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, User } from 'lucide-react';
import Modal from '../ui/Modal';
import { ProjectUserIdentity } from './ProjectUserIdentity';
import type { Assignment, PlatformUser } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import {
  resendAssignmentEmail,
  updateProjectAssignment,
} from '../../lib/assignmentManageApi';

export type ReassignSentAssignmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  projectId: string;
  platformUsers: PlatformUser[];
  currentRecipientLabel: string;
  getRoleLabel: (user: PlatformUser) => string;
  getRoleSuffix?: (user: PlatformUser) => string | undefined;
  roleLabelPrefix: string;
  onSaved: () => void;
  questionLabel?: string;
  questionId?: string;
};

export function ReassignSentAssignmentModal({
  isOpen,
  onClose,
  assignment,
  projectId,
  platformUsers,
  currentRecipientLabel,
  getRoleLabel,
  getRoleSuffix,
  roleLabelPrefix,
  onSaved,
  questionLabel,
  questionId,
}: ReassignSentAssignmentModalProps) {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedUsers = useMemo(
    () =>
      [...platformUsers]
        .filter((u) => u.id !== assignment?.recipientId)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr')),
    [platformUsers, assignment?.recipientId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUserId('');
    setNoteDraft('');
    setNoteOpen(false);
    setError(null);
  }, [isOpen, assignment?.id]);

  if (!assignment) return null;

  const handleSave = async () => {
    if (!selectedUserId) {
      setError(t.projectDetail.reassignSentAssignmentSelectUser);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await updateProjectAssignment(projectId, assignment.id, {
        recipientId: selectedUserId,
        recipientType: 'user',
        reassignNote: noteDraft.trim() || undefined,
        reassignQuestionId: questionId,
        reassignQuestionLabel: questionLabel,
      });
      if (!result.success) {
        throw new Error(result.error || t.projectDetail.reassignSentAssignmentFailed);
      }

      const emailResult = await resendAssignmentEmail(projectId, assignment.id);
      if (!emailResult.success) {
        console.warn('[ReassignSentAssignment] notification email failed', emailResult.error);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t.projectDetail.reassignSentAssignmentFailed,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.projectDetail.reassignSentAssignmentTitle}
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">{t.projectDetail.reassignSentAssignmentDesc}</p>

        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t.projectDetail.reassignSentAssignmentHint}
        </p>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {t.projectDetail.reassignSentAssignmentCurrentRecipient}
          </p>
          <p className="mt-1 font-medium text-slate-800">{currentRecipientLabel}</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <User size={12} />
            {t.projectDetail.reassignSentAssignmentSelectUser}
          </label>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {sortedUsers.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                {t.projectDetail.reassignSentAssignmentSelectUser}
              </p>
            ) : (
              sortedUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-violet-300 hover:bg-violet-50"
                >
                  <input
                    type="radio"
                    name="reassign-user"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={saving}
                    className="h-4 w-4 shrink-0"
                  />
                  <ProjectUserIdentity
                    className="min-w-0 flex-1"
                    name={user.name}
                    email={user.email}
                    roleLabel={getRoleLabel(user)}
                    roleSuffix={getRoleSuffix?.(user)}
                    avatarUrl={user.avatarUrl}
                    stackedUserInfo
                    roleLabelPrefix={roleLabelPrefix}
                  />
                </label>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setNoteOpen((open) => !open)}
            className="flex w-full items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800"
          >
            <MessageSquare size={12} />
            {t.projectDetail.reassignSentAssignmentNoteLabel}
            <span className="text-slate-400">{noteOpen ? '−' : '+'}</span>
          </button>
          {noteOpen ? (
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={t.projectDetail.reassignSentAssignmentNotePlaceholder}
              rows={3}
              disabled={saving}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200 disabled:opacity-60"
            />
          ) : null}
        </div>

        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !selectedUserId}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {t.projectDetail.reassignSentAssignmentButton}
          </button>
        </div>
      </div>
    </Modal>
  );
}
