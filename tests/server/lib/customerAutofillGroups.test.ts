import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_AUTOFILL_GROUP_IDS,
  CUSTOMER_AUTOFILL_GROUPS,
  normalizeAutofillGroupIds,
} from '../../../server/lib/rag/customerAutofillGroups.ts';

describe('normalizeAutofillGroupIds', () => {
  it('returns all groups when input is empty', () => {
    expect(normalizeAutofillGroupIds(undefined)).toEqual(CUSTOMER_AUTOFILL_GROUP_IDS);
    expect(normalizeAutofillGroupIds([])).toEqual(CUSTOMER_AUTOFILL_GROUP_IDS);
  });

  it('filters unknown group ids', () => {
    expect(normalizeAutofillGroupIds(['basic', 'unknown', 'sector'])).toEqual([
      'basic',
      'sector',
    ]);
  });

  it('includes stakeholders group id', () => {
    expect(CUSTOMER_AUTOFILL_GROUP_IDS).toContain('stakeholders');
    expect(normalizeAutofillGroupIds(['stakeholders'])).toEqual(['stakeholders']);
  });

  it('includes facilities group id', () => {
    expect(CUSTOMER_AUTOFILL_GROUP_IDS).toContain('facilities');
    expect(normalizeAutofillGroupIds(['facilities'])).toEqual(['facilities']);
  });

  it('reporting group includes CSRD and framework fields', () => {
    const reporting = CUSTOMER_AUTOFILL_GROUPS.reporting;
    const keys = reporting.fields.map((f) => f.key);
    expect(keys).toContain('reportingFrameworkKeys');
    expect(keys).toContain('csrdScopeEmployeeCount');
    expect(keys).toContain('isPublicInterestEntity');
  });

  it('esg group covers full ESG summary field set', () => {
    const esg = CUSTOMER_AUTOFILL_GROUPS.esg;
    const keys = esg.fields.map((f) => f.key);
    expect(keys).toContain('esg_scope1EmissionsTco2e');
    expect(keys).toContain('esg_ethicsPolicyStatus');
    expect(keys).toContain('esg_financialYearStart');
    expect(keys.length).toBeGreaterThanOrEqual(25);
  });
});
