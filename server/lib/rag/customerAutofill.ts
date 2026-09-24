/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeReportingFrameworkKeys } from '../../../lib/reportingFrameworkKeys.ts';
import { countKbChunksByCustomer } from '../../data/kbRagDataAccess.ts';
import {
  CUSTOMER_AUTOFILL_GROUPS,
  type CustomerAutofillGroupId,
  type CustomerAutofillGroupSpec,
} from './customerAutofillGroups.ts';
import { generateJsonFromPrompt } from '../llm/llmService.ts';
import { searchCustomerKbChunks, type CustomerKbSearchHit } from './searchCustomerKb.ts';
import {
  extractBranchSuggestions,
  type BranchAutofillSuggestion,
} from './branchAutofill.ts';
import {
  extractStakeholderSuggestions,
  type StakeholderAutofillSuggestion,
} from './stakeholderAutofill.ts';

export type { BranchAutofillSuggestion, StakeholderAutofillSuggestion };

export type CustomerAutofillFieldSuggestion = {
  value: string | number | boolean | string[];
  sourceDocumentName?: string;
  sourceChunkIndex?: number;
  sourceExcerpt?: string;
};

export type CustomerAutofillResult = {
  customerId: string;
  groups: CustomerAutofillGroupId[];
  chunkCount: number;
  suggestions: Record<string, CustomerAutofillFieldSuggestion>;
  stakeholderSuggestions?: StakeholderAutofillSuggestion[];
  branchSuggestions?: BranchAutofillSuggestion[];
  contextChunks: Array<{
    documentName: string;
    chunkIndex: number;
    score: number;
    textPreview: string;
  }>;
};

type GeminiFieldRow = {
  key?: string;
  value?: string | number | boolean | string[] | null;
  sourceExcerpt?: string;
};

type GeminiExtraction = {
  fields?: GeminiFieldRow[];
};

const POLICY_STATUS_VALUES = new Set(['yes', 'no', 'unknown', '']);

function normalizeBooleanField(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'evet') {
    return true;
  }
  if (normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === 'hayır') {
    return false;
  }
  return null;
}

function normalizePolicyStatus(raw: unknown): string | null {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return '';
  if (normalized === 'yes' || normalized === 'evet' || normalized === 'true' || normalized === 'in place') {
    return 'yes';
  }
  if (normalized === 'no' || normalized === 'hayır' || normalized === 'false' || normalized === 'none') {
    return 'no';
  }
  if (normalized === 'unknown' || normalized === 'bilinmiyor' || normalized === 'unclear') {
    return 'unknown';
  }
  return POLICY_STATUS_VALUES.has(normalized) ? normalized : null;
}

function dedupeHits(hits: CustomerKbSearchHit[]) {
  const seen = new Set<string>();
  const unique: CustomerKbSearchHit[] = [];
  for (const hit of hits) {
    const id = `${hit.documentId}:${hit.chunkIndex}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(hit);
  }
  return unique;
}

function buildContextBlock(hits: CustomerKbSearchHit[]) {
  return hits
    .map(
      (hit, idx) =>
        `[Chunk ${idx + 1} | ${hit.documentName} #${hit.chunkIndex} | score ${hit.score.toFixed(3)}]\n${hit.text}`,
    )
    .join('\n\n---\n\n');
}

async function extractGroupFields(
  group: CustomerAutofillGroupSpec,
  hits: CustomerKbSearchHit[],
  customerName: string,
) {
  if (hits.length === 0) return {} as Record<string, CustomerAutofillFieldSuggestion>;

  const fieldLines = group.fields
    .map((f) => `- ${f.key} (${f.type}): ${f.description}`)
    .join('\n');

  const prompt = `You extract structured customer profile fields for a sustainability consultancy platform.

CUSTOMER: ${customerName}
FIELD GROUP: ${group.id}

RULES:
- Use ONLY facts explicitly supported by the SOURCE CHUNKS below.
- If a field is not evidenced, omit it entirely (do not guess).
- Numbers must be numeric JSON values without units.
- For websiteUrl include https:// prefix when missing.
- headquartersCountry should be English country name (e.g. Turkey).
- reportingCurrency must be a 3-letter ISO code.
- policy fields must be one of: yes, no, unknown (or omit if unclear).
- financial year dates must be YYYY-MM-DD.
- frameworks fields must be a JSON array of allowed keys only (omit if none evidenced).
- boolean fields must be true or false.
- Return JSON: { "fields": [ { "key": "...", "value": "...", "sourceExcerpt": "short quote from chunk" } ] }

FIELDS TO EXTRACT:
${fieldLines}

SOURCE CHUNKS:
${buildContextBlock(hits)}`;

  const parsed = await generateJsonFromPrompt<GeminiExtraction>(prompt);
  const rows = Array.isArray(parsed.fields) ? parsed.fields : [];
  const suggestions: Record<string, CustomerAutofillFieldSuggestion> = {};
  for (const row of rows) {
    const key = String(row.key ?? '').trim();
    if (!key) continue;
    const spec = group.fields.find((f) => f.key === key);
    if (!spec) continue;

    const raw = row.value;
    if (raw === null || raw === undefined) continue;
    if (spec.type === 'string' && !String(raw).trim()) continue;
    if (spec.type === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      suggestions[key] = {
        value: n,
        sourceExcerpt: row.sourceExcerpt?.trim(),
      };
      continue;
    }

    if (spec.type === 'policy') {
      const policy = normalizePolicyStatus(raw);
      if (policy === null) continue;
      suggestions[key] = {
        value: policy,
        sourceExcerpt: row.sourceExcerpt?.trim(),
      };
      continue;
    }

    if (spec.type === 'frameworks') {
      const keys = normalizeReportingFrameworkKeys(raw);
      if (keys.length === 0) continue;
      suggestions[key] = {
        value: keys,
        sourceExcerpt: row.sourceExcerpt?.trim(),
      };
      continue;
    }

    if (spec.type === 'boolean') {
      const bool = normalizeBooleanField(raw);
      if (bool === null) continue;
      suggestions[key] = {
        value: bool,
        sourceExcerpt: row.sourceExcerpt?.trim(),
      };
      continue;
    }

    suggestions[key] = {
      value: String(raw).trim(),
      sourceExcerpt: row.sourceExcerpt?.trim(),
    };
  }

  for (const [key, suggestion] of Object.entries(suggestions)) {
    const excerpt = suggestion.sourceExcerpt || '';
    const matchedHit = hits.find((h) => excerpt && h.text.includes(excerpt.slice(0, 40)));
    const fallback = hits[0];
    const hit = matchedHit || fallback;
    if (hit) {
      suggestion.sourceDocumentName = hit.documentName;
      suggestion.sourceChunkIndex = hit.chunkIndex;
    }
  }

  return suggestions;
}

export async function autofillCustomerFromKb(
  customerId: string,
  customerName: string,
  groupIds: CustomerAutofillGroupId[],
): Promise<CustomerAutofillResult> {
  const chunkCount = await countKbChunksByCustomer(customerId);
  if (chunkCount === 0) {
    throw new Error('No indexed knowledge-base documents for this customer');
  }

  const allHits: CustomerKbSearchHit[] = [];
  const mergedSuggestions: Record<string, CustomerAutofillFieldSuggestion> = {};
  let stakeholderSuggestions: StakeholderAutofillSuggestion[] = [];
  let branchSuggestions: BranchAutofillSuggestion[] = [];

  for (const groupId of groupIds) {
    const group = CUSTOMER_AUTOFILL_GROUPS[groupId];
    const hitLimit =
      groupId === 'stakeholders' ||
      groupId === 'esg' ||
      groupId === 'facilities' ||
      groupId === 'reporting'
        ? 6
        : 4;
    const hits = dedupeHits(
      await searchCustomerKbChunks(customerId, group.retrievalQuery, hitLimit),
    );
    allHits.push(...hits);

    if (groupId === 'stakeholders') {
      stakeholderSuggestions = await extractStakeholderSuggestions(hits, customerName);
      continue;
    }

    if (groupId === 'facilities') {
      branchSuggestions = await extractBranchSuggestions(hits, customerName);
      continue;
    }

    const groupSuggestions = await extractGroupFields(group, hits, customerName);
    Object.assign(mergedSuggestions, groupSuggestions);
  }

  const uniqueHits = dedupeHits(allHits)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    customerId,
    groups: groupIds,
    chunkCount,
    suggestions: mergedSuggestions,
    stakeholderSuggestions:
      stakeholderSuggestions.length > 0 ? stakeholderSuggestions : undefined,
    branchSuggestions: branchSuggestions.length > 0 ? branchSuggestions : undefined,
    contextChunks: uniqueHits.map((hit) => ({
      documentName: hit.documentName,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
      textPreview: hit.text.slice(0, 240),
    })),
  };
}
