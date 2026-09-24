/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, Trash2, User, Zap } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import type { Assignment, Contact, PlatformUser, Project } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { updateProjectAssignment, resendAssignmentEmail } from '../../../lib/assignmentManageApi';
import { isAssignmentLinkSent } from '../../../lib/questionWorkflow';
import {
  normalizeAssignmentUrgency,
  type AssignmentUrgencyLevel,
} from '../../../../lib/assignmentUrgency';

type RecipientOption = {
  id: string;
  name: string;
  email: string;
  type: 'contact' | 'user';
};

export type AssignmentManageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  project: Project | null | undefined;
  platformUsers: PlatformUser[];
  contacts: Contact[];
  onSaved: () => void;
  onDeleteRequest: (assignment: Assignment) => void;
};

function toDateInput(value: number | undefined): string {
  if (typeof value !== 'number' || value <= 0) {
    return new Date().toISOString().split('T')[0];
  }
  return new Date(value).toISOString().split('T')[0];
}

export function AssignmentManageModal({
  isOpen,
  onClose,
  assignment,
  project,
  platformUsers,
  contacts,
  onSaved,
  onDeleteRequest,
}: AssignmentManageModalProps) {
  const { t } = useTranslation();
  const [recipientKey, setRecipientKey] = useState('');
  const [beginDate, setBeginDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [urgency, setUrgency] = useState<AssignmentUrgencyLevel>('normal');
  const [approverKey, setApproverKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const recipientOptions = useMemo((): RecipientOption[] => {
    const customerId = project?.customerId;
    const users = platformUsers
      .filter((u) => u.role !== 'platform_admin')
      .map((u) => ({
        id: u.id,
        name: u.name || u.email || u.id,
        email: u.email || '',
        type: 'user' as const,
      }));
    const stakeholderContacts = (contacts || [])
      .filter((c) => !customerId || c.customerId === customerId)
      .map((c) => ({
        id: c.id,
        name: c.name || c.email || c.id,
        email: c.email || '',
        type: 'contact' as const,
      }));
    return [...users, ...stakeholderContacts].sort((a, b) =>
      a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }),
    );
  }, [platformUsers, contacts, project?.customerId]);

  useEffect(() => {
    if (!isOpen || !assignment) return;
    setRecipientKey(`${assignment.recipientType}:${assignment.recipientId}`);
    setBeginDate(toDateInput(assignment.beginDate));
    setDeadline(
      assignment.deadline
        ? toDateInput(assignment.deadline)
        : toDateInput(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    setUrgency(normalizeAssignmentUrgency(assignment.urgency));
    setApproverKey(
      assignment.approverId
        ? `${assignment.approverType || 'user'}:${assignment.approverId}`
        : '',
    );
    setError(null);
    setInfo(null);
  }, [isOpen, assignment]);

  const handleResendEmail = async () => {
    if (!project?.id || !assignment || !isAssignmentLinkSent(assignment)) return;
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const result = await resendAssignmentEmail(project.id, assignment.id);
      if (!result.success) {
        throw new Error(result.error || t.tasks.resendEmailFailed);
      }
      setInfo(
        t.tasks.resendEmailSuccess.replace(
          '{email}',
          result.recipientEmail || selectedRecipient?.email || '',
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.tasks.resendEmailFailed);
    } finally {
      setResending(false);
    }
  };

  if (!assignment) return null;

  const isOpenAssignment = !isAssignmentLinkSent(assignment);
  const selectedRecipient = recipientOptions.find(
    (option) => `${option.type}:${option.id}` === recipientKey,
  );

  const handleSave = async () => {
    if (!project?.id) return;
    if (beginDate && deadline && beginDate > deadline) {
      setError(t.projectDetail.beginDateBeforeDeadline);
      return;
    }
    if (!selectedRecipient) {
      setError(t.tasks.manageSelectRecipient);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof updateProjectAssignment>[2] = {
        recipientId: selectedRecipient.id,
        recipientType: selectedRecipient.type,
      };
      if (!isOpenAssignment) {
        payload.beginDate = beginDate;
        payload.deadline = deadline;
        payload.urgency = urgency;
      } else {
        payload.urgency = urgency;
      }
      if (approverKey) {
        const [type, ...idParts] = approverKey.split(':');
        payload.approverId = idParts.join(':');
        payload.approverType = type === 'contact' ? 'contact' : 'user';
      }

      const result = await updateProjectAssignment(project.id, assignment.id, payload);
      if (!result.success) {
        throw new Error(result.error || t.tasks.manageSaveFailed);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.tasks.manageSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.tasks.manageAssignmentTitle}>
      <div className="space-y-5">
        <p className="text-sm text-slate-600">{t.tasks.manageAssignmentDesc}</p>

        {isOpenAssignment ? (
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t.tasks.manageOpenAssignmentHint}
          </p>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <User size={12} />
            {t.tasks.toLabel}
          </label>
          <select
            value={recipientKey}
            onChange={(e) => setRecipientKey(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900"
          >
            {recipientOptions.map((option) => (
              <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                {option.name}
                {option.email ? ` (${option.email})` : ''}
                {option.type === 'contact' ? ` — ${t.tasks.stakeholder}` : ''}
              </option>
            ))}
          </select>
        </div>

        {!isOpenAssignment ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Calendar size={12} />
                {t.projectDetail.beginDate}
              </label>
              <input
                type="date"
                value={beginDate}
                onChange={(e) => setBeginDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Calendar size={12} />
                {t.projectDetail.deadline}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Zap size={12} />
            {t.projectDetail.urgencyLabel}
          </label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(normalizeAssignmentUrgency(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="normal">{t.projectDetail.urgencyNormal}</option>
            <option value="urgent">{t.projectDetail.urgencyUrgent}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <User size={12} />
            {t.projectDetail.approverLabel}
          </label>
          <select
            value={approverKey}
            onChange={(e) => setApproverKey(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">{t.projectDetail.approverSelectPlaceholder}</option>
            {recipientOptions.map((option) => (
              <option key={`approver:${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                {option.name}
                {option.email ? ` (${option.email})` : ''}
                {option.type === 'contact' ? ` — ${t.tasks.stakeholder}` : ''}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {info ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {info}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {!isOpenAssignment ? (
              <button
                type="button"
                onClick={() => void handleResendEmail()}
                disabled={resending}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-50"
              >
                {resending ? <Loader2 size={14} className="animate-spin" /> : null}
                {t.tasks.resendAssignmentEmail}
              </button>
            ) : null}
            <button
            type="button"
            onClick={() => onDeleteRequest(assignment)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-700 transition-colors hover:bg-red-100"
          >
            <Trash2 size={14} />
            {t.tasks.deleteAssignment}
          </button>
          </div>

          <div className="flex items-center gap-2">
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {t.common.save}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
