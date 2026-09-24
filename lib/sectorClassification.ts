/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NACE Rev.2 ↔ SASB / SICS sector classification.
 *
 * Builtin defaults seed the DB tables (`sasbmacrosectors`, `sasbsubsectors`,
 * `nacecodemappings`). Runtime lookups prefer an active catalog loaded from
 * those tables; builtins remain as fallback when the catalog is empty/offline.
 */

export type SasbMacroSectorId =
  | 'consumer_goods'
  | 'extractives'
  | 'financials'
  | 'food_beverage'
  | 'health_care'
  | 'infrastructure'
  | 'renewable_resources'
  | 'resource_transformation'
  | 'services'
  | 'technology_communications'
  | 'transportation'
  | string;

export type SasbMacroSector = {
  id: SasbMacroSectorId;
  labelEn: string;
  labelTr: string;
  sortOrder?: number;
};

export type SasbSubSector = {
  id: string;
  macroId: SasbMacroSectorId;
  labelEn: string;
  labelTr: string;
  sortOrder?: number;
};

export type NaceEntry = {
  code: string;
  descriptionEn: string;
  descriptionTr: string;
  sasbSubSectorId: string;
  sortOrder?: number;
};

export type SectorClassificationCatalog = {
  macros: SasbMacroSector[];
  subSectors: SasbSubSector[];
  naceEntries: NaceEntry[];
};

/** Builtin seed / fallback catalog (copied into DB on boot when empty). */
export const SASB_MACRO_SECTORS: SasbMacroSector[] = [
  { id: 'consumer_goods', labelEn: 'Consumer Goods', labelTr: 'Tüketici Ürünleri', sortOrder: 0 },
  { id: 'extractives', labelEn: 'Extractives & Minerals Processing', labelTr: 'Madencilik ve Mineral İşleme', sortOrder: 1 },
  { id: 'financials', labelEn: 'Financials', labelTr: 'Finansal Hizmetler', sortOrder: 2 },
  { id: 'food_beverage', labelEn: 'Food & Beverage', labelTr: 'Gıda ve İçecek', sortOrder: 3 },
  { id: 'health_care', labelEn: 'Health Care', labelTr: 'Sağlık Hizmetleri', sortOrder: 4 },
  { id: 'infrastructure', labelEn: 'Infrastructure', labelTr: 'Altyapı', sortOrder: 5 },
  { id: 'renewable_resources', labelEn: 'Renewable Resources & Alternative Energy', labelTr: 'Yenilenebilir Kaynaklar ve Alternatif Enerji', sortOrder: 6 },
  { id: 'resource_transformation', labelEn: 'Resource Transformation', labelTr: 'Kaynak Dönüşümü', sortOrder: 7 },
  { id: 'services', labelEn: 'Services', labelTr: 'Hizmetler', sortOrder: 8 },
  { id: 'technology_communications', labelEn: 'Technology & Communications', labelTr: 'Teknoloji ve İletişim', sortOrder: 9 },
  { id: 'transportation', labelEn: 'Transportation', labelTr: 'Ulaştırma', sortOrder: 10 },
];

export const SASB_SUB_SECTORS: SasbSubSector[] = [
  { id: 'TC-HW', macroId: 'technology_communications', labelEn: 'Technology & Communications Hardware', labelTr: 'Teknoloji ve İletişim Donanımı', sortOrder: 0 },
  { id: 'TC-SI', macroId: 'technology_communications', labelEn: 'Software & IT Services', labelTr: 'Yazılım ve BT Hizmetleri', sortOrder: 1 },
  { id: 'TC-TL', macroId: 'technology_communications', labelEn: 'Telecommunication Services', labelTr: 'Telekomünikasyon Hizmetleri', sortOrder: 2 },
  { id: 'TC-SC', macroId: 'technology_communications', labelEn: 'Semiconductors', labelTr: 'Yarı İletkenler', sortOrder: 3 },
  { id: 'RT-CH', macroId: 'resource_transformation', labelEn: 'Chemicals', labelTr: 'Kimyasallar', sortOrder: 0 },
  { id: 'RT-IG', macroId: 'resource_transformation', labelEn: 'Industrial Goods & Machinery', labelTr: 'Endüstriyel Ürünler ve Makine', sortOrder: 1 },
  { id: 'RT-AE', macroId: 'resource_transformation', labelEn: 'Aerospace & Defense', labelTr: 'Havacılık ve Savunma', sortOrder: 2 },
  { id: 'RT-AP', macroId: 'resource_transformation', labelEn: 'Auto Parts', labelTr: 'Otomotiv Yan Sanayi', sortOrder: 3 },
  { id: 'RT-AV', macroId: 'resource_transformation', labelEn: 'Automobiles', labelTr: 'Otomotiv', sortOrder: 4 },
  { id: 'EM-CO', macroId: 'extractives', labelEn: 'Coal Operations', labelTr: 'Kömür İşletmeleri', sortOrder: 0 },
  { id: 'EM-EP', macroId: 'extractives', labelEn: 'Oil & Gas – Exploration & Production', labelTr: 'Petrol ve Gaz – Arama ve Üretim', sortOrder: 1 },
  { id: 'EM-MM', macroId: 'extractives', labelEn: 'Metals & Mining', labelTr: 'Metal ve Madencilik', sortOrder: 2 },
  { id: 'EM-RM', macroId: 'extractives', labelEn: 'Oil & Gas – Refining & Marketing', labelTr: 'Petrol ve Gaz – Arıtma ve Pazarlama', sortOrder: 3 },
  { id: 'FB-AB', macroId: 'food_beverage', labelEn: 'Agricultural Products', labelTr: 'Tarım Ürünleri', sortOrder: 0 },
  { id: 'FB-FR', macroId: 'food_beverage', labelEn: 'Food Retailers & Distributors', labelTr: 'Gıda Perakendecileri ve Dağıtıcıları', sortOrder: 1 },
  { id: 'FB-PF', macroId: 'food_beverage', labelEn: 'Processed Foods', labelTr: 'İşlenmiş Gıdalar', sortOrder: 2 },
  { id: 'FB-NB', macroId: 'food_beverage', labelEn: 'Non-Alcoholic Beverages', labelTr: 'Alkolsüz İçecekler', sortOrder: 3 },
  { id: 'CG-AA', macroId: 'consumer_goods', labelEn: 'Apparel, Accessories & Footwear', labelTr: 'Giyim, Aksesuar ve Ayakkabı', sortOrder: 0 },
  { id: 'CG-HP', macroId: 'consumer_goods', labelEn: 'Household & Personal Products', labelTr: 'Ev ve Kişisel Bakım Ürünleri', sortOrder: 1 },
  { id: 'FN-CB', macroId: 'financials', labelEn: 'Commercial Banks', labelTr: 'Ticari Bankalar', sortOrder: 0 },
  { id: 'FN-IN', macroId: 'financials', labelEn: 'Insurance', labelTr: 'Sigorta', sortOrder: 1 },
  { id: 'HC-BP', macroId: 'health_care', labelEn: 'Biotechnology & Pharmaceuticals', labelTr: 'Biyoteknoloji ve İlaç', sortOrder: 0 },
  { id: 'HC-DY', macroId: 'health_care', labelEn: 'Health Care Delivery', labelTr: 'Sağlık Hizmeti Sunumu', sortOrder: 1 },
  { id: 'IF-EU', macroId: 'infrastructure', labelEn: 'Electric Utilities & Power Generators', labelTr: 'Elektrik Şebekesi ve Üreticiler', sortOrder: 0 },
  { id: 'IF-RE', macroId: 'infrastructure', labelEn: 'Real Estate', labelTr: 'Gayrimenkul', sortOrder: 1 },
  { id: 'RR-FM', macroId: 'renewable_resources', labelEn: 'Forestry Management', labelTr: 'Orman Yönetimi', sortOrder: 0 },
  { id: 'RR-ST', macroId: 'renewable_resources', labelEn: 'Solar Technology & Project Developers', labelTr: 'Güneş Teknolojisi ve Proje Geliştiricileri', sortOrder: 1 },
  { id: 'SV-ED', macroId: 'services', labelEn: 'Education', labelTr: 'Eğitim', sortOrder: 0 },
  { id: 'SV-PS', macroId: 'services', labelEn: 'Professional & Commercial Services', labelTr: 'Profesyonel ve Ticari Hizmetler', sortOrder: 1 },
  { id: 'TR-AF', macroId: 'transportation', labelEn: 'Air Freight & Logistics', labelTr: 'Hava Kargo ve Lojistik', sortOrder: 0 },
  { id: 'TR-AL', macroId: 'transportation', labelEn: 'Airlines', labelTr: 'Havayolları', sortOrder: 1 },
  { id: 'TR-CR', macroId: 'transportation', labelEn: 'Car Rental & Leasing', labelTr: 'Araç Kiralama ve Leasing', sortOrder: 2 },
];

/** Builtin NACE Rev.2 → SASB SICS rows (first per SICS is preferred default). */
export const NACE_ENTRIES: NaceEntry[] = [
  { code: 'C26', descriptionEn: 'Manufacture of computer, electronic and optical products', descriptionTr: 'Bilgisayarların, Elektronik ve Optik Ürünlerin İmalatı', sasbSubSectorId: 'TC-HW', sortOrder: 0 },
  { code: 'C26.1', descriptionEn: 'Manufacture of electronic components and boards', descriptionTr: 'Elektronik bileşenlerin ve kartların imalatı', sasbSubSectorId: 'TC-HW', sortOrder: 1 },
  { code: 'C26.2', descriptionEn: 'Manufacture of computers and peripheral equipment', descriptionTr: 'Bilgisayar ve çevre birimlerinin imalatı', sasbSubSectorId: 'TC-HW', sortOrder: 2 },
  { code: 'J62', descriptionEn: 'Computer programming, consultancy and related activities', descriptionTr: 'Bilgisayar programlama, danışmanlık ve ilgili faaliyetler', sasbSubSectorId: 'TC-SI', sortOrder: 0 },
  { code: 'J61', descriptionEn: 'Telecommunications', descriptionTr: 'Telekomünikasyon', sasbSubSectorId: 'TC-TL', sortOrder: 0 },
  { code: 'C20', descriptionEn: 'Manufacture of chemicals and chemical products', descriptionTr: 'Kimyasalların ve kimyasal ürünlerin imalatı', sasbSubSectorId: 'RT-CH', sortOrder: 0 },
  { code: 'C21', descriptionEn: 'Manufacture of basic pharmaceutical products', descriptionTr: 'Temel eczacılık ürünlerinin imalatı', sasbSubSectorId: 'HC-BP', sortOrder: 0 },
  { code: 'C28', descriptionEn: 'Manufacture of machinery and equipment n.e.c.', descriptionTr: 'Başka yerde sınıflandırılmamış makine ve ekipman imalatı', sasbSubSectorId: 'RT-IG', sortOrder: 0 },
  { code: 'C29', descriptionEn: 'Manufacture of motor vehicles, trailers and semi-trailers', descriptionTr: 'Motorlu kara taşıtlarının, treyler ve yarı treylerin imalatı', sasbSubSectorId: 'RT-AV', sortOrder: 0 },
  { code: 'C30', descriptionEn: 'Manufacture of other transport equipment', descriptionTr: 'Diğer ulaşım ekipmanlarının imalatı', sasbSubSectorId: 'RT-AE', sortOrder: 0 },
  { code: 'B', descriptionEn: 'Mining and quarrying', descriptionTr: 'Madencilik ve taş ocakçılığı', sasbSubSectorId: 'EM-MM', sortOrder: 0 },
  { code: 'B05', descriptionEn: 'Mining of coal and lignite', descriptionTr: 'Kömür ve linyit madenciliği', sasbSubSectorId: 'EM-CO', sortOrder: 0 },
  { code: 'B06', descriptionEn: 'Extraction of crude petroleum and natural gas', descriptionTr: 'Ham petrol ve doğal gaz çıkarımı', sasbSubSectorId: 'EM-EP', sortOrder: 0 },
  { code: 'C10', descriptionEn: 'Manufacture of food products', descriptionTr: 'Gıda ürünlerinin imalatı', sasbSubSectorId: 'FB-PF', sortOrder: 0 },
  { code: 'C11', descriptionEn: 'Manufacture of beverages', descriptionTr: 'İçeceklerin imalatı', sasbSubSectorId: 'FB-NB', sortOrder: 0 },
  { code: 'A01', descriptionEn: 'Crop and animal production, hunting', descriptionTr: 'Bitkisel ve hayvansal üretim, avcılık', sasbSubSectorId: 'FB-AB', sortOrder: 0 },
  { code: 'C13', descriptionEn: 'Manufacture of textiles', descriptionTr: 'Tekstil ürünlerinin imalatı', sasbSubSectorId: 'CG-AA', sortOrder: 0 },
  { code: 'C14', descriptionEn: 'Manufacture of wearing apparel', descriptionTr: 'Giyim eşyası imalatı', sasbSubSectorId: 'CG-AA', sortOrder: 1 },
  { code: 'C23', descriptionEn: 'Manufacture of other non-metallic mineral products', descriptionTr: 'Diğer metalik olmayan mineral ürünlerin imalatı', sasbSubSectorId: 'RT-CH', sortOrder: 1 },
  { code: 'C24', descriptionEn: 'Manufacture of basic metals', descriptionTr: 'Ana metallerin imalatı', sasbSubSectorId: 'EM-MM', sortOrder: 1 },
  { code: 'C27', descriptionEn: 'Manufacture of electrical equipment', descriptionTr: 'Elektrikli teçhizat imalatı', sasbSubSectorId: 'RT-IG', sortOrder: 1 },
  { code: 'D35', descriptionEn: 'Electricity, gas, steam and air conditioning supply', descriptionTr: 'Elektrik, gaz, buhar ve iklimlendirme temini', sasbSubSectorId: 'IF-EU', sortOrder: 0 },
  { code: 'F41', descriptionEn: 'Construction of buildings', descriptionTr: 'Binaların inşası', sasbSubSectorId: 'IF-RE', sortOrder: 0 },
  { code: 'G46', descriptionEn: 'Wholesale trade', descriptionTr: 'Toptan ticaret', sasbSubSectorId: 'SV-PS', sortOrder: 0 },
  { code: 'G47', descriptionEn: 'Retail trade', descriptionTr: 'Perakende ticaret', sasbSubSectorId: 'FB-FR', sortOrder: 0 },
  { code: 'H49', descriptionEn: 'Land transport and transport via pipelines', descriptionTr: 'Kara taşımacılığı ve boru hatlarıyla taşımacılık', sasbSubSectorId: 'TR-CR', sortOrder: 0 },
  { code: 'H51', descriptionEn: 'Air transport', descriptionTr: 'Hava taşımacılığı', sasbSubSectorId: 'TR-AL', sortOrder: 0 },
  { code: 'K64', descriptionEn: 'Financial service activities', descriptionTr: 'Finansal hizmet faaliyetleri', sasbSubSectorId: 'FN-CB', sortOrder: 0 },
  { code: 'K65', descriptionEn: 'Insurance, reinsurance and pension funding', descriptionTr: 'Sigorta, reasürans ve emeklilik fonları', sasbSubSectorId: 'FN-IN', sortOrder: 0 },
  { code: 'M70', descriptionEn: 'Activities of head offices; management consultancy', descriptionTr: 'Merkez ofis faaliyetleri; yönetim danışmanlığı', sasbSubSectorId: 'SV-PS', sortOrder: 1 },
  { code: 'M71', descriptionEn: 'Architectural and engineering activities', descriptionTr: 'Mimarlık ve mühendislik faaliyetleri', sasbSubSectorId: 'SV-PS', sortOrder: 2 },
  { code: 'P85', descriptionEn: 'Education', descriptionTr: 'Eğitim', sasbSubSectorId: 'SV-ED', sortOrder: 0 },
  { code: 'Q86', descriptionEn: 'Human health activities', descriptionTr: 'İnsan sağlığı faaliyetleri', sasbSubSectorId: 'HC-DY', sortOrder: 0 },
];

export const BUILTIN_SECTOR_CLASSIFICATION_CATALOG: SectorClassificationCatalog = {
  macros: SASB_MACRO_SECTORS,
  subSectors: SASB_SUB_SECTORS,
  naceEntries: NACE_ENTRIES,
};

let activeCatalog: SectorClassificationCatalog = BUILTIN_SECTOR_CLASSIFICATION_CATALOG;

export function setActiveSectorClassificationCatalog(
  catalog: SectorClassificationCatalog | null | undefined,
): void {
  if (
    catalog &&
    catalog.macros.length > 0 &&
    catalog.subSectors.length > 0 &&
    catalog.naceEntries.length > 0
  ) {
    activeCatalog = catalog;
    return;
  }
  activeCatalog = BUILTIN_SECTOR_CLASSIFICATION_CATALOG;
}

export function getActiveSectorClassificationCatalog(): SectorClassificationCatalog {
  return activeCatalog;
}

export function catalogFromRows(input: {
  macros?: Array<Partial<SasbMacroSector> & { id: string }>;
  subSectors?: Array<Partial<SasbSubSector> & { id: string; macroId: string }>;
  naceEntries?: Array<
    Partial<NaceEntry> & { code: string; sasbSubSectorId: string }
  >;
}): SectorClassificationCatalog {
  const macros = (input.macros || [])
    .map((m) => ({
      id: m.id,
      labelEn: String(m.labelEn || m.id),
      labelTr: String(m.labelTr || m.labelEn || m.id),
      sortOrder: typeof m.sortOrder === 'number' ? m.sortOrder : 0,
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id));

  const subSectors = (input.subSectors || [])
    .map((s) => ({
      id: s.id,
      macroId: s.macroId,
      labelEn: String(s.labelEn || s.id),
      labelTr: String(s.labelTr || s.labelEn || s.id),
      sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : 0,
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id));

  const naceEntries = (input.naceEntries || [])
    .map((n) => ({
      code: String(n.code).toUpperCase(),
      descriptionEn: String(n.descriptionEn || ''),
      descriptionTr: String(n.descriptionTr || ''),
      sasbSubSectorId: String(n.sasbSubSectorId),
      sortOrder: typeof n.sortOrder === 'number' ? n.sortOrder : 0,
    }))
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code),
    );

  return { macros, subSectors, naceEntries };
}

export type NaceLookupResult = {
  entry: NaceEntry;
  subSector: SasbSubSector;
  macroSector: SasbMacroSector;
};

export function normalizeNaceCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/** Parse legacy free-text sectoral definition into a NACE-like code if possible. */
export function parseLegacySectoralDefinition(value?: string): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  const naceMatch = trimmed.match(/\b([A-U]\d{1,2}(?:\.\d{1,2})?)\b/i);
  if (naceMatch) return normalizeNaceCode(naceMatch[1]);
  if (/^[A-U]\d/i.test(trimmed)) return normalizeNaceCode(trimmed.split(/[\s,–-]/)[0]);
  return normalizeNaceCode(trimmed);
}

export function lookupNaceCode(
  raw: string,
  catalog: SectorClassificationCatalog = activeCatalog,
): NaceLookupResult | null {
  const code = normalizeNaceCode(raw);
  if (!code) return null;

  const sorted = [...catalog.naceEntries].sort((a, b) => b.code.length - a.code.length);
  const entry =
    sorted.find((e) => e.code === code) ??
    sorted.find((e) => code.startsWith(e.code));

  if (!entry) return null;

  const subSector = catalog.subSectors.find((s) => s.id === entry.sasbSubSectorId);
  if (!subSector) return null;

  const macroSector = catalog.macros.find((m) => m.id === subSector.macroId);
  if (!macroSector) return null;

  return { entry, subSector, macroSector };
}

/** Preferred NACE Rev.2 code for a SASB SICS sub-sector (lowest sortOrder). */
export function getDefaultNaceForSasbSubSector(
  sasbSubSectorId: string,
  catalog: SectorClassificationCatalog = activeCatalog,
): NaceEntry | null {
  const id = sasbSubSectorId.trim();
  if (!id) return null;
  const matches = catalog.naceEntries
    .filter((e) => e.sasbSubSectorId === id)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code),
    );
  return matches[0] ?? null;
}

export function getSubSectorsForMacro(
  macroId: SasbMacroSectorId,
  catalog: SectorClassificationCatalog = activeCatalog,
): SasbSubSector[] {
  return catalog.subSectors
    .filter((s) => s.macroId === macroId)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id),
    );
}

export function getSubSectorById(
  id: string,
  catalog: SectorClassificationCatalog = activeCatalog,
): SasbSubSector | undefined {
  return catalog.subSectors.find((s) => s.id === id);
}

export function getMacroSectorById(
  id: SasbMacroSectorId,
  catalog: SectorClassificationCatalog = activeCatalog,
): SasbMacroSector | undefined {
  return catalog.macros.find((m) => m.id === id);
}

export function buildSectoralDefinitionLegacy(naceCode: string, naceDescription: string): string {
  const code = naceCode.trim();
  const desc = naceDescription.trim();
  if (code && desc) return `${code} — ${desc}`;
  return code || desc;
}

export type SectorClassificationPayload = {
  naceCode: string;
  naceDescription: string;
  sasbMacroSector: string;
  sasbSubSectorSics: string;
  sectoralDefinition: string;
};

export function sectorClassificationFromFormData(formData: FormData): SectorClassificationPayload {
  const naceCode = String(formData.get('naceCode') || '').trim();
  const naceDescription = String(formData.get('naceDescription') || '').trim();
  const sasbMacroSector = String(formData.get('sasbMacroSector') || '').trim();
  const sasbSubSectorSics = String(formData.get('sasbSubSectorSics') || '').trim();
  return {
    naceCode,
    naceDescription,
    sasbMacroSector,
    sasbSubSectorSics,
    sectoralDefinition: buildSectoralDefinitionLegacy(naceCode, naceDescription),
  };
}

export function formatSectorClassificationSummary(customer: {
  naceCode?: string;
  sasbSubSectorSics?: string;
  sectoralDefinition?: string;
}): string {
  const code = customer.naceCode?.trim();
  const sics = customer.sasbSubSectorSics?.trim();
  if (code && sics) return `${code} · ${sics}`;
  if (code) return code;
  if (sics) return sics;
  return customer.sectoralDefinition?.trim() || '';
}
