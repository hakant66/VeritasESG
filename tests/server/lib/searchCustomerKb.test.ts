import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/lib/llm/llmService.ts', () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3])),
}));

vi.mock('../../../server/lib/rag/qdrantStore.ts', () => ({
  searchKbChunks: vi.fn(async () => [
    {
      id: 'point-1',
      score: 0.91,
      payload: {
        kbId: 'kb-1',
        documentId: 'doc-1',
        documentName: 'Akkim ozet.pdf',
        chunkIndex: 0,
        text: '1400\'ü aşkın çalışanı ile 5 farklı lokasyonda üretim yapan Akkim',
        customerId: 'cust-akkim',
      },
    },
  ]),
}));

import { searchCustomerKbChunks } from '../../../server/lib/rag/searchCustomerKb.ts';
import { embedTexts } from '../../../server/lib/llm/llmService.ts';
import { searchKbChunks } from '../../../server/lib/rag/qdrantStore.ts';

describe('searchCustomerKbChunks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force plain vector retrieval with no rerank, regardless of the
    // developer's local .env: KB_HYBRID_SEARCH_ENABLED=true would otherwise
    // also hit the real Postgres keyword-search path (unmocked, no DB in
    // this project), and a configured COHERE_API_KEY/RERANK_PROVIDER would
    // make a real network call to Cohere and change the mocked score.
    vi.stubEnv('KB_HYBRID_SEARCH_ENABLED', 'false');
    vi.stubEnv('RERANK_PROVIDER', 'none');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('embeds query and searches Qdrant scoped by customerId', async () => {
    const hits = await searchCustomerKbChunks('cust-akkim', 'Akkim kaç çalışan?', 3);

    expect(embedTexts).toHaveBeenCalledWith(['Akkim kaç çalışan?']);
    expect(searchKbChunks).toHaveBeenCalledWith({
      vector: [0.1, 0.2, 0.3],
      customerId: 'cust-akkim',
      limit: 24,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toContain('1400');
    expect(hits[0]?.score).toBeGreaterThan(0.9);
  });

  it('returns empty array for blank query', async () => {
    const hits = await searchCustomerKbChunks('cust-akkim', '   ');
    expect(hits).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });
});
