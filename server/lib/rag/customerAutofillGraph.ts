/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LangGraph-based variant of customer profile autofill. Same inputs/outputs
 * as autofillCustomerFromKb() (customerAutofill.ts) and reuses its retrieval
 * and extraction logic unchanged — this file only adds the parts a
 * single-shot pipeline can't express: a bounded retrieval retry loop,
 * deterministic citation verification (replacing the fuzzy
 * `text.includes(excerpt.slice(0, 40))` fallback), and a cross-check against
 * the customer's already-saved field values.
 *
 * Runs in-process (no new network hop, no new runtime): the graph's nodes
 * call the same TypeScript functions the single-shot path already uses
 * (searchCustomerKbChunks, extractGroupFields), just orchestrated as a
 * stateful graph instead of a flat loop.
 *
 * Opt-in only — see CUSTOMER_AUTOFILL_ENGINE in kbRagRoute.ts. The default
 * engine (autofillCustomerFromKb) is unchanged.
 */

import { z } from 'zod';
import { END, START, StateGraph } from '@langchain/langgraph';
import {
  CUSTOMER_AUTOFILL_GROUPS,
  type CustomerAutofillGroupId,
  type CustomerAutofillGroupSpec,
} from './customerAutofillGroups.ts';
import {
  dedupeHits,
  extractGroupFields,
  type CustomerAutofillFieldConflict,
  type CustomerAutofillFieldSuggestion,
  type CustomerAutofillResult,
} from './customerAutofill.ts';
import { countKbChunksByCustomer } from '../../data/kbRagDataAccess.ts';
import { searchCustomerKbChunks, type CustomerKbSearchHit } from './searchCustomerKb.ts';
import {
  extractBranchSuggestions,
  type BranchAutofillSuggestion,
} from './branchAutofill.ts';
import {
  extractStakeholderSuggestions,
  type StakeholderAutofillSuggestion,
} from './stakeholderAutofill.ts';

const MAX_RETRIEVAL_RETRIES = 2;

// --- Per-group graph: retrieve -> extract -> verifyCitations -> (retry | crossCheck) ---

const hitSchema = z.custom<CustomerKbSearchHit>();
const suggestionSchema = z.custom<CustomerAutofillFieldSuggestion>();

const GroupState = z.object({
  customerId: z.string(),
  customerName: z.string(),
  existingCustomer: z.record(z.string(), z.unknown()),
  group: z.custom<CustomerAutofillGroupSpec>(),
  hitLimit: z.number(),
  query: z.string(),
  hits: z.array(hitSchema).default([]),
  retryCount: z.number().default(0),
  rawSuggestions: z.record(z.string(), suggestionSchema).default({}),
  verifiedSuggestions: z.record(z.string(), suggestionSchema).default({}),
  conflicts: z.array(z.custom<CustomerAutofillFieldConflict>()).default([]),
});

type GroupStateT = z.infer<typeof GroupState>;

async function retrieveNode(state: GroupStateT) {
  const hits = dedupeHits(await searchCustomerKbChunks(state.customerId, state.query, state.hitLimit));
  return { hits };
}

async function extractNode(state: GroupStateT) {
  if (state.hits.length === 0) return { rawSuggestions: {} };
  const rawSuggestions = await extractGroupFields(state.group, state.hits, state.customerName);
  return { rawSuggestions };
}

/**
 * Deterministic replacement for the single-shot path's fuzzy fallback
 * (`hits.find(h => h.text.includes(excerpt.slice(0, 40))) || hits[0]`):
 * a suggestion is "verified" only if its sourceExcerpt is an actual
 * substring of the SPECIFIC chunk it claims to come from — no slicing,
 * no falling back to an unrelated chunk.
 */
function verifyCitationsNode(state: GroupStateT) {
  const verifiedSuggestions: Record<string, CustomerAutofillFieldSuggestion> = {};
  let unverifiedCount = 0;

  for (const [key, suggestion] of Object.entries(state.rawSuggestions)) {
    const excerpt = (suggestion.sourceExcerpt ?? '').trim();
    const citedHit = state.hits.find(
      (h) => h.documentName === suggestion.sourceDocumentName && h.chunkIndex === suggestion.sourceChunkIndex,
    );
    const verified = Boolean(excerpt) && Boolean(citedHit) && citedHit!.text.includes(excerpt);
    if (verified) {
      verifiedSuggestions[key] = suggestion;
    } else {
      unverifiedCount += 1;
    }
  }

  return { verifiedSuggestions, _unverifiedCount: unverifiedCount } as Partial<GroupStateT> & {
    _unverifiedCount: number;
  };
}

/** Narrows the retrieval query toward the fields that failed verification, and bumps retryCount. */
function reformulateQueryNode(state: GroupStateT) {
  const missingKeys = state.group.fields
    .map((f) => f.key)
    .filter((key) => !(key in state.verifiedSuggestions));
  const missingDescriptions = state.group.fields
    .filter((f) => missingKeys.includes(f.key))
    .map((f) => f.description)
    .join(', ');
  return {
    query: `${state.group.retrievalQuery} ${missingDescriptions}`.trim(),
    retryCount: state.retryCount + 1,
  };
}

function routeAfterVerification(state: GroupStateT): 'reformulateQuery' | 'crossCheck' {
  const unverifiedCount = Object.keys(state.rawSuggestions).length - Object.keys(state.verifiedSuggestions).length;
  if (unverifiedCount > 0 && state.retryCount < MAX_RETRIEVAL_RETRIES) {
    return 'reformulateQuery';
  }
  return 'crossCheck';
}

/** Flags (but keeps) any suggestion that contradicts an already-saved, non-empty field. */
function crossCheckNode(state: GroupStateT) {
  const conflicts: CustomerAutofillFieldConflict[] = [];
  for (const [key, suggestion] of Object.entries(state.verifiedSuggestions)) {
    const existingValue = state.existingCustomer[key];
    const hasExisting =
      existingValue !== undefined &&
      existingValue !== null &&
      !(typeof existingValue === 'string' && existingValue.trim() === '') &&
      !(Array.isArray(existingValue) && existingValue.length === 0);
    if (!hasExisting) continue;

    const same = Array.isArray(suggestion.value)
      ? JSON.stringify([...suggestion.value].sort()) === JSON.stringify([...(existingValue as string[])].sort())
      : suggestion.value === existingValue;
    if (same) continue;

    conflicts.push({
      key,
      existingValue,
      suggestedValue: suggestion.value,
      sourceDocumentName: suggestion.sourceDocumentName,
      sourceChunkIndex: suggestion.sourceChunkIndex,
    });
  }
  return { conflicts };
}

let compiledGroupGraph: ReturnType<typeof buildGroupGraph> | null = null;

function buildGroupGraph() {
  return new StateGraph(GroupState)
    .addNode('retrieve', retrieveNode)
    .addNode('extract', extractNode)
    .addNode('verifyCitations', verifyCitationsNode)
    .addNode('reformulateQuery', reformulateQueryNode)
    .addNode('crossCheck', crossCheckNode)
    .addEdge(START, 'retrieve')
    .addEdge('retrieve', 'extract')
    .addEdge('extract', 'verifyCitations')
    .addConditionalEdges('verifyCitations', routeAfterVerification, {
      reformulateQuery: 'reformulateQuery',
      crossCheck: 'crossCheck',
    })
    .addEdge('reformulateQuery', 'retrieve')
    .addEdge('crossCheck', END)
    .compile();
}

function getGroupGraph() {
  if (!compiledGroupGraph) compiledGroupGraph = buildGroupGraph();
  return compiledGroupGraph;
}

async function runGroupGraph(
  customerId: string,
  customerName: string,
  existingCustomer: Record<string, unknown>,
  group: CustomerAutofillGroupSpec,
  hitLimit: number,
): Promise<{
  hits: CustomerKbSearchHit[];
  suggestions: Record<string, CustomerAutofillFieldSuggestion>;
  conflicts: CustomerAutofillFieldConflict[];
}> {
  const graph = getGroupGraph();
  const result = (await graph.invoke({
    customerId,
    customerName,
    existingCustomer,
    group,
    hitLimit,
    query: group.retrievalQuery,
  })) as GroupStateT;

  return {
    hits: result.hits,
    suggestions: result.verifiedSuggestions,
    conflicts: result.conflicts,
  };
}

// --- Outer orchestration: same group loop/shape as autofillCustomerFromKb(), stakeholders/facilities unchanged ---

export async function autofillCustomerFromKbViaGraph(
  customerId: string,
  existingCustomer: Record<string, unknown>,
  groupIds: CustomerAutofillGroupId[],
): Promise<CustomerAutofillResult> {
  const customerName = String(existingCustomer.name ?? '');
  const chunkCount = await countKbChunksByCustomer(customerId);
  if (chunkCount === 0) {
    throw new Error('No indexed knowledge-base documents for this customer');
  }

  const allHits: CustomerKbSearchHit[] = [];
  const mergedSuggestions: Record<string, CustomerAutofillFieldSuggestion> = {};
  const flaggedConflicts: CustomerAutofillFieldConflict[] = [];
  let stakeholderSuggestions: StakeholderAutofillSuggestion[] = [];
  let branchSuggestions: BranchAutofillSuggestion[] = [];

  for (const groupId of groupIds) {
    const group = CUSTOMER_AUTOFILL_GROUPS[groupId];
    const hitLimit =
      groupId === 'stakeholders' || groupId === 'esg' || groupId === 'facilities' || groupId === 'reporting'
        ? 6
        : 4;

    if (groupId === 'stakeholders') {
      const hits = dedupeHits(await searchCustomerKbChunks(customerId, group.retrievalQuery, hitLimit));
      allHits.push(...hits);
      stakeholderSuggestions = await extractStakeholderSuggestions(hits, customerName);
      continue;
    }

    if (groupId === 'facilities') {
      const hits = dedupeHits(await searchCustomerKbChunks(customerId, group.retrievalQuery, hitLimit));
      allHits.push(...hits);
      branchSuggestions = await extractBranchSuggestions(hits, customerName);
      continue;
    }

    const { hits, suggestions, conflicts } = await runGroupGraph(
      customerId,
      customerName,
      existingCustomer,
      group,
      hitLimit,
    );
    allHits.push(...hits);
    Object.assign(mergedSuggestions, suggestions);
    flaggedConflicts.push(...conflicts);
  }

  const uniqueHits = dedupeHits(allHits)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    customerId,
    groups: groupIds,
    chunkCount,
    engine: 'graph',
    suggestions: mergedSuggestions,
    flaggedConflicts: flaggedConflicts.length > 0 ? flaggedConflicts : undefined,
    stakeholderSuggestions: stakeholderSuggestions.length > 0 ? stakeholderSuggestions : undefined,
    branchSuggestions: branchSuggestions.length > 0 ? branchSuggestions : undefined,
    contextChunks: uniqueHits.map((hit) => ({
      documentName: hit.documentName,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
      textPreview: hit.text.slice(0, 240),
    })),
  };
}
