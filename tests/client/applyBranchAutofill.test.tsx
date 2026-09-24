import { describe, expect, it } from 'vitest';
import { filterBranchSuggestions, isValidBranchName } from '../../src/lib/applyBranchAutofill';
import type { Branch } from '../../src/types';

describe('filterBranchSuggestions', () => {
  const existing: Branch[] = [
    {
      id: 'b1',
      customerId: 'cust-1',
      name: 'Gebze Kimya Tesisi',
      type: 'Factory',
      address: 'Gebze',
      createdAt: 1,
    },
  ];

  it('dedupes suggestions by name', () => {
    const filtered = filterBranchSuggestions(
      [
        { name: 'Düsseldorf Office', type: 'Office' },
        { name: 'Düsseldorf Office', type: 'Office' },
      ],
      [],
      false,
    );
    expect(filtered).toHaveLength(1);
  });

  it('skips existing branches when onlyNew is true', () => {
    const filtered = filterBranchSuggestions(
      [
        { name: 'Gebze Kimya Tesisi', type: 'Factory' },
        { name: 'Yalova Tesisi', type: 'Plant' },
      ],
      existing,
      true,
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('Yalova Tesisi');
  });
});

describe('isValidBranchName', () => {
  it('requires at least two characters', () => {
    expect(isValidBranchName('Gebze Plant')).toBe(true);
    expect(isValidBranchName('A')).toBe(false);
  });
});
