import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/lib/llm/llmService.ts', () => ({
  generateJsonFromPrompt: vi.fn(async () => ({
    facilities: [
      {
        name: 'Gebze Kimya Tesisi',
        type: 'Factory',
        address: 'Gebze, Kocaeli, Turkey',
        sourceExcerpt: 'Gebze Kimya Tesisi üretim',
      },
      {
        name: 'Düsseldorf Office',
        type: 'Office',
        address: 'Düsseldorf, Germany',
        sourceExcerpt: 'Düsseldorf Office',
      },
    ],
  })),
}));

import { extractBranchSuggestions } from '../../../server/lib/rag/branchAutofill.ts';
import type { CustomerKbSearchHit } from '../../../server/lib/rag/searchCustomerKb.ts';

const hits: CustomerKbSearchHit[] = [
  {
    score: 0.79,
    kbId: 'kb-1',
    documentId: 'doc-esg',
    documentName: 'sustainability-report.pdf',
    chunkIndex: 4,
    text: 'Gebze Kimya Tesisi ve Düsseldorf Office faaliyet göstermektedir.',
    customerId: 'cust-akkim',
  },
];

describe('extractBranchSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deduped facility rows with source metadata', async () => {
    const rows = await extractBranchSuggestions(hits, 'Akkim Kimya');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toContain('Gebze');
    expect(rows[0]?.sourceDocumentName).toBe('sustainability-report.pdf');
    expect(rows[1]?.type).toBe('Office');
  });

  it('returns empty array when no hits', async () => {
    expect(await extractBranchSuggestions([], 'Akkim')).toEqual([]);
  });
});
