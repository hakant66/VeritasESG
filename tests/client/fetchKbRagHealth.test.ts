import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/apiClient', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../../src/lib/apiClient';
import { fetchKbRagHealth } from '../../src/shared/api/kbRagHealth';

describe('fetchKbRagHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests kb-rag health endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      llmEmbedding: true,
      llm: {
        textProvider: 'ollama',
        embeddingProvider: 'ollama',
        textConfigured: true,
        embeddingConfigured: true,
      },
      redisQueue: true,
      qdrant: { url: 'http://qdrant:6333', collection: 'kb_chunks' },
      qdrantError: null,
      retrieval: {
        hybridSearchEnabled: true,
        rrfK: 60,
        retrieveLimit: 24,
        rerank: {
          provider: 'none',
          enabled: false,
          model: '',
          cohereApiKeyConfigured: false,
        },
      },
    });

    const health = await fetchKbRagHealth();

    expect(apiRequest).toHaveBeenCalledWith('/api/kb-rag/health');
    expect(health.retrieval.hybridSearchEnabled).toBe(true);
    expect(health.qdrant?.collection).toBe('kb_chunks');
  });
});
