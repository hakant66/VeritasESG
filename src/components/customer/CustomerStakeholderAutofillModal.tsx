/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { isValidStakeholderEmail } from '../../lib/applyStakeholderAutofill';
import type { StakeholderAutofillSuggestion } from '../../lib/kbRag';
import Modal from '../ui/Modal';

export type StakeholderAutofillReviewRow = StakeholderAutofillSuggestion & {
  id: string;
  selected: boolean;
  emailDraft: string;
};

export type CustomerStakeholderAutofillModalProps = {
  isOpen: boolean;
  suggestions: StakeholderAutofillSuggestion[];
  isApplying: boolean;
  onClose: () => void;
  onApply: (rows: StakeholderAutofillReviewRow[]) => void | Promise<void>;
};

function toReviewRows(suggestions: StakeholderAutofillSuggestion[]): StakeholderAutofillReviewRow[] {
  return suggestions.map((suggestion, idx) => ({
    ...suggestion,
    id: `stakeholder-suggestion-${idx}`,
    selected: Boolean(suggestion.email && isValidStakeholderEmail(suggestion.email)),
    emailDraft: suggestion.email?.trim() ?? '',
  }));
}

export function CustomerStakeholderAutofillModal({
  isOpen,
  suggestions,
  isApplying,
  onClose,
  onApply,
}: CustomerStakeholderAutofillModalProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StakeholderAutofillReviewRow[]>(() => toReviewRows(suggestions));

  useEffect(() => {
    if (isOpen) setRows(toReviewRows(suggestions));
  }, [isOpen, suggestions]);

  const readyCount = useMemo(
    () =>
      rows.filter(
        (row) => row.selected && isValidStakeholderEmail(row.emailDraft),
      ).length,
    [rows],
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      size="lg"
      title={t.customers.aiAutofillStakeholdersReviewTitle}
      onClose={onClose}
      showFooterClose={false}
    >
      <p className="mb-4 text-sm text-slate-600">{t.customers.aiAutofillStakeholdersReviewHint}</p>

      <ul className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto pr-1">
        {rows.map((row) => {
          const emailOk = isValidStakeholderEmail(row.emailDraft);
          const source = row.sourceDocumentName
            ? `${row.sourceDocumentName} #${(row.sourceChunkIndex ?? 0) + 1}`
            : t.customers.aiAutofillSourceUnknown;
          return (
            <li
              key={row.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={!emailOk}
                  onChange={(e) => {
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === row.id ? { ...item, selected: e.target.checked } : item,
                      ),
                    );
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  {(row.role || row.department) && (
                    <p className="text-xs text-slate-500">
                      {[row.role, row.department].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </label>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {t.users.emailAddress}
                </label>
                <input
                  type="email"
                  value={row.emailDraft}
                  onChange={(e) => {
                    const emailDraft = e.target.value;
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === row.id
                          ? {
                              ...item,
                              emailDraft,
                              selected:
                                item.selected && isValidStakeholderEmail(emailDraft),
                            }
                          : item,
                      ),
                    );
                  }}
                  placeholder={t.customers.aiAutofillStakeholderEmailPlaceholder}
                  className="minimal-input"
                />
                {!emailOk ? (
                  <p className="mt-1 text-xs text-amber-700">
                    {t.customers.aiAutofillStakeholderEmailRequired}
                  </p>
                ) : null}
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-500">
                <FileText size={12} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">
                    {source}
                  </p>
                  {row.sourceExcerpt ? (
                    <p className="mt-0.5 italic">“{row.sourceExcerpt.slice(0, 180)}”</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onClose} className="minimal-button-secondary flex-1 min-w-[120px]">
          {t.common.cancel}
        </button>
        <button
          type="button"
          disabled={isApplying || readyCount === 0}
          onClick={() => void onApply(rows)}
          className="minimal-button-primary flex-1 min-w-[120px]"
        >
          {isApplying ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {t.common.saving}
            </span>
          ) : (
            t.customers.aiAutofillStakeholdersApply.replace('{count}', String(readyCount))
          )}
        </button>
      </div>
    </Modal>
  );
}
