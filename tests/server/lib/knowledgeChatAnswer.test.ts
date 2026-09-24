import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/data/kbRagDataAccess.ts', () => ({
  countKbChunksByKbIds: vi.fn(async () => 6),
}));

vi.mock('../../../server/lib/rag/searchKnowledgeKb.ts', () => ({
  searchKnowledgeKbChunks: vi.fn(async () => [
    {
      score: 0.92,
      kbId: 'kb-1',
      documentId: 'doc-1',
      documentName: 'Sustainability Report.pdf',
      chunkIndex: 0,
      text: 'Scope 1 emissions totaled 12,400 tCO2e in 2024.',
      customerId: 'cust-1',
    },
  ]),
}));

vi.mock('../../../server/lib/llm/llmService.ts', () => ({
  generateTextFromPrompt: vi.fn(async () => 'Scope 1 emissions were **12,400 tCO2e** in 2024.'),
}));

import { answerKnowledgeChatQuery } from '../../../server/lib/rag/knowledgeChatAnswer.ts';
import { countKbChunksByKbIds } from '../../../server/data/kbRagDataAccess.ts';
import { searchKnowledgeKbChunks } from '../../../server/lib/rag/searchKnowledgeKb.ts';
import { generateTextFromPrompt } from '../../../server/lib/llm/llmService.ts';

describe('answerKnowledgeChatQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns helpful message when no chunks are indexed', async () => {
    vi.mocked(countKbChunksByKbIds).mockResolvedValueOnce(0);

    const result = await answerKnowledgeChatQuery({
      query: 'What are Scope 1 emissions?',
      kbIds: ['kb-1'],
      lang: 'en',
    });

    expect(result.sources).toEqual([]);
    expect(result.answer).toContain('indexed');
    expect(searchKnowledgeKbChunks).not.toHaveBeenCalled();
    expect(generateTextFromPrompt).not.toHaveBeenCalled();
  });

  it('retrieves chunks and generates an answer with sources', async () => {
    const result = await answerKnowledgeChatQuery({
      query: 'Scope 1 emissions?',
      kbIds: ['kb-1'],
      lang: 'en',
      userContext: { projectName: 'TSRS Raporlama' },
    });

    expect(searchKnowledgeKbChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Scope 1 emissions?',
        kbIds: ['kb-1'],
        limit: 8,
      }),
    );
    expect(generateTextFromPrompt).toHaveBeenCalled();
    expect(result.answer).toContain('12,400');
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.documentName).toBe('Sustainability Report.pdf');
  });

  it('returns no-hit message when index exists but search finds nothing', async () => {
    vi.mocked(searchKnowledgeKbChunks).mockResolvedValueOnce([]);

    const result = await answerKnowledgeChatQuery({
      query: 'obscure topic',
      kbIds: ['kb-1'],
      lang: 'tr',
    });

    expect(result.answer).toContain('pasaj');
    expect(result.sources).toEqual([]);
    expect(generateTextFromPrompt).not.toHaveBeenCalled();
  });
});
