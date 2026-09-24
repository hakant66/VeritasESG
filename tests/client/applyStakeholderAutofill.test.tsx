import { describe, expect, it } from 'vitest';
import {
  filterStakeholderSuggestions,
  isValidStakeholderEmail,
} from '../../src/lib/applyStakeholderAutofill';
import type { Contact } from '../../src/types';

describe('filterStakeholderSuggestions', () => {
  const existing: Contact[] = [
    {
      id: 'c1',
      customerId: 'cust-1',
      name: 'Raif Ali Dinçkök',
      email: 'raif@akkim.com.tr',
      role: 'Chairman',
      department: 'Board',
      createdAt: 1,
    },
  ];

  it('dedupes suggestions by email or name', () => {
    const filtered = filterStakeholderSuggestions(
      [
        { name: 'Jane Doe', email: 'jane@example.com', role: 'Director' },
        { name: 'Jane Doe', email: 'jane@example.com', role: 'Director' },
      ],
      [],
      false,
    );
    expect(filtered).toHaveLength(1);
  });

  it('skips existing contacts when onlyNew is true', () => {
    const filtered = filterStakeholderSuggestions(
      [
        { name: 'Raif Ali Dinçkök', role: 'Chairman' },
        { name: 'New Person', email: 'new@example.com', role: 'ESG' },
      ],
      existing,
      true,
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('New Person');
  });
});

describe('isValidStakeholderEmail', () => {
  it('accepts simple valid emails', () => {
    expect(isValidStakeholderEmail('esg@akkim.com.tr')).toBe(true);
    expect(isValidStakeholderEmail('not-an-email')).toBe(false);
  });
});
