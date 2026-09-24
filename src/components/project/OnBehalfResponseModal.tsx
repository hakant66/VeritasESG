/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Paperclip } from 'lucide-react';
import Modal from '../ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { apiRequest, ApiClientError } from '../../lib/apiClient';
import { getAuthToken } from '../../lib/authToken';
import type { Question, Contact, PlatformUser } from '../../types';

export type OnBehalfResponsePrefill = {
  customerName: string;
  customerEmail: string;
  answerText: string;
};

type OnBehalfResponseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  question: Question;
  onSaved: () => void;
  /** Audit tab: auditor submits as themselves (not on behalf of customer). */
  mode?: 'customer' | 'audit';
  prefill?: OnBehalfResponsePrefill | null;
  /** Firma paydaşları */
  contacts?: Contact[];
  /** Projeye atanmış kullanıcılar */
  projectUsers?: PlatformUser[];
};

export function OnBehalfResponseModal({
  isOpen,
  onClose,
  projectId,
  question,
  onSaved,
  mode = 'customer',
  prefill = null,
  contacts = [],
  projectUsers = [],
}: OnBehalfResponseModalProps) {
  const { t } = useTranslation();
  const isAuditMode = mode === 'audit';
  const [selectedPersonId, setSelectedPersonId] = useState<string>('manual');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if answer field should be numeric
  const isNumericAnswer = question.answerFormat === 'integer' || question.answerFormat === 'decimal';
  const isManualEntry = selectedPersonId === 'manual';

  const sortByName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, 'tr');

  /** Paydaşlar: projede aynı e-postalı kullanıcı varsa listede gösterme */
  const stakeholderContacts = useMemo(() => {
    const projectEmails = new Set(
      projectUsers
        .map((u) => (u.email || '').trim().toLowerCase())
        .filter(Boolean),
    );
    return contacts.filter((c) => {
      const email = (c.email || '').trim().toLowerCase();
      return email && !projectEmails.has(email);
    });
  }, [contacts, projectUsers]);

  const personOptions = useMemo(() => {
    const projectOpts = [...projectUsers]
      .sort(sortByName)
      .map((u) => ({
        id: `user-${u.id}`,
        name: u.name,
        email: u.email,
        label: `Proje kullanıcısı - ${u.name} - ${u.email}`,
      }));

    const stakeholderOpts = [...stakeholderContacts]
      .sort(sortByName)
      .map((c) => ({
        id: `contact-${c.id}`,
        name: c.name,
        email: c.email,
        label: `Firma Paydaşı - ${c.name} - ${c.email}`,
      }));

    return [
      {
        id: 'manual',
        name: 'Liste harici girmek istiyorum',
        email: '',
        label: 'Liste harici girmek istiyorum',
      },
      ...projectOpts,
      ...stakeholderOpts,
    ];
  }, [projectUsers, stakeholderContacts]);

  // Handle person selection
  const handlePersonSelect = (personId: string) => {
    setSelectedPersonId(personId);
    if (personId === 'manual') {
      setCustomerName('');
      setCustomerEmail('');
    } else {
      const person = personOptions.find((p) => p.id === personId);
      if (person) {
        setCustomerName(person.name);
        setCustomerEmail(person.email);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPersonId('manual');
    setCustomerName(prefill?.customerName ?? '');
    setCustomerEmail(prefill?.customerEmail ?? '');
    setAnswerText(prefill?.answerText ?? '');
    setFile(null);
    setError(null);
  }, [isOpen, prefill?.customerName, prefill?.customerEmail, prefill?.answerText]);

  const resetForm = () => {
    setSelectedPersonId('manual');
    setCustomerName('');
    setCustomerEmail('');
    setAnswerText('');
    setFile(null);
    setError(null);
  };

  // Handle numeric input validation
  const handleAnswerChange = (value: string) => {
    if (!isNumericAnswer) {
      setAnswerText(value);
      return;
    }

    // For numeric fields, validate input
    if (question.answerFormat === 'integer') {
      // Only allow integers (positive/negative)
      if (value === '' || value === '-' || /^-?\d+$/.test(value)) {
        setAnswerText(value);
      }
    } else if (question.answerFormat === 'decimal') {
      // Allow decimals (positive/negative with dot or comma)
      if (value === '' || value === '-' || /^-?\d*[.,]?\d*$/.test(value)) {
        setAnswerText(value);
      }
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const answer = answerText.trim();
    if (!answer) {
      setError(t.projectDetail.onBehalfValidation);
      return;
    }

    if (!isAuditMode) {
      const name = customerName.trim();
      const email = customerEmail.trim();
      if (!name || !email) {
        setError(t.projectDetail.onBehalfValidation);
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error(t.projectDetail.onBehalfSessionRequired);
      }

      const form = new FormData();
      if (!isAuditMode) {
        form.append('customerName', customerName.trim());
        form.append('customerEmail', customerEmail.trim());
      }
      form.append('answerText', answer);
      if (file) form.append('file', file);

      const path = isAuditMode
        ? `/api/projects/${encodeURIComponent(projectId)}/questions/${encodeURIComponent(question.id)}/auditor-response`
        : `/api/projects/${encodeURIComponent(projectId)}/questions/${encodeURIComponent(question.id)}/on-behalf-response`;

      await apiRequest<{ answerId: string }>(path, {
        method: 'POST',
        body: form,
      });
      resetForm();
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 403) {
        setError(t.projectDetail.onBehalfForbidden);
        return;
      }
      setError(err instanceof Error ? err.message : t.common.errorOccurred);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isAuditMode
          ? t.projectDetail.auditResponseModalTitle
          : t.projectDetail.onBehalfModalTitle
      }
      description={
        isAuditMode
          ? t.projectDetail.auditResponseModalDescription
          : t.projectDetail.onBehalfModalDescription
      }
      type="info"
      size="lg"
      showFooterClose={false}
    >
      <div className="mt-4 space-y-4">
        {!isAuditMode ? (
          <>
            {/* Person Selection Dropdown */}
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Kişi Seçimi
              </span>
              <select
                value={selectedPersonId}
                onChange={(e) => handlePersonSelect(e.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              >
                <option value="manual">
                  Liste harici girmek istiyorum
                </option>
                {projectUsers.length > 0 ? (
                  <optgroup label="Proje kullanıcıları">
                    {[...projectUsers]
                      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                      .map((u) => (
                        <option key={`user-${u.id}`} value={`user-${u.id}`}>
                          {`Proje kullanıcısı - ${u.name} - ${u.email}`}
                        </option>
                      ))}
                  </optgroup>
                ) : null}
                {stakeholderContacts.length > 0 ? (
                  <optgroup label="Firma paydaşları">
                    {[...stakeholderContacts]
                      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                      .map((c) => (
                        <option key={`contact-${c.id}`} value={`contact-${c.id}`}>
                          {`Firma Paydaşı - ${c.name} - ${c.email}`}
                        </option>
                      ))}
                  </optgroup>
                ) : null}
              </select>
            </label>

            {/* Name and Email Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {t.common.name}
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isSaving || !isManualEntry}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {t.common.email}
                </span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={isSaving || !isManualEntry}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>
            </div>
          </>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {t.projectDetail.onBehalfAnswerLabel}
            {isNumericAnswer && (
              <span className="ml-2 text-[9px] font-normal text-slate-500">
                ({question.answerFormat === 'integer' ? 'Tam sayı' : 'Ondalık sayı'})
              </span>
            )}
          </span>
          {isNumericAnswer ? (
            <input
              type="text"
              value={answerText}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={isSaving}
              placeholder={question.answerFormat === 'integer' ? 'Örn: 42' : 'Örn: 3.14 veya 3,14'}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          ) : (
            <textarea
              rows={5}
              value={answerText}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={isSaving}
              className="resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-900"
            />
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {t.projectDetail.onBehalfAttachmentLabel}
          </span>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3">
            <Paperclip size={16} className="shrink-0 text-slate-400" aria-hidden />
            <input
              type="file"
              disabled={isSaving}
              accept=".pdf,.docx,.xlsx,image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-xs text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold"
            />
          </div>
          {file ? (
            <p className="text-xs text-slate-500">{file.name}</p>
          ) : null}
        </label>

        {error ? (
          <p className="text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {isSaving ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            {isAuditMode
              ? t.projectDetail.auditResponseSaving
              : t.projectDetail.onBehalfSaving}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? t.common.loading : t.common.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
