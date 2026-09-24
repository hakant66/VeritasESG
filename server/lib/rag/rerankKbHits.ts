/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getCohereApiKey,
  getOllamaRerankUrl,
  getRerankModel,
  getRerankProvider,
  isRerankEnabled,
} from '../../../lib/ragSearchConfig.ts';
import type { CustomerKbSearchHit } from './searchCustomerKb.ts';
import type { KnowledgeKbSearchHit } from './searchKnowledgeKb.ts';

export type KbSearchHit = CustomerKbSearchHit | KnowledgeKbSearchHit;

type CohereRerankResponse = {
  results?: Array<{
    index: number;
    relevance_score?: number;
  }>;
};

async function rerankWithCohere(
  query: string,
  hits: KbSearchHit[],
  topN: number,
): Promise<KbSearchHit[]> {
  const apiKey = getCohereApiKey();
  if (!apiKey) {
    console.warn('[rerankKbHits] COHERE_API_KEY missing — skipping rerank');
    return hits.slice(0, topN);
  }

  const model = getRerankModel();
  const response = await fetch('https://api.cohere.com/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      query,
      documents: hits.map((hit) => hit.text),
      top_n: topN,
      return_documents: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn('[rerankKbHits] Cohere rerank failed:', response.status, body.slice(0, 300));
    return hits.slice(0, topN);
  }

  const payload = (await response.json()) as CohereRerankResponse;
  const results = payload.results ?? [];
  const reranked: KbSearchHit[] = [];

  for (const result of results) {
    const hit = hits[result.index];
    if (!hit) continue;
    reranked.push({
      ...hit,
      score: Number(result.relevance_score ?? hit.score),
    });
  }

  return reranked.length > 0 ? reranked : hits.slice(0, topN);
}

/**
 * Ollama does not expose a standard cross-encoder rerank API.
 * Attempts /api/rerank when available (some proxies); otherwise preserves order.
 */
async function rerankWithOllama(
  query: string,
  hits: KbSearchHit[],
  topN: number,
): Promise<KbSearchHit[]> {
  const baseUrl = getOllamaRerankUrl().replace(/\/$/, '');
  const model = getRerankModel();

  try {
    const response = await fetch(`${baseUrl}/api/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        query,
        documents: hits.map((hit) => hit.text),
        top_n: topN,
      }),
    });

    if (!response.ok) {
      console.warn(
        '[rerankKbHits] Ollama rerank endpoint unavailable — use Cohere or a dedicated bge-reranker service',
      );
      return hits.slice(0, topN);
    }

    const payload = (await response.json()) as CohereRerankResponse;
    const results = payload.results ?? [];
    const reranked: KbSearchHit[] = [];

    for (const result of results) {
      const hit = hits[result.index];
      if (!hit) continue;
      reranked.push({
        ...hit,
        score: Number(result.relevance_score ?? hit.score),
      });
    }

    return reranked.length > 0 ? reranked : hits.slice(0, topN);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[rerankKbHits] Ollama rerank error:', message);
    return hits.slice(0, topN);
  }
}

export async function rerankKbHits(
  query: string,
  hits: KbSearchHit[],
  topN: number,
): Promise<KbSearchHit[]> {
  if (!isRerankEnabled() || hits.length === 0) {
    return hits.slice(0, topN);
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return hits.slice(0, topN);

  const provider = getRerankProvider();
  if (provider === 'cohere') {
    return rerankWithCohere(trimmedQuery, hits, topN);
  }
  if (provider === 'ollama') {
    return rerankWithOllama(trimmedQuery, hits, topN);
  }

  return hits.slice(0, topN);
}
