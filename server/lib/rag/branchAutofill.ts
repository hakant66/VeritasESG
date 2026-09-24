/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateJsonFromPrompt } from '../llm/llmService.ts';
import type { CustomerKbSearchHit } from './searchCustomerKb.ts';

export type BranchAutofillSuggestion = {
  name: string;
  type?: string;
  address?: string;
  sourceDocumentName?: string;
  sourceChunkIndex?: number;
  sourceExcerpt?: string;
};

type GeminiBranchRow = {
  name?: string;
  type?: string | null;
  address?: string | null;
  sourceExcerpt?: string;
};

type GeminiBranchExtraction = {
  facilities?: GeminiBranchRow[];
};

function buildContextBlock(hits: CustomerKbSearchHit[]) {
  return hits
    .map(
      (hit, idx) =>
        `[Chunk ${idx + 1} | ${hit.documentName} #${hit.chunkIndex} | score ${hit.score.toFixed(3)}]\n${hit.text}`,
    )
    .join('\n\n---\n\n');
}

function normalizeBranchName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupeBranches(rows: BranchAutofillSuggestion[]) {
  const seen = new Set<string>();
  const unique: BranchAutofillSuggestion[] = [];
  for (const row of rows) {
    const key = normalizeBranchName(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export async function extractBranchSuggestions(
  hits: CustomerKbSearchHit[],
  customerName: string,
): Promise<BranchAutofillSuggestion[]> {
  if (hits.length === 0) return [];

  const prompt = `You extract company facility / branch / site records for a sustainability consultancy CRM.

CUSTOMER: ${customerName}

RULES:
- Use ONLY named production sites, plants, factories, offices, warehouses, R&D centres, or subsidiaries explicitly mentioned in the SOURCE CHUNKS.
- name: the facility or site name as stated (e.g. "Gebze Kimya Tesisi", "Düsseldorf Office").
- type: facility category when inferable (e.g. "Factory", "Office", "Warehouse", "R&D", "Plant"); otherwise omit.
- address: city, region, country, or street address when stated; otherwise omit.
- Do NOT invent locations. Do NOT list countries/regions alone without a named site.
- Skip vague phrases ("global operations", "worldwide") without a concrete facility name.
- Return JSON: { "facilities": [ { "name": "...", "type": "...", "address": "...", "sourceExcerpt": "short quote" } ] }

SOURCE CHUNKS:
${buildContextBlock(hits)}`;

  const parsed = await generateJsonFromPrompt<GeminiBranchExtraction>(prompt);
  const rows = Array.isArray(parsed.facilities) ? parsed.facilities : [];
  const suggestions: BranchAutofillSuggestion[] = [];

  for (const row of rows) {
    const name = String(row.name ?? '').trim();
    if (!name || name.length < 2) continue;

    const suggestion: BranchAutofillSuggestion = {
      name,
      sourceExcerpt: row.sourceExcerpt?.trim(),
    };
    const type = row.type ? String(row.type).trim() : '';
    if (type) suggestion.type = type;
    const address = row.address ? String(row.address).trim() : '';
    if (address) suggestion.address = address;

    const excerpt = suggestion.sourceExcerpt || '';
    const matchedHit = hits.find((h) => excerpt && h.text.includes(excerpt.slice(0, 40)));
    const hit = matchedHit || hits[0];
    if (hit) {
      suggestion.sourceDocumentName = hit.documentName;
      suggestion.sourceChunkIndex = hit.chunkIndex;
    }

    suggestions.push(suggestion);
  }

  return dedupeBranches(suggestions);
}
