/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/ragSearchConfig.ts', () => ({
  getCohereApiKey: vi.fn(() => 'cohere-test-key'),
  getRerankModel: vi.fn(() => 'rerank-v3.5'),
  getRerankProvider: vi.fn(() => 'cohere'),
  isRerankEnabled: vi.fn(() => true),
  getOllamaRerankUrl: vi.fn(() => 'http://127.0.0.1:11434'),
}));

import { rerankKbHits } from '../../../server/lib/rag/rerankKbHits.ts';

describe('rerankKbHits', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls Cohere rerank API and reorders hits by relevance', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.42 },
        ],
      }),
    });

    const hits = [
      {
        score: 0.8,
        kbId: 'kb-1',
        documentId: 'doc-1',
        documentName: 'Doc A',
        chunkIndex: 0,
        text: 'less relevant chunk',
      },
      {
        score: 0.7,
        kbId: 'kb-1',
        documentId: 'doc-2',
        documentName: 'Doc B',
        chunkIndex: 1,
        text: 'headquarters address Istanbul',
      },
    ];

    const reranked = await rerankKbHits('genel merkez adres', hits, 2);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://api.cohere.com/v1/rerank');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('rerank-v3.5');
    expect(body.top_n).toBe(2);
    expect(reranked[0]?.documentName).toBe('Doc B');
    expect(reranked[0]?.score).toBe(0.95);
  });
});
