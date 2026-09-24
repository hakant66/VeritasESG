import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/lib/llm/llmService.ts', () => ({
  generateJsonFromPrompt: vi.fn(async () => ({
    contacts: [
      {
        name: 'Raif Ali Dinçkök',
        role: 'Yönetim Kurulu Başkanı',
        sourceExcerpt: 'Raif Ali Dinçkök atandı',
      },
      {
        name: 'ESG Contact',
        email: 'esg@akkim.com.tr',
        role: 'Sustainability Director',
        department: 'ESG',
        sourceExcerpt: 'esg@akkim.com.tr',
      },
    ],
  })),
}));

import { extractStakeholderSuggestions } from '../../../server/lib/rag/stakeholderAutofill.ts';
import type { CustomerKbSearchHit } from '../../../server/lib/rag/searchCustomerKb.ts';

const hits: CustomerKbSearchHit[] = [
  {
    score: 0.82,
    kbId: 'kb-1',
    documentId: 'doc-gundem',
    documentName: 'akkimgundem14.pdf',
    chunkIndex: 2,
    text: 'Raif Ali Dinçkök Yönetim Kurulu Başkanı olarak atandı.',
    customerId: 'cust-akkim',
  },
];

describe('extractStakeholderSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deduped stakeholder rows with source metadata', async () => {
    const rows = await extractStakeholderSuggestions(hits, 'Akkim Kimya');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toContain('Raif Ali');
    expect(rows[0]?.sourceDocumentName).toBe('akkimgundem14.pdf');
    expect(rows[1]?.email).toBe('esg@akkim.com.tr');
  });

  it('returns empty array when no hits', async () => {
    expect(await extractStakeholderSuggestions([], 'Akkim')).toEqual([]);
  });
});
