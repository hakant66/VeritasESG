/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lookupNaceCode, parseLegacySectoralDefinition } from '../data/sectorClassification';
import type { Customer, EsgSummary } from '../types';
import type { CustomerAutofillFieldSuggestion, CustomerAutofillGroupId } from './kbRag';
import { resolvePlatformSectorIds } from './resolvePlatformSectorIds';

export type CustomerAutofillUiScope =
  | 'basic'
  | 'workforce'
  | 'sector'
  | 'stakeholders'
  | 'facilities'
  | 'reporting'
  | 'sustainability'
  | 'all';

export const AUTOFILL_SCOPE_TO_GROUPS: Record<CustomerAutofillUiScope, CustomerAutofillGroupId[]> = {
  basic: ['basic'],
  workforce: ['workforce'],
  sector: ['sector'],
  stakeholders: ['stakeholders'],
  facilities: ['facilities'],
  reporting: ['reporting', 'esg'],
  sustainability: ['esg'],
  all: ['basic', 'workforce', 'sector', 'reporting', 'esg'],
};

export const AUTOFILL_FIELD_LABELS: Record<string, { en: string; tr: string }> = {
  legalName: { en: 'Legal name', tr: 'Ticari ünvan' },
  address: { en: 'Address', tr: 'Adres' },
  websiteUrl: { en: 'Website', tr: 'Web sitesi' },
  description: { en: 'Description', tr: 'Şirket tanımı' },
  brandPortfolio: { en: 'Brand portfolio', tr: 'Marka portföyü' },
  headquartersCountry: { en: 'Headquarters country', tr: 'Merkez ülkesi' },
  taxNumber: { en: 'Tax number', tr: 'Vergi numarası' },
  reportingCurrency: { en: 'Reporting currency', tr: 'Raporlama para birimi' },
  operationGeographies: { en: 'Operation geographies', tr: 'Operasyon coğrafyaları' },
  employeeCountTotal: { en: 'Total employees', tr: 'Toplam çalışan' },
  employeeCountBlueCollar: { en: 'Blue-collar employees', tr: 'Mavi yaka çalışan' },
  employeeCountWhiteCollar: { en: 'White-collar employees', tr: 'Beyaz yaka çalışan' },
  employeeCountMale: { en: 'Male employees', tr: 'Erkek çalışan' },
  employeeCountFemale: { en: 'Female employees', tr: 'Kadın çalışan' },
  employeeContractBreakdown: { en: 'Contract breakdown', tr: 'Sözleşme dağılımı' },
  naceCode: { en: 'NACE code', tr: 'NACE kodu' },
  naceDescription: { en: 'NACE description', tr: 'NACE açıklaması' },
  sectoralDefinition: { en: 'Sector definition', tr: 'Sektör tanımı' },
  sasbMacroSector: { en: 'SASB macro sector', tr: 'SASB makro sektör' },
  sasbSubSectorSics: { en: 'SASB sub-sector', tr: 'SASB alt sektör' },
  sectorIds: { en: 'Platform sectors', tr: 'Platform sektörleri' },
  esg_reportingBoundaryNote: { en: 'Reporting boundary', tr: 'Raporlama sınırı' },
  esg_financialYearStart: { en: 'Financial year start', tr: 'Mali yıl başlangıcı' },
  esg_financialYearEnd: { en: 'Financial year end', tr: 'Mali yıl bitişi' },
  esg_sustainabilityExecutive: { en: 'Sustainability executive', tr: 'Sürdürülebilirlik yöneticisi' },
  esg_businessResilienceAssessment: { en: 'Business resilience', tr: 'İş sürekliliği değerlendirmesi' },
  annualTurnoverMeur: { en: 'Annual turnover (M€)', tr: 'Yıllık ciro (M€)' },
  totalAssetsMeur: { en: 'Total assets (M€)', tr: 'Toplam varlıklar (M€)' },
  esg_ebitdaMeur: { en: 'EBITDA (M€)', tr: 'FAVÖK (M€)' },
  esg_netProfitMeur: { en: 'Net profit (M€)', tr: 'Net kâr (M€)' },
  esg_equityMeur: { en: 'Equity (M€)', tr: 'Özkaynak (M€)' },
  esg_sustainabilityCapexForecastMeur: { en: 'Sustainability capex (M€)', tr: 'Sürdürülebilirlik yatırımı (M€)' },
  esg_rdExpenditureMeur: { en: 'R&D expenditure (M€)', tr: 'Ar-Ge harcaması (M€)' },
  esg_ethicsPolicyStatus: { en: 'Ethics policy', tr: 'Etik politika' },
  esg_gdprKvkkPolicyStatus: { en: 'GDPR / KVKK policy', tr: 'KVKK / GDPR politikası' },
  esg_climateRiskInRegister: { en: 'Climate risk in register', tr: 'İklim riski kaydı' },
  esg_electricityMwh: { en: 'Electricity (MWh)', tr: 'Elektrik (MWh)' },
  esg_naturalGasMwh: { en: 'Natural gas (MWh)', tr: 'Doğal gaz (MWh)' },
  esg_fuelMwh: { en: 'Fuel (MWh)', tr: 'Yakıt (MWh)' },
  esg_renewableEnergyPercent: { en: 'Renewable energy (%)', tr: 'Yenilenebilir enerji (%)' },
  esg_scope1EmissionsTco2e: { en: 'Scope 1 emissions (tCO2e)', tr: 'Kapsam 1 emisyon (tCO2e)' },
  esg_scope2EmissionsTco2e: { en: 'Scope 2 emissions (tCO2e)', tr: 'Kapsam 2 emisyon (tCO2e)' },
  esg_scope3EmissionsTco2e: { en: 'Scope 3 emissions (tCO2e)', tr: 'Kapsam 3 emisyon (tCO2e)' },
  esg_waterWithdrawalM3: { en: 'Water withdrawal (m³)', tr: 'Su çekimi (m³)' },
  esg_wasteRecyclingPercent: { en: 'Waste recycling (%)', tr: 'Atık geri dönüşüm (%)' },
  esg_ltiFrequencyRate: { en: 'LTIFR', tr: 'Kayıp zamanlı yaralanma oranı' },
  esg_avgTrainingHoursPerEmployee: { en: 'Training hours / employee', tr: 'Çalışan başına eğitim saati' },
  esg_femaleManagerPercent: { en: 'Female managers (%)', tr: 'Kadın yönetici (%)' },
  esg_turnoverPercent: { en: 'Employee turnover (%)', tr: 'Çalışan devir hızı (%)' },
  esg_supplierSocialAuditStatus: { en: 'Supplier social audit', tr: 'Tedarikçi sosyal denetimi' },
  reportingFrameworkKeys: { en: 'Reporting frameworks', tr: 'Raporlama çerçeveleri' },
  csrdScopeEmployeeCount: { en: 'CSRD scope — employees', tr: 'CSRD kapsamı — çalışan' },
  csrdScopeTurnoverMeur: { en: 'CSRD scope — turnover (M€)', tr: 'CSRD kapsamı — ciro (M€)' },
  csrdScopeAssetsMeur: { en: 'CSRD scope — assets (M€)', tr: 'CSRD kapsamı — varlık (M€)' },
  isPublicInterestEntity: { en: 'Public-interest entity (PIE)', tr: 'Kamu yararına kuruluş (PIE)' },
};

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value) || value === 0;
  if (typeof value === 'boolean') return false;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function getCustomerFieldValue(customer: Customer, key: string): unknown {
  if (key === 'sectorIds') return customer.sectorIds;
  if (key === 'reportingFrameworkKeys') return customer.reportingFrameworkKeys;
  if (key.startsWith('esg_')) {
    const field = key.replace(/^esg_/, '') as keyof EsgSummary;
    return customer.esgSummary?.[field];
  }
  return (customer as Record<string, unknown>)[key];
}

export function filterSuggestionsForEmptyFields(
  customer: Customer,
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
  onlyEmpty: boolean,
): Record<string, CustomerAutofillFieldSuggestion> {
  if (!onlyEmpty) return { ...suggestions };

  const filtered: Record<string, CustomerAutofillFieldSuggestion> = {};
  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (isEmptyValue(getCustomerFieldValue(customer, key))) {
      filtered[key] = suggestion;
    }
  }
  return filtered;
}

export function enrichAutofillPatch(
  patch: Partial<Customer>,
  suggestions: Record<string, CustomerAutofillFieldSuggestion>,
  sectors: { id: string; name: string }[],
): Partial<Customer> {
  let naceCode = String(patch.naceCode ?? suggestions.naceCode?.value ?? '').trim();
  if (!naceCode) {
    naceCode =
      parseLegacySectoralDefinition(String(patch.sectoralDefinition ?? '')) ||
      parseLegacySectoralDefinition(String(patch.naceDescription ?? suggestions.naceDescription?.value ?? ''));
  }
  const lookup = naceCode ? lookupNaceCode(naceCode) : null;

  if (lookup) {
    patch.naceCode = lookup.entry.code;
    if (!patch.naceDescription) {
      patch.naceDescription = lookup.entry.descriptionTr;
    }
    patch.sasbMacroSector = lookup.macroSector.id;
    patch.sasbSubSectorSics = lookup.subSector.id;
  }

  const sectorIds = resolvePlatformSectorIds(sectors, {
    naceCode: String(patch.naceCode ?? ''),
    naceDescription: String(patch.naceDescription ?? ''),
    sasbSubSectorSics: String(patch.sasbSubSectorSics ?? ''),
    sectoralDefinition: String(patch.sectoralDefinition ?? ''),
  });

  if (sectorIds.length > 0) {
    patch.sectorIds = sectorIds;
  }

  return patch;
}

export function mergeCustomerPatches(
  base: Partial<Customer> | null,
  next: Partial<Customer>,
): Partial<Customer> {
  if (!base) return next;
  return {
    ...base,
    ...next,
    sectorIds: next.sectorIds ?? base.sectorIds,
    reportingFrameworkKeys: next.reportingFrameworkKeys ?? base.reportingFrameworkKeys,
    esgSummary: {
      ...(base.esgSummary || {}),
      ...(next.esgSummary || {}),
    },
  };
}
