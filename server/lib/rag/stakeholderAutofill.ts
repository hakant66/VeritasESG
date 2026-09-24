/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateJsonFromPrompt } from '../llm/llmService.ts';
import type { CustomerKbSearchHit } from './searchCustomerKb.ts';

export type StakeholderAutofillSuggestion = {
  name: string;
  email?: string;
  role?: string;
  department?: string;
  linkedinUrl?: string;
  sourceDocumentName?: string;
  sourceChunkIndex?: number;
  sourceExcerpt?: string;
};

type GeminiStakeholderRow = {
  name?: string;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  sourceExcerpt?: string;
};

type GeminiStakeholderExtraction = {
  contacts?: GeminiStakeholderRow[];
};

function buildContextBlock(hits: CustomerKbSearchHit[]) {
  return hits
    .map(
      (hit, idx) =>
        `[Chunk ${idx + 1} | ${hit.documentName} #${hit.chunkIndex} | score ${hit.score.toFixed(3)}]\n${hit.text}`,
    )
    .join('\n\n---\n\n');
}

function normalizePersonName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupeStakeholders(rows: StakeholderAutofillSuggestion[]) {
  const seen = new Set<string>();
  const unique: StakeholderAutofillSuggestion[] = [];
  for (const row of rows) {
    const emailKey = row.email?.trim().toLowerCase();
    const key = emailKey || normalizePersonName(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export async function extractStakeholderSuggestions(
  hits: CustomerKbSearchHit[],
  customerName: string,
): Promise<StakeholderAutofillSuggestion[]> {
  if (hits.length === 0) return [];

  const prompt = `You extract individual stakeholder / contact records for a sustainability consultancy CRM.

CUSTOMER: ${customerName}

RULES:
- Use ONLY people explicitly named in the SOURCE CHUNKS (executives, board members, sustainability leads, key contacts).
- Do NOT invent emails. Include email only when explicitly present in the text.
- role: job title or board position (e.g. "Yönetim Kurulu Başkanı", "ESG Director").
- department: unit or function when stated; otherwise omit.
- linkedinUrl: only when a LinkedIn URL appears in the text.
- Skip generic labels without a person name (e.g. "Investors", "Employees").
- Return JSON: { "contacts": [ { "name": "...", "email": "...", "role": "...", "department": "...", "linkedinUrl": "...", "sourceExcerpt": "short quote" } ] }

SOURCE CHUNKS:
${buildContextBlock(hits)}`;

  const parsed = await generateJsonFromPrompt<GeminiStakeholderExtraction>(prompt);
  const rows = Array.isArray(parsed.contacts) ? parsed.contacts : [];
  const suggestions: StakeholderAutofillSuggestion[] = [];

  for (const row of rows) {
    const name = String(row.name ?? '').trim();
    if (!name || name.length < 3) continue;

    const email = row.email ? String(row.email).trim() : undefined;
    if (email && !email.includes('@')) continue;

    const suggestion: StakeholderAutofillSuggestion = {
      name,
      sourceExcerpt: row.sourceExcerpt?.trim(),
    };
    if (email) suggestion.email = email;
    const role = row.role ? String(row.role).trim() : '';
    if (role) suggestion.role = role;
    const department = row.department ? String(row.department).trim() : '';
    if (department) suggestion.department = department;
    const linkedinUrl = row.linkedinUrl ? String(row.linkedinUrl).trim() : '';
    if (linkedinUrl) suggestion.linkedinUrl = linkedinUrl;

    const excerpt = suggestion.sourceExcerpt || '';
    const matchedHit = hits.find((h) => excerpt && h.text.includes(excerpt.slice(0, 40)));
    const hit = matchedHit || hits[0];
    if (hit) {
      suggestion.sourceDocumentName = hit.documentName;
      suggestion.sourceChunkIndex = hit.chunkIndex;
    }

    suggestions.push(suggestion);
  }

  return dedupeStakeholders(suggestions);
}
