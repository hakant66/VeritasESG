/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getKbRetrieveLimit,
  getRerankTopN,
  isKbHybridSearchEnabled,
  isRerankEnabled,
} from '../../../lib/ragSearchConfig.ts';
import { embedTexts } from '../llm/llmService.ts';
import { hybridSearchKnowledgeKbChunks } from './hybridKbSearch.ts';
import { rerankKbHits } from './rerankKbHits.ts';
import { searchKbChunks } from './qdrantStore.ts';

export type KnowledgeKbSearchHit = {
  score: number;
  kbId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  customerId?: string;
  projectId?: string;
};

async function searchKnowledgeKbChunksVectorOnly(
  kbIds: string[],
  query: string,
  limit: number,
  options?: { customerId?: string; projectId?: string },
): Promise<KnowledgeKbSearchHit[]> {
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
 * Retrieval only (hybrid or vector), mirroring searchCustomerKb.ts's
 * retrieveCustomerKbChunks(). Previously this always went vector-only
 * through Qdrant directly with no fallback — on a VECTOR_BACKEND=pgvector
 * deployment (the default) where Qdrant isn't the active store, that
 * silently returned zero hits for every query. Hybrid adds a full-text
 * fallback that doesn't depend on Qdrant at all.
 */
export async function retrieveKnowledgeKbChunks(
  kbIds: string[],
  query: string,
  limit = 5,
  options?: { customerId?: string; projectId?: string },
): Promise<KnowledgeKbSearchHit[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || kbIds.length === 0) return [];

  if (isKbHybridSearchEnabled()) {
    return hybridSearchKnowledgeKbChunks(kbIds, trimmedQuery, limit, options);
  }

  return searchKnowledgeKbChunksVectorOnly(kbIds, trimmedQuery, limit, options);
}

export async function searchKnowledgeKbChunks(options: {
  query: string;
  kbIds: string[];
  customerId?: string;
  projectId?: string;
  limit?: number;
}): Promise<KnowledgeKbSearchHit[]> {
  const trimmedQuery = options.query.trim();
  const kbIds = options.kbIds.map((id) => String(id).trim()).filter(Boolean);
  if (!trimmedQuery || kbIds.length === 0) return [];

  const limit = options.limit ?? 5;
  const retrieveLimit = getKbRetrieveLimit(limit);
  const topN = getRerankTopN(limit);

  let hits = await retrieveKnowledgeKbChunks(kbIds, trimmedQuery, retrieveLimit, {
    customerId: options.customerId,
    projectId: options.projectId,
  });

  if (isRerankEnabled() && hits.length > 0) {
    hits = (await rerankKbHits(trimmedQuery, hits, topN)) as KnowledgeKbSearchHit[];
  }

  return hits.slice(0, limit);
}
