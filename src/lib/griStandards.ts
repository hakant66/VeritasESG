/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full GRI Standards catalog, for the per-company "which GRI standards apply"
 * multi-select on the customer profile (distinct from the coarse
 * reportingFrameworkKeys picker, which only records "GRI" as one umbrella
 * framework among several).
 */

export type GriStandardCategory = 'universal' | 'topic_2024' | 'economic' | 'environmental' | 'social';

export type GriStandard = {
  id: string;
  code: string;
  year: string;
  nameEn: string;
  nameTr: string;
  category: GriStandardCategory;
};

export const GRI_STANDARDS: GriStandard[] = [
  // Universal Standards
  { id: 'gri_1_2021', code: 'GRI 1', year: '2021', nameEn: 'Foundation', nameTr: 'Temel İlkeler', category: 'universal' },
  { id: 'gri_2_2021', code: 'GRI 2', year: '2021', nameEn: 'General Disclosures', nameTr: 'Genel Açıklamalar', category: 'universal' },
  { id: 'gri_3_2021', code: 'GRI 3', year: '2021', nameEn: 'Material Topics', nameTr: 'Önemlilik Konuları', category: 'universal' },

  // New-generation topic standards (2024-2025 restructuring)
  { id: 'gri_101_2024', code: 'GRI 101', year: '2024', nameEn: 'Biodiversity', nameTr: 'Biyoçeşitlilik', category: 'topic_2024' },
  { id: 'gri_102_2025', code: 'GRI 102', year: '2025', nameEn: 'Climate Change', nameTr: 'İklim Değişikliği', category: 'topic_2024' },
  { id: 'gri_103_2025', code: 'GRI 103', year: '2025', nameEn: 'Energy', nameTr: 'Enerji', category: 'topic_2024' },

  // Economic
  { id: 'gri_201_2016', code: 'GRI 201', year: '2016', nameEn: 'Economic Performance', nameTr: 'Ekonomik Performans', category: 'economic' },
  { id: 'gri_202_2016', code: 'GRI 202', year: '2016', nameEn: 'Market Presence', nameTr: 'Pazar Varlığı', category: 'economic' },
  { id: 'gri_203_2016', code: 'GRI 203', year: '2016', nameEn: 'Indirect Economic Impacts', nameTr: 'Dolaylı Ekonomik Etkiler', category: 'economic' },
  { id: 'gri_204_2016', code: 'GRI 204', year: '2016', nameEn: 'Procurement Practices', nameTr: 'Satın Alma Uygulamaları', category: 'economic' },
  { id: 'gri_205_2016', code: 'GRI 205', year: '2016', nameEn: 'Anti-corruption', nameTr: 'Yolsuzlukla Mücadele', category: 'economic' },
  { id: 'gri_206_2016', code: 'GRI 206', year: '2016', nameEn: 'Anti-competitive Behavior', nameTr: 'Rekabete Aykırı Davranış', category: 'economic' },
  { id: 'gri_207_2019', code: 'GRI 207', year: '2019', nameEn: 'Tax', nameTr: 'Vergi', category: 'economic' },

  // Environmental
  { id: 'gri_301_2016', code: 'GRI 301', year: '2016', nameEn: 'Materials', nameTr: 'Malzemeler', category: 'environmental' },
  { id: 'gri_302_2016', code: 'GRI 302', year: '2016', nameEn: 'Energy', nameTr: 'Enerji', category: 'environmental' },
  { id: 'gri_303_2018', code: 'GRI 303', year: '2018', nameEn: 'Water and Effluents', nameTr: 'Su ve Atık Sular', category: 'environmental' },
  { id: 'gri_304_2016', code: 'GRI 304', year: '2016', nameEn: 'Biodiversity', nameTr: 'Biyoçeşitlilik', category: 'environmental' },
  { id: 'gri_305_2016', code: 'GRI 305', year: '2016', nameEn: 'Emissions', nameTr: 'Emisyonlar', category: 'environmental' },
  { id: 'gri_306_2016', code: 'GRI 306', year: '2016', nameEn: 'Effluents and Waste', nameTr: 'Atık Sular ve Atıklar', category: 'environmental' },
  { id: 'gri_306_2020', code: 'GRI 306', year: '2020', nameEn: 'Waste', nameTr: 'Atık', category: 'environmental' },
  { id: 'gri_308_2016', code: 'GRI 308', year: '2016', nameEn: 'Supplier Environmental Assessment', nameTr: 'Tedarikçi Çevresel Değerlendirmesi', category: 'environmental' },

  // Social
  { id: 'gri_401_2016', code: 'GRI 401', year: '2016', nameEn: 'Employment', nameTr: 'İstihdam', category: 'social' },
  { id: 'gri_402_2016', code: 'GRI 402', year: '2016', nameEn: 'Labor and Management Relations', nameTr: 'İşçi-İşveren İlişkileri', category: 'social' },
  { id: 'gri_403_2018', code: 'GRI 403', year: '2018', nameEn: 'Occupational Health and Safety', nameTr: 'İş Sağlığı ve Güvenliği', category: 'social' },
  { id: 'gri_404_2016', code: 'GRI 404', year: '2016', nameEn: 'Training and Education', nameTr: 'Eğitim ve Öğretim', category: 'social' },
  { id: 'gri_405_2016', code: 'GRI 405', year: '2016', nameEn: 'Diversity and Equal Opportunity', nameTr: 'Çeşitlilik ve Fırsat Eşitliği', category: 'social' },
  { id: 'gri_406_2016', code: 'GRI 406', year: '2016', nameEn: 'Non-discrimination', nameTr: 'Ayrımcılığın Önlenmesi', category: 'social' },
  { id: 'gri_407_2016', code: 'GRI 407', year: '2016', nameEn: 'Freedom of Association and Collective Bargaining', nameTr: 'Örgütlenme ve Toplu Sözleşme Özgürlüğü', category: 'social' },
  { id: 'gri_408_2016', code: 'GRI 408', year: '2016', nameEn: 'Child Labor', nameTr: 'Çocuk İşçiliği', category: 'social' },
  { id: 'gri_409_2016', code: 'GRI 409', year: '2016', nameEn: 'Forced or Compulsory Labor', nameTr: 'Zorla veya Zorunlu Çalıştırma', category: 'social' },
  { id: 'gri_410_2016', code: 'GRI 410', year: '2016', nameEn: 'Security Practices', nameTr: 'Güvenlik Uygulamaları', category: 'social' },
  { id: 'gri_411_2016', code: 'GRI 411', year: '2016', nameEn: 'Rights of Indigenous Peoples', nameTr: 'Yerli Halkların Hakları', category: 'social' },
  { id: 'gri_413_2016', code: 'GRI 413', year: '2016', nameEn: 'Local Communities', nameTr: 'Yerel Topluluklar', category: 'social' },
  { id: 'gri_414_2016', code: 'GRI 414', year: '2016', nameEn: 'Supplier Social Assessment', nameTr: 'Tedarikçi Sosyal Değerlendirmesi', category: 'social' },
  { id: 'gri_415_2016', code: 'GRI 415', year: '2016', nameEn: 'Public Policy', nameTr: 'Kamu Politikası', category: 'social' },
  { id: 'gri_416_2016', code: 'GRI 416', year: '2016', nameEn: 'Customer Health and Safety', nameTr: 'Müşteri Sağlığı ve Güvenliği', category: 'social' },
  { id: 'gri_417_2016', code: 'GRI 417', year: '2016', nameEn: 'Marketing and Labeling', nameTr: 'Pazarlama ve Etiketleme', category: 'social' },
  { id: 'gri_418_2016', code: 'GRI 418', year: '2016', nameEn: 'Customer Privacy', nameTr: 'Müşteri Gizliliği', category: 'social' },
];

export const GRI_STANDARD_CATEGORY_ORDER: GriStandardCategory[] = [
  'universal',
  'topic_2024',
  'economic',
  'environmental',
  'social',
];

export function getGriStandardLabel(id: string, lang: 'tr' | 'en'): string {
  const item = GRI_STANDARDS.find((g) => g.id === id);
  if (!item) return id;
  const name = lang === 'tr' ? item.nameTr : item.nameEn;
  return `${item.code} — ${name} (${item.year})`;
}

export function getGriStandardsByCategory(category: GriStandardCategory): GriStandard[] {
  return GRI_STANDARDS.filter((g) => g.category === category);
}
