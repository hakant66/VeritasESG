/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Customer } from '../types';
import type { CustomerAutofillFieldSuggestion } from './kbRag';
import { getReportingFrameworkLabel } from './reportingFrameworks';

function setFormControlValue(form: HTMLFormElement, name: string, value: string | number | boolean) {
  const item = form.elements.namedItem(name);
  if (!item) return false;

  if (item instanceof RadioNodeList) {
    for (const el of Array.from(item)) {
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        el.checked = String(el.value) === String(value);
      }
    }
    return true;
  }

  if (item instanceof HTMLInputElement) {
    if (item.type === 'checkbox') {
      item.checked = Boolean(value);
    } else {
      item.value = String(value);
    }
    item.dispatchEvent(new Event('input', { bubbles: true }));
    item.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  if (item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement) {
    item.value = String(value);
    item.dispatchEvent(new Event('input', { bubbles: true }));
    item.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}

/** Map flat autofill suggestions into a partial Customer for form remount. */
export function customerPatchFromAutofill(
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
): Partial<Customer> {
  const patch: Partial<Customer> = {};
  const esgKeys = Object.keys(suggestions).filter((k) => k.startsWith('esg_'));

  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (key.startsWith('esg_')) continue;
    if (key === 'reportingFrameworkKeys') {
      const raw = suggestion.value;
      patch.reportingFrameworkKeys = Array.isArray(raw)
        ? raw.map((item) => String(item).trim()).filter(Boolean)
        : String(raw)
            .split(/[,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);
      continue;
    }
    (patch as Record<string, unknown>)[key] = suggestion.value;
  }

  if (esgKeys.length > 0) {
    const esgSummary: Record<string, unknown> = {};
    for (const key of esgKeys) {
      const field = key.replace(/^esg_/, '');
      esgSummary[field] = suggestions[key]?.value;
    }
    patch.esgSummary = esgSummary as Customer['esgSummary'];
  }

  return patch;
}

export function countAutofillSuggestions(
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
) {
  return Object.keys(suggestions).length;
}

/** Attach synthetic sectorIds suggestion for source panel when sectors were inferred. */
export function withReportingFrameworksSuggestion(
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
  frameworkKeys: string[],
  lang: 'en' | 'tr',
  source?: CustomerAutofillFieldSuggestion,
): Record<string, CustomerAutofillFieldSuggestion> {
  if (frameworkKeys.length === 0) return suggestions;
  const labels = frameworkKeys.map((key) => getReportingFrameworkLabel(key, lang));
  return {
    ...suggestions,
    reportingFrameworkKeys: {
      value: labels.join(', '),
      sourceDocumentName:
        source?.sourceDocumentName ?? suggestions.reportingFrameworkKeys?.sourceDocumentName,
      sourceChunkIndex:
        source?.sourceChunkIndex ?? suggestions.reportingFrameworkKeys?.sourceChunkIndex,
      sourceExcerpt: source?.sourceExcerpt ?? suggestions.reportingFrameworkKeys?.sourceExcerpt,
    },
  };
}

export function withSectorIdsSuggestion(
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
  sectorIds: string[],
  sectorNames: string[],
  source?: CustomerAutofillFieldSuggestion,
): Record<string, CustomerAutofillFieldSuggestion> {
  if (sectorIds.length === 0) return suggestions;
  return {
    ...suggestions,
    sectorIds: {
      value: sectorNames.join(', '),
      sourceDocumentName: source?.sourceDocumentName ?? suggestions.naceCode?.sourceDocumentName,
      sourceChunkIndex: source?.sourceChunkIndex ?? suggestions.naceCode?.sourceChunkIndex,
      sourceExcerpt: source?.sourceExcerpt ?? suggestions.naceCode?.sourceExcerpt,
    },
  };
}

export function applyAutofillToForm(
  form: HTMLFormElement,
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
) {
  let applied = 0;
  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (key === 'reportingFrameworkKeys') {
      const keys = Array.isArray(suggestion.value)
        ? suggestion.value
        : String(suggestion.value)
            .split(/[,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);
      for (const frameworkKey of keys) {
        if (setFormControlValue(form, key, frameworkKey)) applied += 1;
      }
      continue;
    }
    const value = suggestion.value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (setFormControlValue(form, key, value)) applied += 1;
    }
  }
  return applied;
}
