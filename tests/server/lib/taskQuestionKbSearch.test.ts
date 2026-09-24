/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/ragSearchConfig.ts', () => ({
  getKbRetrieveLimit: vi.fn((limit: number) => limit * 2),
  getRerankTopN: vi.fn((limit: number) => Math.min(limit * 2, 12)),
  isKbHybridSearchEnabled: vi.fn(() => false),
  isRerankEnabled: vi.fn(() => true),
}));

import {
  isRerankEnabled,
} from '../../../lib/ragSearchConfig.ts';

vi.mock('../../../server/lib/rag/searchCustomerKb.ts', () => ({
  retrieveCustomerKbChunks: vi.fn(async () => [
    {
      score: 0.85,
      kbId: 'kb-1',
      documentId: 'doc-1',
      documentName: 'Company Info',
      chunkIndex: 0,
      text: 'Headquarters location',
    },
  ]),
}));

vi.mock('../../../server/lib/rag/rerankKbHits.ts', () => ({
  rerankKbHits: vi.fn(async (query: string, hits: any[], topN: number) => {
    return hits.slice(0, topN);
  }),
}));

vi.mock('../../../server/data/kbRagDataAccess.ts', () => ({
  countKbChunksByCustomer: vi.fn(async () => 1),
  searchKbChunksByKeywordRegex: vi.fn(async () => []),
  findKbDocumentsByIds: vi.fn(async () => []),
}));

import {
  buildTaskQuestionSearchQueries,
  isHeadquartersQuestion,
  searchKbHitsForTaskQuestion,
} from '../../../server/lib/rag/taskQuestionKbSearch.ts';
import { rerankKbHits } from '../../../server/lib/rag/rerankKbHits.ts';

describe('taskQuestionKbSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects headquarters questions', () => {
    expect(
      isHeadquartersQuestion({
        soru: 'Şirketin Genel Merkezi nerede açıklayınız.',
      }),
    ).toBe(true);
  });

  it('builds enriched queries for headquarters questions', () => {
    const queries = buildTaskQuestionSearchQueries(
      { soru: 'Şirketin Genel Merkezi nerede açıklayınız.' },
      'Akkim Kimya',
    );
    expect(queries.some((q) => q.includes('genel merkez'))).toBe(true);
    expect(queries.some((q) => q.includes('Akkim'))).toBe(true);
  });

  it('applies final rerank to merged hits when reranking is enabled', async () => {
    const result = await searchKbHitsForTaskQuestion(
      'cust-1',
      { kod: 'Q1', baslik: 'Title', soru: 'Question', aciklama: 'Desc' },
      'Test Company',
      { vectorLimitPerQuery: 6, maxHits: 12 },
    );

    expect(rerankKbHits).toHaveBeenCalled();
    expect(result.hits).toBeDefined();
    expect(Array.isArray(result.hits)).toBe(true);
  });

  it('skips reranking when isRerankEnabled returns false', async () => {
    vi.mocked(isRerankEnabled).mockReturnValue(false);

    const result = await searchKbHitsForTaskQuestion(
      'cust-1',
      { kod: 'Q1', baslik: 'Title', soru: 'Question', aciklama: 'Desc' },
      'Test Company',
    );

    expect(rerankKbHits).not.toHaveBeenCalled();
    expect(result.hits).toBeDefined();
  });
});
