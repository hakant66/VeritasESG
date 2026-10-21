/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full ESRS Standards catalog, for the per-company "which ESRS standards
 * apply" multi-select on the customer profile (distinct from
 * server/lib/domainEnums.ts's ESRS_TOPICS, which only covers the 10 E/S/G
 * topical standards that get scored in the materiality assessment —
 * ESRS 1 and ESRS 2 are structural/cross-cutting standards, not scored
 * materiality topics, so they don't belong in that list).
 *
 * Each standard can be hidden from the picker via platform Settings
 * (disabledEsrsStandardIds) without affecting standards already recorded on
 * existing customers — see EsrsStandardsPicker.
 */

export type EsrsStandardCategory = 'general' | 'environmental' | 'social' | 'governance';

export type EsrsStandard = {
  id: string;
  code: string;
  nameEn: string;
  nameTr: string;
  category: EsrsStandardCategory;
};

export const ESRS_STANDARDS: EsrsStandard[] = [
  { id: 'esrs_1', code: 'ESRS 1', nameEn: 'General Principles', nameTr: 'Genel İlkeler', category: 'general' },
  { id: 'esrs_2', code: 'ESRS 2', nameEn: 'General Disclosures', nameTr: 'Genel Açıklamalar', category: 'general' },
  { id: 'esrs_e1', code: 'ESRS E1', nameEn: 'Climate Change', nameTr: 'İklim Değişikliği', category: 'environmental' },
  { id: 'esrs_e2', code: 'ESRS E2', nameEn: 'Pollution', nameTr: 'Kirlilik', category: 'environmental' },
  { id: 'esrs_e3', code: 'ESRS E3', nameEn: 'Water & Marine Resources', nameTr: 'Su ve Deniz Kaynakları', category: 'environmental' },
  { id: 'esrs_e4', code: 'ESRS E4', nameEn: 'Biodiversity & Ecosystems', nameTr: 'Biyoçeşitlilik ve Ekosistemler', category: 'environmental' },
  { id: 'esrs_e5', code: 'ESRS E5', nameEn: 'Resource Use & Circular Economy', nameTr: 'Kaynak Kullanımı ve Döngüsel Ekonomi', category: 'environmental' },
  { id: 'esrs_s1', code: 'ESRS S1', nameEn: 'Own Workforce', nameTr: 'Kendi İşgücü', category: 'social' },
  { id: 'esrs_s2', code: 'ESRS S2', nameEn: 'Workers in the Value Chain', nameTr: 'Değer Zinciri İşçileri', category: 'social' },
  { id: 'esrs_s3', code: 'ESRS S3', nameEn: 'Affected Communities', nameTr: 'Etkilenen Topluluklar', category: 'social' },
  { id: 'esrs_s4', code: 'ESRS S4', nameEn: 'Consumers & End-Users', nameTr: 'Tüketiciler ve Kullanıcılar', category: 'social' },
  { id: 'esrs_g1', code: 'ESRS G1', nameEn: 'Business Conduct', nameTr: 'İş Yönetişimi', category: 'governance' },
];

export const ESRS_STANDARD_CATEGORY_ORDER: EsrsStandardCategory[] = [
  'general',
  'environmental',
  'social',
  'governance',
];

export function getEsrsStandardLabel(id: string, lang: 'tr' | 'en'): string {
  const item = ESRS_STANDARDS.find((s) => s.id === id);
  if (!item) return id;
  const name = lang === 'tr' ? item.nameTr : item.nameEn;
  return `${item.code} — ${name}`;
}

export function getEsrsStandardsByCategory(
  category: EsrsStandardCategory,
  disabledIds: string[] = [],
): EsrsStandard[] {
  return ESRS_STANDARDS.filter((s) => s.category === category && !disabledIds.includes(s.id));
}
