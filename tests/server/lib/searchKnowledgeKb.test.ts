import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/ragSearchConfig.ts', () => ({
  getKbRetrieveLimit: vi.fn((limit: number) => Math.max(limit * 3, 24)),
  getRerankTopN: vi.fn((limit: number) => limit * 2),
  isRerankEnabled: vi.fn(() => true),
}));

vi.mock('../../../server/lib/llm/llmService.ts', () => ({
  embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3])),
}));

vi.mock('../../../server/lib/rag/qdrantStore.ts', () => ({
  searchKbChunks: vi.fn(async () => [
    {
      id: 'point-1',
      score: 0.88,
      payload: {
        kbId: 'kb-akkim',
        documentId: 'doc-1',
        documentName: 'Akkim ozet.pdf',
        chunkIndex: 2,
        text: 'Akkim 1400 çalışan ile faaliyet göstermektedir.',
        customerId: 'cust-akkim',
      },
    },
    {
      id: 'point-2',
      score: 0.82,
      payload: {
        kbId: 'kb-akkim',
        documentId: 'doc-2',
        documentName: 'Akkim calisanlar.pdf',
        chunkIndex: 0,
        text: 'Akkim toplam çalışan sayısı 1400 den fazla',
      },
    },
  ]),
}));

vi.mock('../../../server/lib/rag/rerankKbHits.ts', () => ({
  rerankKbHits: vi.fn(async (query: string, hits: any[], topN: number) => {
    return hits.slice(0, topN);
  }),
}));

import { searchKnowledgeKbChunks } from '../../../server/lib/rag/searchKnowledgeKb.ts';
import { embedTexts } from '../../../server/lib/llm/llmService.ts';
import { searchKbChunks } from '../../../server/lib/rag/qdrantStore.ts';
import { rerankKbHits } from '../../../server/lib/rag/rerankKbHits.ts';
import {
  getKbRetrieveLimit,
  getRerankTopN,
  isRerankEnabled,
} from '../../../lib/ragSearchConfig.ts';

describe('searchKnowledgeKbChunks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('embeds query and over-fetches for reranking', async () => {
    const hits = await searchKnowledgeKbChunks({
      query: 'Akkim çalışan sayısı',
      kbIds: ['kb-akkim', 'kb-domain'],
      limit: 4,
    });

    expect(embedTexts).toHaveBeenCalledWith(['Akkim çalışan sayısı']);
    expect(getKbRetrieveLimit).toHaveBeenCalledWith(4);
    expect(searchKbChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        vector: [0.1, 0.2, 0.3],
        kbIds: ['kb-akkim', 'kb-domain'],
        limit: 24,
      }),
    );
    expect(hits).toBeDefined();
  });

  it('calls rerankKbHits when reranking is enabled', async () => {
    vi.mocked(isRerankEnabled).mockReturnValue(true);

    const hits = await searchKnowledgeKbChunks({
      query: 'Akkim çalışan',
      kbIds: ['kb-akkim'],
      limit: 5,
    });

    expect(rerankKbHits).toHaveBeenCalledWith(
      'Akkim çalışan',
      expect.any(Array),
      10,
    );
    expect(hits).toBeDefined();
  });

  it('skips reranking when isRerankEnabled returns false', async () => {
    vi.mocked(isRerankEnabled).mockReturnValue(false);

    const hits = await searchKnowledgeKbChunks({
      query: 'Akkim çalışan',
      kbIds: ['kb-akkim'],
      limit: 5,
    });

    expect(rerankKbHits).not.toHaveBeenCalled();
    expect(hits).toHaveLength(2);
  });

  it('respects final limit parameter and slices results', async () => {
    const hits = await searchKnowledgeKbChunks({
      query: 'test',
      kbIds: ['kb-akkim'],
      limit: 1,
    });

    expect(hits).toHaveLength(1);
  });

  it('uses default limit of 5 when not specified', async () => {
    await searchKnowledgeKbChunks({
      query: 'test',
      kbIds: ['kb-akkim'],
    });

    expect(getKbRetrieveLimit).toHaveBeenCalledWith(5);
    expect(getRerankTopN).toHaveBeenCalledWith(5);
  });

  it('passes optional customer and project filters', async () => {
    await searchKnowledgeKbChunks({
      query: 'emisyon',
      kbIds: ['kb-project'],
      customerId: 'cust-1',
      projectId: 'proj-1',
    });

    expect(searchKbChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        projectId: 'proj-1',
        kbIds: ['kb-project'],
      }),
    );
  });

  it('returns empty array for blank query', async () => {
    const hits = await searchKnowledgeKbChunks({
      query: '   ',
      kbIds: ['kb-1'],
    });

    expect(hits).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  it('returns empty array for missing kbIds', async () => {
    const hits = await searchKnowledgeKbChunks({
      query: 'test',
      kbIds: [],
    });

    expect(hits).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });
});
