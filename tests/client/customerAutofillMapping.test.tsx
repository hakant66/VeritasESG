import { describe, expect, it } from 'vitest';
import {
  AUTOFILL_SCOPE_TO_GROUPS,
  enrichAutofillPatch,
  filterSuggestionsForEmptyFields,
} from '../../src/lib/customerAutofillMapping';
import type { Customer } from '../../src/types';

const baseCustomer: Customer = {
  id: 'c1',
  name: 'Akkim Kimya',
  sectorIds: [],
  address: 'Existing address',
  createdAt: Date.now(),
  taxNumber: '0110033222',
};

describe('AUTOFILL_SCOPE_TO_GROUPS', () => {
  it('maps sustainability scope to esg group only', () => {
    expect(AUTOFILL_SCOPE_TO_GROUPS.sustainability).toEqual(['esg']);
  });

  it('maps facilities scope to facilities group only', () => {
    expect(AUTOFILL_SCOPE_TO_GROUPS.facilities).toEqual(['facilities']);
  });

  it('maps reporting scope to reporting group only', () => {
    expect(AUTOFILL_SCOPE_TO_GROUPS.reporting).toEqual(['reporting']);
  });
});

describe('filterSuggestionsForEmptyFields', () => {
  it('keeps only empty fields when onlyEmpty is true', () => {
    const filtered = filterSuggestionsForEmptyFields(
      baseCustomer,
      {
        taxNumber: { value: '999' },
        address: { value: 'New address' },
        description: { value: 'Overview' },
      },
      true,
    );
    expect(filtered.taxNumber).toBeUndefined();
    expect(filtered.address).toBeUndefined();
    expect(filtered.description?.value).toBe('Overview');
  });
});

describe('enrichAutofillPatch', () => {
  it('normalizes nace and resolves sectorIds', () => {
    const sectors = [{ id: 'chem-id', name: 'Kimyevi Maddeler' }];
    const patch = enrichAutofillPatch(
      { naceCode: 'C20' },
      {},
      sectors,
    );
    expect(patch.naceCode).toBe('C20');
    expect(patch.sasbSubSectorSics).toBe('RT-CH');
    expect(patch.sectorIds).toEqual(['chem-id']);
  });
});
