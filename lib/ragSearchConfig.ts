/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RerankProvider = 'none' | 'cohere' | 'ollama';

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return defaultValue;
}

function envInt(name: string, defaultValue: number, min = 1, max = 100): number {
  const raw = process.env[name]?.trim();
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

/** Vector + Postgres keyword search fusion (RRF). Default off — set KB_HYBRID_SEARCH_ENABLED=true. */
export function isKbHybridSearchEnabled(): boolean {
  return envFlag('KB_HYBRID_SEARCH_ENABLED', false);
}

/** Reciprocal-rank fusion constant (typical 60). */
export function getKbRrfK(): number {
  return envInt('KB_RRF_K', 60, 1, 200);
}

/** Candidates retrieved per channel before fusion / rerank. */
export function getKbRetrieveLimit(requestedLimit: number): number {
  const envLimit = envInt('KB_SEARCH_RETRIEVE_LIMIT', 24, 5, 60);
  return Math.max(envLimit, requestedLimit * 3);
}

export function getRerankProvider(): RerankProvider {
  const raw = process.env.RERANK_PROVIDER?.trim().toLowerCase();
  if (raw === 'none' || raw === 'off' || raw === 'false' || raw === '0') return 'none';
  if (raw === 'cohere' || raw === 'ollama') return raw;
  if (getCohereApiKey()) return 'cohere';
  return 'none';
}

export function isRerankEnabled(): boolean {
  return getRerankProvider() !== 'none';
}

export function getRerankModel(): string {
  const provider = getRerankProvider();
  const configured = process.env.RERANK_MODEL?.trim();
  if (configured) return configured;
  if (provider === 'cohere') return 'rerank-v3.5';
  if (provider === 'ollama') return 'bge-reranker-v2-m3';
  return '';
}

export function getRerankTopN(requestedLimit: number): number {
  return envInt('RERANK_TOP_N', Math.max(requestedLimit, 8), 1, 30);
}

export function getCohereApiKey(): string | undefined {
  const key = process.env.COHERE_API_KEY?.trim();
  return key || undefined;
}

export function getOllamaRerankUrl(): string {
  return process.env.OLLAMA_RERANK_URL?.trim() || 'http://127.0.0.1:11434';
}

export function describeLocalRagRetrieval(lang: 'tr' | 'en'): string {
  const hybrid = isKbHybridSearchEnabled();
  const rerank = getRerankProvider();

  if (lang === 'tr') {
    const parts: string[] = [];
    if (hybrid) parts.push('hibrit arama (vektör + metin)');
    else parts.push('vektör arama');
    if (rerank === 'cohere') parts.push(`Cohere rerank (${getRerankModel()})`);
    else if (rerank === 'ollama') parts.push('yerel rerank');
    return parts.join(' · ');
  }

  const parts: string[] = [];
  if (hybrid) parts.push('hybrid search (vector + text)');
  else parts.push('vector search');
  if (rerank === 'cohere') parts.push(`Cohere rerank (${getRerankModel()})`);
  else if (rerank === 'ollama') parts.push('local rerank');
  return parts.join(' · ');
}

export function getRagSearchStatus() {
  const provider = getRerankProvider();
  return {
    hybridSearchEnabled: isKbHybridSearchEnabled(),
    rrfK: getKbRrfK(),
    retrieveLimit: envInt('KB_SEARCH_RETRIEVE_LIMIT', 24, 5, 60),
    rerank: {
      provider,
      enabled: provider !== 'none',
      model: getRerankModel(),
      cohereApiKeyConfigured: Boolean(getCohereApiKey()),
      ollamaUrl: provider === 'ollama' ? getOllamaRerankUrl() : undefined,
    },
  };
}
