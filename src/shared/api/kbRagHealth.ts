/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiRequest } from '../../lib/apiClient.ts';

export type KbRagHealthRetrieval = {
  hybridSearchEnabled: boolean;
  rrfK: number;
  retrieveLimit: number;
  rerank: {
    provider: string;
    enabled: boolean;
    model: string;
    cohereApiKeyConfigured: boolean;
    ollamaUrl?: string;
  };
};

export type KbRagHealth = {
  llmEmbedding: boolean;
  llm: {
    textProvider: string;
    embeddingProvider: string;
    textConfigured: boolean;
    embeddingConfigured: boolean;
  };
  redisQueue: boolean;
  qdrant: { url: string; collection: string } | null;
  qdrantError: string | null;
  retrieval: KbRagHealthRetrieval;
};

export async function fetchKbRagHealth(): Promise<KbRagHealth> {
  return apiRequest<KbRagHealth>('/api/kb-rag/health');
}
