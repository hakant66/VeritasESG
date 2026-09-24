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
import { hybridSearchCustomerKbChunks } from './hybridKbSearch.ts';
import { rerankKbHits } from './rerankKbHits.ts';
import { searchKbChunks } from './qdrantStore.ts';

export type CustomerKbSearchHit = {
  score: number;
  kbId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  customerId?: string;
  projectId?: string;
};

export type CustomerKbSearchOptions = {
  /** Skip Cohere/Ollama rerank (e.g. multi-query merge before a single final rerank). */
  skipRerank?: boolean;
};

async function searchCustomerKbChunksVectorOnly(
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

/** Retrieval only (hybrid or vector). No rerank. */
export async function retrieveCustomerKbChunks(
  customerId: string,
  query: string,
  limit = 5,
): Promise<CustomerKbSearchHit[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  if (isKbHybridSearchEnabled()) {
    return hybridSearchCustomerKbChunks(customerId, trimmedQuery, limit);
  }

  return searchCustomerKbChunksVectorOnly(customerId, trimmedQuery, limit);
}

export async function searchCustomerKbChunks(
  customerId: string,
  query: string,
  limit = 5,
  options?: CustomerKbSearchOptions,
): Promise<CustomerKbSearchHit[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const retrieveLimit = getKbRetrieveLimit(limit);
  const topN = getRerankTopN(limit);

  let hits = await retrieveCustomerKbChunks(customerId, trimmedQuery, retrieveLimit);

  if (!options?.skipRerank && isRerankEnabled() && hits.length > 0) {
    hits = await rerankKbHits(trimmedQuery, hits, topN);
  }

  return hits.slice(0, limit);
}
