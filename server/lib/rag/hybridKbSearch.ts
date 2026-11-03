/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getKbRrfK } from '../../../lib/ragSearchConfig.ts';
import { rrfMerge } from '../../../lib/rrfMerge.ts';
import { embedTexts } from '../llm/llmService.ts';
import { searchKbChunks } from './qdrantStore.ts';
import { searchCustomerKbChunksByText, searchKnowledgeKbChunksByText } from './keywordKbSearch.ts';
import type { CustomerKbSearchHit } from './searchCustomerKb.ts';

function hitId(hit: CustomerKbSearchHit): string {
  return `${hit.documentId}:${hit.chunkIndex}`;
}

async function searchCustomerKbChunksByVector(
  customerId: string,
  query: string,
  limit: number,
): Promise<CustomerKbSearchHit[]> {
  const [vector] = await embedTexts([query]);
  if (!vector) return [];

  const hits = await searchKbChunks({
    vector,
    customerId,
    limit,
  });

  return hits.map((hit) => ({
    score: hit.score,
    kbId: hit.payload.kbId,
    documentId: hit.payload.documentId,
    documentName: hit.payload.documentName,
    chunkIndex: hit.payload.chunkIndex,
    text: hit.payload.text,
    customerId: hit.payload.customerId,
    projectId: hit.payload.projectId,
  }));
}

export async function hybridSearchCustomerKbChunks(
  customerId: string,
  query: string,
  limit: number,
): Promise<CustomerKbSearchHit[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const [vectorHits, textHits] = await Promise.all([
    searchCustomerKbChunksByVector(customerId, trimmedQuery, limit),
    searchCustomerKbChunksByText(customerId, trimmedQuery, limit),
  ]);

  const merged = rrfMerge(
    [vectorHits, textHits],
    hitId,
    getKbRrfK(),
  );

  return merged.slice(0, limit);
}

async function searchKnowledgeKbChunksByVector(
  kbIds: string[],
  query: string,
  limit: number,
  options?: { customerId?: string; projectId?: string },
): Promise<CustomerKbSearchHit[]> {
  const [vector] = await embedTexts([query]);
  if (!vector) return [];

  const hits = await searchKbChunks({
    vector,
    kbIds,
    customerId: options?.customerId,
    projectId: options?.projectId,
    limit,
  });

  return hits.map((hit) => ({
    score: hit.score,
    kbId: hit.payload.kbId,
    documentId: hit.payload.documentId,
    documentName: hit.payload.documentName,
    chunkIndex: hit.payload.chunkIndex,
    text: hit.payload.text,
    customerId: hit.payload.customerId,
    projectId: hit.payload.projectId,
  }));
}

/**
 * Same as hybridSearchCustomerKbChunks, scoped by kbIds instead of a single
 * customerId — Knowledge Chat can span multiple KBs. Fixes a real gap: the
 * previous Knowledge Chat retrieval path only ever queried Qdrant directly
 * with no fallback, so on a deployment where VECTOR_BACKEND=pgvector (the
 * default) and Qdrant is simply unused/empty, it silently returned zero
 * hits for every query. The full-text half here doesn't depend on Qdrant
 * or the pgvector embedding column at all, so it still works regardless.
 */
export async function hybridSearchKnowledgeKbChunks(
  kbIds: string[],
  query: string,
  limit: number,
  options?: { customerId?: string; projectId?: string },
): Promise<CustomerKbSearchHit[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const [vectorHits, textHits] = await Promise.all([
    searchKnowledgeKbChunksByVector(kbIds, trimmedQuery, limit, options),
    searchKnowledgeKbChunksByText(kbIds, trimmedQuery, limit, options),
  ]);

  const merged = rrfMerge([vectorHits, textHits], hitId, getKbRrfK());

  return merged.slice(0, limit);
}
