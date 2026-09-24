/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown, ChevronUp, FileText, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import {
  AUTOFILL_FIELD_LABELS,
  type CustomerAutofillUiScope,
} from '../../lib/customerAutofillMapping';
import type { CustomerAutofillFieldSuggestion } from '../../lib/kbRag';
import { cn } from '../../lib/utils';
import type { CustomerFormTabId } from './CustomerFormTabs';

export type CustomerAutofillPanelProps = {
  isAutofilling: boolean;
  onlyFillEmpty: boolean;
  onOnlyFillEmptyChange: (value: boolean) => void;
  scope: CustomerAutofillUiScope;
  onScopeChange: (scope: CustomerAutofillUiScope) => void;
  onAutofill: () => void;
  disabled?: boolean;
  suggestions: Record<string, CustomerAutofillFieldSuggestion> | null;
  activeTab?: CustomerFormTabId;
};

const SCOPES: CustomerAutofillUiScope[] = [
  'basic',
  'workforce',
  'sector',
  'stakeholders',
  'facilities',
  'reporting',
  'all',
];

export function CustomerAutofillPanel({
  isAutofilling,
  onlyFillEmpty,
  onOnlyFillEmptyChange,
  scope,
  onScopeChange,
  onAutofill,
  disabled,
  suggestions,
  activeTab,
}: CustomerAutofillPanelProps) {
  const { t, lang } = useTranslation();
  const [sourcesOpen, setSourcesOpen] = useState(true);

  const scopeLabels: Record<CustomerAutofillUiScope, string> = {
    basic: t.customers.aiAutofillScopeBasic,
    workforce: t.customers.aiAutofillScopeWorkforce,
    sector: t.customers.aiAutofillScopeSector,
    stakeholders: t.customers.aiAutofillScopeStakeholders,
    facilities: t.customers.aiAutofillScopeFacilities,
    reporting: t.customers.aiAutofillScopeReporting,
    sustainability: t.customers.aiAutofillScopeReporting,
    all: t.customers.aiAutofillScopeAll,
  };

  const hintText =
    scope === 'stakeholders' || activeTab === 'stakeholders'
      ? t.customers.aiAutofillHintStakeholders
      : scope === 'facilities' || activeTab === 'facilities'
        ? t.customers.aiAutofillHintFacilities
        : scope === 'reporting' ||
            activeTab === 'reporting' ||
            activeTab === 'priorities' ||
            activeTab === 'esg'
          ? activeTab === 'esg'
            ? t.customers.aiAutofillHintSustainability
            : t.customers.aiAutofillHintReporting
          : t.customers.aiAutofillHint;

  const rows = suggestions ? Object.entries(suggestions) : [];

  return (
    <div className="mb-3 space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          disabled={disabled || isAutofilling}
          onClick={onAutofill}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-50"
        >
          {isAutofilling ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isAutofilling ? t.customers.aiAutofillLoading : t.customers.aiAutofillButton}
        </button>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={onlyFillEmpty}
            onChange={(e) => onOnlyFillEmptyChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
          />
          {t.customers.aiAutofillOnlyEmpty}
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled || isAutofilling}
            onClick={() => onScopeChange(item)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
              scope === item
                ? 'bg-blue-700 text-white'
                : 'bg-white text-slate-600 hover:bg-blue-100',
            )}
          >
            {scopeLabels[item]}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{hintText}</p>

      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setSourcesOpen((open) => !open)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold text-slate-700"
          >
            <span>{t.customers.aiAutofillSourcesTitle.replace('{count}', String(rows.length))}</span>
            {sourcesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {sourcesOpen && (
            <ul className="max-h-48 space-y-2 overflow-y-auto border-t border-slate-100 px-3 py-2">
              {rows.map(([key, suggestion]) => {
                const label = AUTOFILL_FIELD_LABELS[key]?.[lang] || key;
                const source = suggestion.sourceDocumentName
                  ? `${suggestion.sourceDocumentName} #${suggestion.sourceChunkIndex ?? 0}`
                  : t.customers.aiAutofillSourceUnknown;
                const valuePreview = Array.isArray(suggestion.value)
                  ? suggestion.value.join(', ').slice(0, 120)
                  : String(suggestion.value).slice(0, 120);
                return (
                  <li key={key} className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs">
                    <div className="flex items-start gap-2">
                      <FileText size={12} className="mt-0.5 shrink-0 text-blue-600" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">{label}</p>
                        <p className="truncate text-slate-600">{valuePreview}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {source}
                        </p>
                        {suggestion.sourceExcerpt ? (
                          <p className="mt-1 line-clamp-2 text-[10px] italic text-slate-500">
                            “{suggestion.sourceExcerpt.slice(0, 160)}”
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
