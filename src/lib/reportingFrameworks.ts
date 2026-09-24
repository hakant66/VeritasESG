/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ReportingFrameworkKey =
  | 'ifrs_s1'
  | 'ifrs_s2'
  | 'tsrs_1'
  | 'tsrs_2'
  | 'esrs_csrd'
  | 'gri'
  | 'cdp'
  | 'tcfd';

export type ReportingFramework = {
  key: ReportingFrameworkKey;
  labelEn: string;
  labelTr: string;
};

export const REPORTING_FRAMEWORKS: ReportingFramework[] = [
  { key: 'ifrs_s1', labelEn: 'IFRS S1 — General sustainability-related disclosures', labelTr: 'IFRS S1 — Genel Sürdürülebilirlik Açıklamaları' },
  { key: 'ifrs_s2', labelEn: 'IFRS S2 — Climate-related disclosures', labelTr: 'IFRS S2 — İklimle İlgili Açıklamalar' },
  { key: 'tsrs_1', labelEn: 'TSRS 1 — Türkiye sustainability reporting standard', labelTr: 'TSRS 1 — Türkiye Sürdürülebilirlik Raporlama Standardı' },
  { key: 'tsrs_2', labelEn: 'TSRS 2 — Türkiye climate reporting standard', labelTr: 'TSRS 2 — Türkiye İklim Raporlama Standardı' },
  { key: 'esrs_csrd', labelEn: 'ESRS / CSRD — EU sustainability reporting', labelTr: 'ESRS / CSRD — AB Sürdürülebilirlik Raporlaması' },
  { key: 'gri', labelEn: 'GRI Standards', labelTr: 'GRI Standartları' },
  { key: 'cdp', labelEn: 'CDP climate disclosure', labelTr: 'CDP İklim Açıklaması' },
  { key: 'tcfd', labelEn: 'TCFD recommendations', labelTr: 'TCFD Tavsiyeleri' },
];

export function getReportingFrameworkLabel(key: string, lang: 'tr' | 'en'): string {
  const item = REPORTING_FRAMEWORKS.find((f) => f.key === key);
  if (!item) return key;
  return lang === 'tr' ? item.labelTr : item.labelEn;
}

/** CSRD large company: 2 of 3 thresholds (250 employees, 40M€ turnover, 20M€ assets). */
export function computeCsrdScopeStatus(input: {
  employeeCount?: number;
  turnoverMeur?: number;
  assetsMeur?: number;
  isPie?: boolean;
}): 'in_scope' | 'out_of_scope' | 'pie' {
  if (input.isPie) return 'pie';
  let met = 0;
  if ((input.employeeCount ?? 0) >= 250) met += 1;
  if ((input.turnoverMeur ?? 0) >= 40) met += 1;
  if ((input.assetsMeur ?? 0) >= 20) met += 1;
  return met >= 2 ? 'in_scope' : 'out_of_scope';
}
