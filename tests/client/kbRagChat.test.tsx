import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/apiClient', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../../src/lib/apiClient';
import { chatKnowledgeBase } from '../../src/lib/kbRag';

describe('chatKnowledgeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts query and kbIds to the knowledge chat endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      answer: 'Akkim employs over 1,400 people.',
      query: 'How many employees?',
      kbIds: ['kb-akkim'],
      chunkCount: 6,
      sources: [
        {
          documentName: 'Akkim ozet.pdf',
          chunkIndex: 0,
          score: 0.91,
          textPreview: '1400 çalışan',
        },
      ],
    });

    const result = await chatKnowledgeBase({
      query: 'How many employees?',
      kbIds: ['kb-akkim'],
      lang: 'en',
      userContext: { projectName: 'TSRS' },
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/kb-rag/chat', {
      method: 'POST',
      body: JSON.stringify({
        query: 'How many employees?',
        kbIds: ['kb-akkim'],
        lang: 'en',
        userContext: { projectName: 'TSRS' },
      }),
    });
    expect(result.sources).toHaveLength(1);
    expect(result.answer).toContain('1,400');
  });
});
