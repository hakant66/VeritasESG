/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getKbRrfK } from '../../../lib/ragSearchConfig.ts';
import { rrfMerge } from '../../../lib/rrfMerge.ts';
import { embedTexts } from '../llm/llmService.ts';
import { searchKbChunks } from './qdrantStore.ts';
import { searchCustomerKbChunksByText } from './keywordKbSearch.ts';
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
