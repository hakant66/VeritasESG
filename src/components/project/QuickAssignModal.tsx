/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { getAuthToken } from '../../lib/authToken';
import { ProjectUserIdentity } from './ProjectUserIdentity';
import type { Assignment, Question, PlatformUser } from '../../types';

function questionSoruPlainText(soru: string): string {
  return (soru || '').replace(/\s+/g, ' ').trim();
}

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  platformUsers: PlatformUser[];
  projectId: string;
  onSaved: () => void;
  existingAssignment?: Assignment | null;
  getRoleLabel: (user: PlatformUser) => string;
  getRoleSuffix?: (user: PlatformUser) => string | undefined;
  roleLabelPrefix: string;
}

export function QuickAssignModal({
  isOpen,
  onClose,
  question,
  platformUsers,
  projectId,
  onSaved,
  existingAssignment = null,
  getRoleLabel,
  getRoleSuffix,
  roleLabelPrefix,
}: QuickAssignModalProps) {
  const isUpdate = Boolean(existingAssignment?.id);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedUsers = [...platformUsers].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'tr'),
  );
  const questionSoruText = questionSoruPlainText(question.soru);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPersonId(existingAssignment?.recipientId ?? '');
    setError(null);
  }, [isOpen, existingAssignment?.recipientId]);

  const handleSubmit = async () => {
    if (!selectedPersonId) {
      setError('Lütfen bir kişi seçin');
      return;
    }

    const person = sortedUsers.find((p) => p.id === selectedPersonId);
    if (!person) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = isUpdate && existingAssignment?.id
        ? await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/quick-assignment/${encodeURIComponent(existingAssignment.id)}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                recipientId: person.id,
                recipientType: 'user',
              }),
            },
          )
        : await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/quick-assignment`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                questionId: question.id,
                recipientId: person.id,
                recipientType: 'user',
              }),
            },
          );

      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload?.success) {
        throw new Error(
          payload?.error ||
            (isUpdate ? 'Atama güncellenemedi' : 'Atama oluşturulamadı'),
        );
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUpdate ? 'Açık Atamayı Güncelle' : 'Kullanıcıya Açık Atama Yap'}
      description={
        <div className="space-y-1">
          <p>
            Soru: {question.kod} - {question.baslik}
          </p>
          {questionSoruText ? (
            <p
              className="truncate text-slate-600"
              title={questionSoruText}
            >
              {questionSoruText}
            </p>
          ) : null}
        </div>
      }
      type="info"
      size="lg"
      showFooterClose={false}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <ul className="list-disc space-y-2 pl-5 text-sm text-amber-800">
            <li>
              Bu sorunun kişi ataması deadline içermez, açık atama statüsünde
              kayıt edilmiştir ve email gönderimi gerçekleşmez.
            </li>
            <li>
              Açık atamalar ilgili projede &quot;Kullanılar/Atamalar&quot;
              sekmesinde birleştirilerek email gönderilebilir.
            </li>
          </ul>
        </div>

        {/* Kişi Seçimi */}
        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Proje Kullanıcısı Seçin
          </label>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {sortedUsers.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                Atanabilecek kişi bulunamadı
              </p>
            ) : (
              sortedUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-blue-300 hover:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="person"
                    value={user.id}
                    checked={selectedPersonId === user.id}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    disabled={isSaving}
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

        {error ? (
          <p className="text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {isSaving ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            {isUpdate ? 'Atama güncelleniyor...' : 'Atama oluşturuluyor...'}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || !selectedPersonId}
            className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? 'Kaydediliyor...' : isUpdate ? 'Güncelle' : 'Atama Yap'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
