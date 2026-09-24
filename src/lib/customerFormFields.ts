/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sectorClassificationFromFormData } from '../data/sectorClassification';
import { materialityAssessmentFromFormData } from './materialityAssessment';
import type { Customer, EsgPolicyStatus, EsgSummary } from '../types';
import type { ReportingFrameworkKey } from './reportingFrameworks';

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parsePolicyStatus(value: FormDataEntryValue | null): EsgPolicyStatus {
  const v = String(value ?? '').trim();
  if (v === 'yes' || v === 'no' || v === 'unknown') return v;
  return '';
}

export function taxAndCurrencyFromFormData(formData: FormData) {
  return {
    taxNumber: String(formData.get('taxNumber') ?? '').trim(),
    reportingCurrency: String(formData.get('reportingCurrency') ?? '')
      .trim()
      .toUpperCase(),
  };
}

export function financialDataFromFormData(formData: FormData) {
  return {
    annualTurnoverMeur: parseOptionalNumber(formData.get('annualTurnoverMeur')),
    totalAssetsMeur: parseOptionalNumber(formData.get('totalAssetsMeur')),
  };
}

export function reportingFrameworksFromFormData(formData: FormData): string[] {
  return formData
    .getAll('reportingFrameworkKeys')
    .map((v) => String(v).trim())
    .filter(Boolean) as ReportingFrameworkKey[];
}

export function csrdScopeFromFormData(formData: FormData) {
  return {
    csrdScopeEmployeeCount: parseOptionalNumber(formData.get('csrdScopeEmployeeCount')),
    csrdScopeTurnoverMeur: parseOptionalNumber(formData.get('csrdScopeTurnoverMeur')),
    csrdScopeAssetsMeur: parseOptionalNumber(formData.get('csrdScopeAssetsMeur')),
    isPublicInterestEntity: formData.get('isPublicInterestEntity') === 'on',
  };
}

export function esgSummaryFromFormData(formData: FormData): EsgSummary {
  return {
    reportingBoundaryNote: String(formData.get('esg_reportingBoundaryNote') ?? '').trim(),
    financialYearStart: String(formData.get('esg_financialYearStart') ?? '').trim(),
    financialYearEnd: String(formData.get('esg_financialYearEnd') ?? '').trim(),
    ebitdaMeur: parseOptionalNumber(formData.get('esg_ebitdaMeur')),
    netProfitMeur: parseOptionalNumber(formData.get('esg_netProfitMeur')),
    equityMeur: parseOptionalNumber(formData.get('esg_equityMeur')),
    sustainabilityCapexForecastMeur: parseOptionalNumber(formData.get('esg_sustainabilityCapexForecastMeur')),
    rdExpenditureMeur: parseOptionalNumber(formData.get('esg_rdExpenditureMeur')),
    sustainabilityExecutive: String(formData.get('esg_sustainabilityExecutive') ?? '').trim(),
    businessResilienceAssessment: String(formData.get('esg_businessResilienceAssessment') ?? '').trim(),
    ethicsPolicyStatus: parsePolicyStatus(formData.get('esg_ethicsPolicyStatus')),
    gdprKvkkPolicyStatus: parsePolicyStatus(formData.get('esg_gdprKvkkPolicyStatus')),
    climateRiskInRegister: parsePolicyStatus(formData.get('esg_climateRiskInRegister')),
    electricityMwh: parseOptionalNumber(formData.get('esg_electricityMwh')),
    naturalGasMwh: parseOptionalNumber(formData.get('esg_naturalGasMwh')),
    fuelMwh: parseOptionalNumber(formData.get('esg_fuelMwh')),
    renewableEnergyPercent: parseOptionalNumber(formData.get('esg_renewableEnergyPercent')),
    scope1EmissionsTco2e: parseOptionalNumber(formData.get('esg_scope1EmissionsTco2e')),
    scope2EmissionsTco2e: parseOptionalNumber(formData.get('esg_scope2EmissionsTco2e')),
    scope3EmissionsTco2e: parseOptionalNumber(formData.get('esg_scope3EmissionsTco2e')),
    waterWithdrawalM3: parseOptionalNumber(formData.get('esg_waterWithdrawalM3')),
    wasteRecyclingPercent: parseOptionalNumber(formData.get('esg_wasteRecyclingPercent')),
    ltiFrequencyRate: parseOptionalNumber(formData.get('esg_ltiFrequencyRate')),
    avgTrainingHoursPerEmployee: parseOptionalNumber(formData.get('esg_avgTrainingHoursPerEmployee')),
    femaleManagerPercent: parseOptionalNumber(formData.get('esg_femaleManagerPercent')),
    turnoverPercent: parseOptionalNumber(formData.get('esg_turnoverPercent')),
    supplierSocialAuditStatus: parsePolicyStatus(formData.get('esg_supplierSocialAuditStatus')),
  };
}

export function employeeCountsFromFormData(formData: FormData) {
  return {
    employeeCountTotal: Number(formData.get('employeeCountTotal')) || 0,
    employeeCountBlueCollar: Number(formData.get('employeeCountBlueCollar')) || 0,
    employeeCountWhiteCollar: Number(formData.get('employeeCountWhiteCollar')) || 0,
    employeeCountMale: Number(formData.get('employeeCountMale')) || 0,
    employeeCountFemale: Number(formData.get('employeeCountFemale')) || 0,
    employeeCountPermanent: parseOptionalNumber(formData.get('employeeCountPermanent')),
    employeeCountTemporary: parseOptionalNumber(formData.get('employeeCountTemporary')),
    employeeContractBreakdown: String(formData.get('employeeContractBreakdown') ?? '').trim(),
  };
}

/** Build partial customer update payload from modal form. */
export function customerPayloadFromFormData(
  formData: FormData,
  extras: { logoUrl?: string },
): Partial<Customer> {
  const name = String(formData.get('name') ?? '').trim();
  const legalName = String(formData.get('legalName') ?? '').trim();
  const sectorClassification = sectorClassificationFromFormData(formData);

  return {
    name,
    legalName: legalName || name,
    sectorIds: formData.getAll('sectorIds') as string[],
    address: String(formData.get('address') ?? '').trim(),
    logoUrl: extras.logoUrl ?? '',
    websiteUrl: String(formData.get('websiteUrl') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    brandPortfolio: String(formData.get('brandPortfolio') ?? '').trim(),
    ...sectorClassification,
    headquartersCountry: String(formData.get('headquartersCountry') ?? '').trim(),
    operationGeographies: String(formData.get('operationGeographies') ?? '').trim(),
    ...employeeCountsFromFormData(formData),
    ...taxAndCurrencyFromFormData(formData),
    ...financialDataFromFormData(formData),
    reportingFrameworkKeys: reportingFrameworksFromFormData(formData),
    ...csrdScopeFromFormData(formData),
    esgSummary: esgSummaryFromFormData(formData),
    materialityAssessment: materialityAssessmentFromFormData(formData),
  };
}

export function formatMeurValue(value?: number): string | undefined {
  if (value === undefined || value === null || Number.isNaN(value)) return undefined;
  return `${value} M€`;
}
