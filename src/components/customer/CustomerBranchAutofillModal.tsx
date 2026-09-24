/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { isValidBranchName } from '../../lib/applyBranchAutofill';
import type { BranchAutofillSuggestion } from '../../lib/kbRag';
import Modal from '../ui/Modal';

export type BranchAutofillReviewRow = BranchAutofillSuggestion & {
  id: string;
  selected: boolean;
  nameDraft: string;
  typeDraft: string;
  addressDraft: string;
};

export type CustomerBranchAutofillModalProps = {
  isOpen: boolean;
  suggestions: BranchAutofillSuggestion[];
  isApplying: boolean;
  onClose: () => void;
  onApply: (rows: BranchAutofillReviewRow[]) => void | Promise<void>;
};

function toReviewRows(suggestions: BranchAutofillSuggestion[]): BranchAutofillReviewRow[] {
  return suggestions.map((suggestion, idx) => ({
    ...suggestion,
    id: `branch-suggestion-${idx}`,
    selected: isValidBranchName(suggestion.name),
    nameDraft: suggestion.name.trim(),
    typeDraft: suggestion.type?.trim() ?? '',
    addressDraft: suggestion.address?.trim() ?? '',
  }));
}

export function CustomerBranchAutofillModal({
  isOpen,
  suggestions,
  isApplying,
  onClose,
  onApply,
}: CustomerBranchAutofillModalProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BranchAutofillReviewRow[]>(() => toReviewRows(suggestions));

  useEffect(() => {
    if (isOpen) setRows(toReviewRows(suggestions));
  }, [isOpen, suggestions]);

  const readyCount = useMemo(
    () => rows.filter((row) => row.selected && isValidBranchName(row.nameDraft)).length,
    [rows],
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      size="lg"
      title={t.customers.aiAutofillFacilitiesReviewTitle}
      onClose={onClose}
      showFooterClose={false}
    >
      <p className="mb-4 text-sm text-slate-600">{t.customers.aiAutofillFacilitiesReviewHint}</p>

      <ul className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto pr-1">
        {rows.map((row) => {
          const nameOk = isValidBranchName(row.nameDraft);
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
                  disabled={!nameOk}
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
                  <p className="font-semibold text-slate-900">{row.nameDraft || row.name}</p>
                  {(row.typeDraft || row.addressDraft) && (
                    <p className="text-xs text-slate-500">
                      {[row.typeDraft, row.addressDraft].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t.customers.branchNameLabel}
                  </label>
                  <input
                    type="text"
                    value={row.nameDraft}
                    onChange={(e) => {
                      const nameDraft = e.target.value;
                      setRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                nameDraft,
                                selected: item.selected && isValidBranchName(nameDraft),
                              }
                            : item,
                        ),
                      );
                    }}
                    placeholder={t.customers.branchNamePlaceholder}
                    className="minimal-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t.customers.branchTypeLabel}
                  </label>
                  <input
                    type="text"
                    value={row.typeDraft}
                    onChange={(e) => {
                      const typeDraft = e.target.value;
                      setRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, typeDraft } : item,
                        ),
                      );
                    }}
                    placeholder={t.customers.branchTypePlaceholder}
                    className="minimal-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t.customers.branchAddressLabel}
                  </label>
                  <input
                    type="text"
                    value={row.addressDraft}
                    onChange={(e) => {
                      const addressDraft = e.target.value;
                      setRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, addressDraft } : item,
                        ),
                      );
                    }}
                    placeholder={t.customers.branchLocationSinglePlaceholder}
                    className="minimal-input"
                  />
                </div>
              </div>

              {!nameOk ? (
                <p className="text-xs text-amber-700">{t.customers.aiAutofillFacilityNameRequired}</p>
              ) : null}

              <div className="flex items-start gap-2 text-xs text-slate-500">
                <FileText size={12} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">
                    {source}
                  </p>
                  {row.sourceExcerpt ? (
                    <p className="mt-0.5 italic">"{row.sourceExcerpt.slice(0, 180)}"</p>
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
            t.customers.aiAutofillFacilitiesApply.replace('{count}', String(readyCount))
          )}
        </button>
      </div>
    </Modal>
  );
}
