import { describe, expect, it } from 'vitest';
import {
  countAutofillSuggestions,
  customerPatchFromAutofill,
} from '../../src/lib/applyCustomerAutofill';

describe('customerPatchFromAutofill', () => {
  it('maps flat and esg fields into customer patch', () => {
    const patch = customerPatchFromAutofill({
      taxNumber: { value: '0110033222' },
      employeeCountTotal: { value: 1400 },
      esg_sustainabilityExecutive: { value: 'Jane Doe' },
    });

    expect(patch.taxNumber).toBe('0110033222');
    expect(patch.employeeCountTotal).toBe(1400);
    expect(patch.esgSummary?.sustainabilityExecutive).toBe('Jane Doe');
  });

  it('maps reporting framework keys into string array', () => {
    const patch = customerPatchFromAutofill({
      reportingFrameworkKeys: { value: ['gri', 'esrs_csrd'] },
      isPublicInterestEntity: { value: true },
      csrdScopeEmployeeCount: { value: 1200 },
    });

    expect(patch.reportingFrameworkKeys).toEqual(['gri', 'esrs_csrd']);
    expect(patch.isPublicInterestEntity).toBe(true);
    expect(patch.csrdScopeEmployeeCount).toBe(1200);
  });

  it('counts suggestions', () => {
    expect(
      countAutofillSuggestions({
        a: { value: '1' },
        b: { value: 2 },
      }),
    ).toBe(2);
  });
});
