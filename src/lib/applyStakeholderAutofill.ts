/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Contact } from '../types';
import type { StakeholderAutofillSuggestion } from './kbRag';

function normalizePersonName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isValidStakeholderEmail(email: string) {
  const trimmed = email.trim();
  return trimmed.includes('@') && trimmed.includes('.');
}

export function filterStakeholderSuggestions(
  suggestions: StakeholderAutofillSuggestion[],
  existing: Contact[],
  onlyNew: boolean,
): StakeholderAutofillSuggestion[] {
  const deduped: StakeholderAutofillSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    const emailKey = suggestion.email?.trim().toLowerCase();
    const key = emailKey || normalizePersonName(suggestion.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(suggestion);
  }

  if (!onlyNew) return deduped;

  return deduped.filter((suggestion) => {
    const email = suggestion.email?.trim().toLowerCase();
    if (email && existing.some((c) => c.email.trim().toLowerCase() === email)) {
      return false;
    }
    const name = normalizePersonName(suggestion.name);
    return !existing.some((c) => normalizePersonName(c.name) === name);
  });
}
