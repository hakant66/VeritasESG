/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CustomerAutofillGroupId =
  | 'basic'
  | 'workforce'
  | 'sector'
  | 'esg'
  | 'reporting'
  | 'stakeholders'
  | 'facilities';

export type CustomerAutofillFieldSpec = {
  key: string;
  type: 'string' | 'number' | 'policy' | 'frameworks' | 'boolean';
  description: string;
};

export type CustomerAutofillGroupSpec = {
  id: CustomerAutofillGroupId;
  retrievalQuery: string;
  fields: CustomerAutofillFieldSpec[];
};

export const CUSTOMER_AUTOFILL_GROUPS: Record<CustomerAutofillGroupId, CustomerAutofillGroupSpec> = {
  basic: {
    id: 'basic',
    retrievalQuery:
      'şirket unvanı ticari ünvan adres genel merkez vergi numarası web sitesi şirket tanımı faaliyet alanı',
    fields: [
      { key: 'legalName', type: 'string', description: 'Legal / trade name of the company' },
      { key: 'address', type: 'string', description: 'Registered headquarters address' },
      { key: 'websiteUrl', type: 'string', description: 'Company website URL (https://...)' },
      { key: 'description', type: 'string', description: 'Brief company overview and mission (2-4 sentences)' },
      { key: 'brandPortfolio', type: 'string', description: 'Brands or product lines owned by the company' },
      { key: 'headquartersCountry', type: 'string', description: 'Headquarters country name in English' },
      { key: 'taxNumber', type: 'string', description: 'Tax identification number' },
      { key: 'reportingCurrency', type: 'string', description: 'Reporting currency ISO code (TRY, EUR, USD)' },
    ],
  },
  workforce: {
    id: 'workforce',
    retrievalQuery:
      'çalışan sayısı personel mavi yaka beyaz yaka kadın erkek operasyon coğrafya üretim lokasyon',
    fields: [
      { key: 'operationGeographies', type: 'string', description: 'Regions/countries where the company operates' },
      { key: 'employeeCountTotal', type: 'number', description: 'Total employee headcount' },
      { key: 'employeeCountBlueCollar', type: 'number', description: 'Blue-collar employee count if stated' },
      { key: 'employeeCountWhiteCollar', type: 'number', description: 'White-collar employee count if stated' },
      { key: 'employeeCountMale', type: 'number', description: 'Male employee count if stated' },
      { key: 'employeeCountFemale', type: 'number', description: 'Female employee count if stated' },
      { key: 'employeeContractBreakdown', type: 'string', description: 'Permanent vs temporary contract breakdown if stated' },
    ],
  },
  sector: {
    id: 'sector',
    retrievalQuery: 'NACE sektör SIC SASB kimya sanayi faaliyet kodu sınıflandırma',
    fields: [
      { key: 'naceCode', type: 'string', description: 'NACE Rev.2 code (e.g. C20)' },
      { key: 'naceDescription', type: 'string', description: 'NACE sector description' },
      { key: 'sectoralDefinition', type: 'string', description: 'Free-text sector / industry definition' },
      { key: 'sasbMacroSector', type: 'string', description: 'SASB macro sector id if clearly inferable, else empty' },
      { key: 'sasbSubSectorSics', type: 'string', description: 'SASB sub-sector / SICS code if stated, else empty' },
    ],
  },
  stakeholders: {
    id: 'stakeholders',
    retrievalQuery:
      'yönetim kurulu başkan üye paydaş iletişim kişi direktör müdür sustainability ESG sorumlu executive chairman board member',
    fields: [],
  },
  facilities: {
    id: 'facilities',
    retrievalQuery:
      'tesis fabrika üretim tesisi şube ofis depo lokasyon plant factory site facility warehouse üretim merkezi Ar-Ge',
    fields: [],
  },
  reporting: {
    id: 'reporting',
    retrievalQuery:
      'raporlama çerçevesi GRI ESRS CSRD TCFD CDP IFRS TSRS sürdürülebilirlik raporu çalışan sayısı ciro varlık kamu yararı kuruluşu kapsam',
    fields: [
      {
        key: 'reportingFrameworkKeys',
        type: 'frameworks',
        description:
          'JSON array of framework keys explicitly referenced: ifrs_s1, ifrs_s2, tsrs_1, tsrs_2, esrs_csrd, gri, cdp, tcfd',
      },
      {
        key: 'csrdScopeEmployeeCount',
        type: 'number',
        description: 'Employee count used for CSRD scope assessment if stated',
      },
      {
        key: 'csrdScopeTurnoverMeur',
        type: 'number',
        description: 'Annual turnover in million EUR for CSRD scope if stated',
      },
      {
        key: 'csrdScopeAssetsMeur',
        type: 'number',
        description: 'Total assets in million EUR for CSRD scope if stated',
      },
      {
        key: 'isPublicInterestEntity',
        type: 'boolean',
        description: 'Whether the company is a listed or public-interest entity (PIE)',
      },
    ],
  },
  esg: {
    id: 'esg',
    retrievalQuery:
      'sürdürülebilirlik ESG raporlama sınırı yönetici finansal performans ciro varlık EBITDA FAVÖK özkaynak yeşil enerji emisyon karbon scope su atık güvenlik eğitim kadın yönetici etik KVKK iklim riski tedarikçi denetim',
    fields: [
      { key: 'esg_reportingBoundaryNote', type: 'string', description: 'ESG reporting boundary note' },
      { key: 'esg_financialYearStart', type: 'string', description: 'Financial year start date (YYYY-MM-DD)' },
      { key: 'esg_financialYearEnd', type: 'string', description: 'Financial year end date (YYYY-MM-DD)' },
      { key: 'annualTurnoverMeur', type: 'number', description: 'Annual turnover in million EUR if stated or convertible' },
      { key: 'totalAssetsMeur', type: 'number', description: 'Total assets in million EUR if stated or convertible' },
      { key: 'esg_ebitdaMeur', type: 'number', description: 'EBITDA in million EUR if stated' },
      { key: 'esg_netProfitMeur', type: 'number', description: 'Net profit in million EUR if stated' },
      { key: 'esg_equityMeur', type: 'number', description: 'Equity in million EUR if stated' },
      { key: 'esg_sustainabilityCapexForecastMeur', type: 'number', description: 'Sustainability capex forecast in million EUR if stated' },
      { key: 'esg_rdExpenditureMeur', type: 'number', description: 'R&D expenditure in million EUR if stated' },
      { key: 'esg_sustainabilityExecutive', type: 'string', description: 'Executive responsible for sustainability' },
      { key: 'esg_businessResilienceAssessment', type: 'string', description: 'Business resilience / risk assessment summary' },
      { key: 'esg_ethicsPolicyStatus', type: 'policy', description: 'Ethics / code of conduct policy in place' },
      { key: 'esg_gdprKvkkPolicyStatus', type: 'policy', description: 'GDPR / KVKK privacy policy in place' },
      { key: 'esg_climateRiskInRegister', type: 'policy', description: 'Climate risk registered in enterprise risk register' },
      { key: 'esg_electricityMwh', type: 'number', description: 'Annual electricity consumption in MWh' },
      { key: 'esg_naturalGasMwh', type: 'number', description: 'Annual natural gas consumption in MWh' },
      { key: 'esg_fuelMwh', type: 'number', description: 'Annual fuel consumption in MWh equivalent' },
      { key: 'esg_renewableEnergyPercent', type: 'number', description: 'Renewable energy share as percentage (0-100)' },
      { key: 'esg_scope1EmissionsTco2e', type: 'number', description: 'Scope 1 GHG emissions in tCO2e' },
      { key: 'esg_scope2EmissionsTco2e', type: 'number', description: 'Scope 2 GHG emissions in tCO2e' },
      { key: 'esg_scope3EmissionsTco2e', type: 'number', description: 'Scope 3 GHG emissions in tCO2e' },
      { key: 'esg_waterWithdrawalM3', type: 'number', description: 'Water withdrawal in cubic metres' },
      { key: 'esg_wasteRecyclingPercent', type: 'number', description: 'Waste recycling rate as percentage (0-100)' },
      { key: 'esg_ltiFrequencyRate', type: 'number', description: 'Lost-time injury frequency rate (LTIFR)' },
      { key: 'esg_avgTrainingHoursPerEmployee', type: 'number', description: 'Average training hours per employee per year' },
      { key: 'esg_femaleManagerPercent', type: 'number', description: 'Female managers as percentage of total managers (0-100)' },
      { key: 'esg_turnoverPercent', type: 'number', description: 'Employee turnover rate as percentage (0-100)' },
      { key: 'esg_supplierSocialAuditStatus', type: 'policy', description: 'Supplier social audit programme in place' },
    ],
  },
};

export const CUSTOMER_AUTOFILL_GROUP_IDS = Object.keys(
  CUSTOMER_AUTOFILL_GROUPS,
) as CustomerAutofillGroupId[];

export function normalizeAutofillGroupIds(
  raw: unknown,
): CustomerAutofillGroupId[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return CUSTOMER_AUTOFILL_GROUP_IDS;
  }
  const allowed = new Set(CUSTOMER_AUTOFILL_GROUP_IDS);
  const picked = raw
    .map((g) => String(g).trim())
    .filter((g): g is CustomerAutofillGroupId => allowed.has(g as CustomerAutofillGroupId));
  return picked.length > 0 ? picked : CUSTOMER_AUTOFILL_GROUP_IDS;
}
