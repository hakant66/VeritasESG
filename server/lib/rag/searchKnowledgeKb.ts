/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getKbRetrieveLimit,
  getRerankTopN,
  isRerankEnabled,
} from '../../../lib/ragSearchConfig.ts';
import { embedTexts } from '../llm/llmService.ts';
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

  const [vector] = await embedTexts([trimmedQuery]);
  if (!vector) return [];

  let hits: KnowledgeKbSearchHit[] = (
    await searchKbChunks({
      vector,
      kbIds,
      customerId: options.customerId,
      projectId: options.projectId,
      limit: retrieveLimit,
    })
  ).map((hit) => ({
    score: hit.score,
    kbId: hit.payload.kbId,
    documentId: hit.payload.documentId,
    documentName: hit.payload.documentName,
    chunkIndex: hit.payload.chunkIndex,
    text: hit.payload.text,
    customerId: hit.payload.customerId,
    projectId: hit.payload.projectId,
  }));

  if (isRerankEnabled() && hits.length > 0) {
    hits = (await rerankKbHits(trimmedQuery, hits, topN)) as KnowledgeKbSearchHit[];
  }

  return hits.slice(0, limit);
}
