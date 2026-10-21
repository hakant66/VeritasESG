/**
 * Unit tests for the new Şirket Profili fields (Horizon review, slide 10):
 * public/audit/program flags and the subsidiaries repeatable list, parsed
 * from form data into EsgSummary via esgSummaryFromFormData.
 */
import { describe, expect, it } from 'vitest';
import { esgSummaryFromFormData } from '../../src/lib/customerFormFields';

function formDataFrom(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe('esgSummaryFromFormData — new governance/program fields', () => {
  it('defaults all new boolean flags to false when absent', () => {
    const result = esgSummaryFromFormData(formDataFrom({}));
    expect(result.isPubliclyListed).toBe(false);
    expect(result.isSubjectToIndependentAudit).toBe(false);
    expect(result.isResponsibleProgramMember).toBe(false);
    expect(result.isTurqualityMember).toBe(false);
    expect(result.isTrEtsInScope).toBe(false);
    expect(result.subsidiaries).toEqual([]);
  });

  it('reads true only from the literal "yes" value (YesNoSelect contract)', () => {
    const result = esgSummaryFromFormData(
      formDataFrom({
        esg_isPubliclyListed: 'yes',
        esg_isSubjectToIndependentAudit: 'no',
        esg_isTurqualityMember: 'yes',
      }),
    );
    expect(result.isPubliclyListed).toBe(true);
    expect(result.isSubjectToIndependentAudit).toBe(false);
    expect(result.isTurqualityMember).toBe(true);
  });

  it('parses the subsidiaries JSON payload and drops rows without a legal name', () => {
    const subsidiaries = [
      {
        legalName: 'Horizon Chemicals A.Ş.',
        sasbSubSectorSics: 'RT-CH',
        address: 'Istanbul',
        employeeCount: 42,
        includedInConsolidatedReporting: true,
      },
      { legalName: '', address: 'should be dropped' },
    ];
    const result = esgSummaryFromFormData(
      formDataFrom({ esg_subsidiariesJson: JSON.stringify(subsidiaries) }),
    );
    expect(result.subsidiaries).toHaveLength(1);
    expect(result.subsidiaries?.[0]).toMatchObject({
      legalName: 'Horizon Chemicals A.Ş.',
      sasbSubSectorSics: 'RT-CH',
      address: 'Istanbul',
      employeeCount: 42,
      includedInConsolidatedReporting: true,
    });
  });

  it('tolerates malformed subsidiaries JSON without throwing', () => {
    const result = esgSummaryFromFormData(formDataFrom({ esg_subsidiariesJson: '{not valid json' }));
    expect(result.subsidiaries).toEqual([]);
  });
});
