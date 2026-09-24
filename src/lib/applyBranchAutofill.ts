/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Branch } from '../types';
import type { BranchAutofillSuggestion } from './kbRag';

function normalizeBranchName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isValidBranchName(name: string) {
  return name.trim().length >= 2;
}

export function filterBranchSuggestions(
  suggestions: BranchAutofillSuggestion[],
  existing: Branch[],
  onlyNew: boolean,
): BranchAutofillSuggestion[] {
  const deduped: BranchAutofillSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    const key = normalizeBranchName(suggestion.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(suggestion);
  }

  if (!onlyNew) return deduped;

  return deduped.filter((suggestion) => {
    const name = normalizeBranchName(suggestion.name);
    return !existing.some((branch) => normalizeBranchName(branch.name) === name);
  });
}
