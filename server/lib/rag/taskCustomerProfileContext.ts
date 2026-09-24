/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type CustomerLean = {
  name?: string;
  legalName?: string;
  address?: string;
  description?: string;
  websiteUrl?: string;
  headquartersCountry?: string;
  sectoralDefinition?: string;
  brandPortfolio?: string;
  naceCode?: string;
  naceDescription?: string;
  isPublicInterestEntity?: boolean;
  reportingFrameworkKeys?: string[];
};

type ProfileField = { key: string; label: string; value: string };

function str(value: unknown): string {
  return String(value ?? '').trim();
}

function profileFieldLabels(lang: 'tr' | 'en'): Record<string, string> {
  if (lang === 'tr') {
    return {
      legalName: 'Yasal unvan',
      address: 'Kayıtlı adres',
      description: 'Şirket tanımı',
      websiteUrl: 'Web sitesi',
      headquartersCountry: 'Genel merkez ülkesi',
      sectoralDefinition: 'Sektör tanımı',
      brandPortfolio: 'Marka portföyü',
      naceCode: 'NACE kodu',
      naceDescription: 'NACE açıklaması',
      isPublicInterestEntity: 'Kamu yararına işlem gören kuruluş',
      reportingFrameworkKeys: 'Raporlama çerçeveleri',
    };
  }
  return {
    legalName: 'Legal name',
    address: 'Registered address',
    description: 'Company description',
    websiteUrl: 'Website',
    headquartersCountry: 'Headquarters country',
    sectoralDefinition: 'Sector definition',
    brandPortfolio: 'Brand portfolio',
    naceCode: 'NACE code',
    naceDescription: 'NACE description',
    isPublicInterestEntity: 'Public interest entity',
    reportingFrameworkKeys: 'Reporting frameworks',
  };
}

export function buildCustomerProfileFields(
  customer: CustomerLean | null | undefined,
  lang: 'tr' | 'en',
): ProfileField[] {
  if (!customer) return [];
  const labels = profileFieldLabels(lang);
  const fields: ProfileField[] = [];

  const push = (key: string, value: string) => {
    if (!value) return;
    fields.push({ key, label: labels[key] || key, value });
  };

  push('legalName', str(customer.legalName));
  push('address', str(customer.address));
  push('description', str(customer.description));
  push('websiteUrl', str(customer.websiteUrl));
  push('headquartersCountry', str(customer.headquartersCountry));
  push('sectoralDefinition', str(customer.sectoralDefinition));
  push('brandPortfolio', str(customer.brandPortfolio));
  push('naceCode', str(customer.naceCode));
  push('naceDescription', str(customer.naceDescription));

  if (customer.isPublicInterestEntity === true) {
    push(
      'isPublicInterestEntity',
      lang === 'tr' ? 'Evet' : 'Yes',
    );
  }

  const frameworks = Array.isArray(customer.reportingFrameworkKeys)
    ? customer.reportingFrameworkKeys.map((k) => str(k)).filter(Boolean)
    : [];
  if (frameworks.length > 0) {
    push('reportingFrameworkKeys', frameworks.join(', '));
  }

  return fields;
}

export function buildCustomerProfileBlock(
  customer: CustomerLean | null | undefined,
  lang: 'tr' | 'en',
): { block: string; fields: ProfileField[] } {
  const fields = buildCustomerProfileFields(customer, lang);
  if (fields.length === 0) {
    return { block: '', fields: [] };
  }

  const header =
    lang === 'tr' ? 'MÜŞTERİ PROFİLİ (platform kayıtları):' : 'CUSTOMER PROFILE (platform records):';
  const lines = fields.map((f) => `- ${f.label}: ${f.value}`);
  return { block: `\n${header}\n${lines.join('\n')}`, fields };
}
