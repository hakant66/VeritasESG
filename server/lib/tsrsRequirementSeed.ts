/**
 * TSRS 1 & TSRS 2 framework requirements for the compliance validator.
 *
 * Paragraph refs and dataPointKeys align with the Kimya template tsrs1/tsrs2 columns.
 * Topic names and disclosure titles follow TSRS 1 / TSRS 2 standard structure (PDF).
 */

import { makeTsrsDataPointKey } from './tsrsDataPointKey.ts';

export type TsrsRequirementSeed = {
  frameworkId: 'tsrs_1' | 'tsrs_2';
  frameworkName: string;
  version: string;
  topicId: string;
  topicName: string;
  disclosureId: string;
  disclosureName: string;
  paragraphRef: string;
  dataPointKeys: string[];
  alternateDataKeys?: string[];
  description: string;
  guidance?: string;
  materiality: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  mandatory: boolean;
};

const TSRS_1_FRAMEWORK_NAME = 'TSRS 1 (Sürdürülebilirlik — Genel Hükümler)';
const TSRS_2_FRAMEWORK_NAME = 'TSRS 2 (İklimle İlgili Açıklamalar)';

/** Kimya template tsrs1 refs → TSRS 1 PDF topics */
export const TSRS_1_REQUIREMENT_DEFS: Omit<
  TsrsRequirementSeed,
  'frameworkId' | 'frameworkName' | 'version' | 'dataPointKeys'
>[] = [
  {
    topicId: 'conceptual',
    topicName: 'Kavramsal temeller',
    disclosureId: 'tsrs_1_par_20',
    disclosureName: 'Par.20 — Raporlayan işletme',
    paragraphRef: 'Par.20',
    description:
      'Raporlayan işletmeyi tanımlayın; konsolidasyon kapsamı ve bağlı ortaklıklar dahil raporlama sınırını açıklayın.',
    guidance: 'Kimya şablonundaki genel beyan ve kurumsal kimlik soruları bu paragrafa eşlenir.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'conceptual',
    topicName: 'Kavramsal temeller',
    disclosureId: 'tsrs_1_par_21',
    disclosureName: 'Par.21 — Bağlantılı bilgi',
    paragraphRef: 'Par.21',
    description:
      'Sürdürülebilirlik açıklamalarının finansal tablolar ve diğer genel amaçlı finansal raporlama ile bağlantısını açıklayın.',
    materiality: false,
    priority: 'medium',
    mandatory: true,
  },
  {
    topicId: 'governance',
    topicName: 'Yönetişim',
    disclosureId: 'tsrs_1_par_26',
    disclosureName: 'Par.26 — Yönetişim',
    paragraphRef: 'Par.26',
    description:
      'Sürdürülebilirlikle ilgili risk ve fırsatları izlemek, yönetmek ve denetlemek için kullanılan yönetişim süreçlerini açıklayın.',
    guidance: 'GRI 3-3 konu açıklamaları ve yönetişim politikaları bu paragrafa eşlenir.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'governance',
    topicName: 'Yönetişim',
    disclosureId: 'tsrs_1_par_27a_v',
    disclosureName: 'Par.27a-v — Yönetişim organı sorumlulukları',
    paragraphRef: 'Par.27a-v',
    description: 'Yönetişim organının sürdürülebilirlikle ilgili sorumluluk, yetki ve ücretlendirme bağlantılarını açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'governance',
    topicName: 'Yönetişim',
    disclosureId: 'tsrs_1_par_27b',
    disclosureName: 'Par.27b — Sorumluluk devri',
    paragraphRef: 'Par.27b',
    description: 'Etkilerin yönetilmesine ilişkin sorumluluğun yönetim kademesine nasıl devredildiğini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'strategy',
    topicName: 'Strateji',
    disclosureId: 'tsrs_1_par_28',
    disclosureName: 'Par.28 — Strateji',
    paragraphRef: 'Par.28',
    description:
      'Sürdürülebilirlikle ilgili risk ve fırsatların iş modeli ve strateji üzerindeki etkilerini açıklayın.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'strategy',
    topicName: 'Strateji',
    disclosureId: 'tsrs_1_par_32',
    disclosureName: 'Par.32 — Tedarik zinciri stratejisi',
    paragraphRef: 'Par.32',
    description: 'Değer zinciri boyunca sürdürülebilirlikle ilgili stratejik yaklaşımı açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'strategy',
    topicName: 'Strateji',
    disclosureId: 'tsrs_1_par_33',
    disclosureName: 'Par.33 — Emisyon stratejisi',
    paragraphRef: 'Par.33',
    description: 'Emisyon yönetimi ve iklim stratejisine ilişkin açıklamaları sunun.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'risk',
    topicName: 'Risk yönetimi',
    disclosureId: 'tsrs_1_par_43',
    disclosureName: 'Par.43 — Risk yönetimi',
    paragraphRef: 'Par.43',
    description:
      'Sürdürülebilirlikle ilgili riskleri tanımlama, değerlendirme, önceliklendirme ve izleme süreçlerini açıklayın.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_1_par_44',
    disclosureName: 'Par.44 — Su ve kaynak metrikleri',
    paragraphRef: 'Par.44',
    description: 'Su kaynakları ve ilgili sürdürülebilirlik metriklerini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_1_par_45',
    disclosureName: 'Par.45 — Metrikler ve hedefler',
    paragraphRef: 'Par.45',
    description:
      'Sürdürülebilirlikle ilgili performans metrikleri, hedefler ve ilerleme durumunu açıklayın.',
    guidance: 'Kimya şablonundaki en geniş TSRS 1 eşlemesi; enerji, emisyon ve konu bazlı metrikler.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'general',
    topicName: 'Genel hükümler',
    disclosureId: 'tsrs_1_par_64',
    disclosureName: 'Par.64 — Raporlama zamanı',
    paragraphRef: 'Par.64',
    description: 'Raporlama dönemi, sıklığı ve sürdürülebilirlik raporunun yayın zamanlamasını açıklayın.',
    materiality: false,
    priority: 'medium',
    mandatory: true,
  },
  {
    topicId: 'general',
    topicName: 'Genel hükümler',
    disclosureId: 'tsrs_1_par_83',
    disclosureName: 'Par.83 — Hatalar',
    paragraphRef: 'Par.83',
    description: 'Önceki dönemlere ilişkin hata düzeltmeleri ve yeniden düzenlemeleri açıklayın.',
    materiality: false,
    priority: 'medium',
    mandatory: true,
  },
  {
    topicId: 'annex',
    topicName: 'Ekler',
    disclosureId: 'tsrs_1_ek_d',
    disclosureName: 'Ek D — Niteliksel özellikler',
    paragraphRef: 'Ek D',
    description:
      'Sürdürülebilirlikle ilgili faydalı finansal bilginin niteliksel özelliklerine (anlaşılabilirlik, ilgili, vb.) uyumu açıklayın.',
    materiality: false,
    priority: 'medium',
    mandatory: true,
  },
];

/** Kimya template tsrs2 refs → TSRS 2 PDF topics */
export const TSRS_2_REQUIREMENT_DEFS: Omit<
  TsrsRequirementSeed,
  'frameworkId' | 'frameworkName' | 'version' | 'dataPointKeys'
>[] = [
  {
    topicId: 'governance',
    topicName: 'Yönetişim',
    disclosureId: 'tsrs_2_par_6a_ii',
    disclosureName: 'Par.6(a)(ii) — Yönetişim yetkinliği',
    paragraphRef: 'Par.6a-ii',
    description:
      'Yönetişim organının iklimle ilgili risk ve fırsatlara karşılık vermek için gerekli beceri ve yetkinliklerini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'strategy',
    topicName: 'Strateji',
    disclosureId: 'tsrs_2_par_10',
    disclosureName: 'Par.10 — İklim stratejisi ve dayanıklılık',
    paragraphRef: 'Par.10',
    description:
      'İklimle ilgili risk ve fırsatların strateji ve iş modeli üzerindeki etkileri ile dayanıklılık analizini açıklayın.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'strategy',
    topicName: 'Strateji',
    disclosureId: 'tsrs_2_par_14a',
    disclosureName: 'Par.14(a) — Geçiş planı',
    paragraphRef: 'Par.14a',
    description: 'İklim geçiş planı, azaltım yol haritası ve sermaye tahsisini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'strategy',
    topicName: 'Strateji',
    disclosureId: 'tsrs_2_par_14a_ii',
    disclosureName: 'Par.14(a)(ii) — Geçiş planı detayı',
    paragraphRef: 'Par.14a-ii',
    description: 'Geçiş planının iklim hedefleri ve uygulama adımlarıyla ilişkisini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a',
    disclosureName: 'Par.29(a) — İklim metrikleri (genel)',
    paragraphRef: 'Par.29a',
    description: 'İklimle ilgili metriklerin genel çerçevesini ve raporlama yaklaşımını açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a_i1',
    disclosureName: 'Par.29(a)(i) — Kapsam 1 emisyonları',
    paragraphRef: 'Par.29a-i1',
    description: 'Mutlak Kapsam 1 sera gazı emisyonlarını (tCO2e) açıklayın.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a_i2',
    disclosureName: 'Par.29(a)(ii) — Kapsam 2 emisyonları',
    paragraphRef: 'Par.29a-i2',
    description: 'Mutlak Kapsam 2 sera gazı emisyonlarını (tCO2e) açıklayın.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a_ii',
    disclosureName: 'Par.29(a)(ii) — Emisyon yoğunluğu',
    paragraphRef: 'Par.29a-ii',
    description: 'Emisyon yoğunluğu ve normalleştirme metodolojisini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a_iii',
    disclosureName: 'Par.29(a)(iii) — Emisyon hedefleri',
    paragraphRef: 'Par.29a-iii',
    description: 'İklimle ilgili azaltım hedeflerini ve ilerlemeyi açıklayın.',
    materiality: false,
    priority: 'critical',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a_v',
    disclosureName: 'Par.29(a)(v) — Kapsam 2 (konum bazlı)',
    paragraphRef: 'Par.29a-v',
    description: 'Kapsam 2 emisyonlarının konum ve piyasa bazlı ayrımını açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29a_vi',
    disclosureName: 'Par.29(a)(vi) — Kapsam 3 emisyonları',
    paragraphRef: 'Par.29a-vi',
    description: 'Kapsam 3 (diğer dolaylı) sera gazı emisyonlarını açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29e',
    disclosureName: 'Par.29(e) — Enerji tüketimi',
    paragraphRef: 'Par.29e',
    description: 'Enerji tüketimi ve enerji yoğunluğu metriklerini açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_29g',
    disclosureName: 'Par.29(g) — İklim bağlantılı ücretlendirme',
    paragraphRef: 'Par.29g',
    description: 'İklim hedeflerine bağlı ücretlendirme politikalarını açıklayın.',
    materiality: false,
    priority: 'medium',
    mandatory: true,
  },
  {
    topicId: 'metrics',
    topicName: 'Metrikler ve hedefler',
    disclosureId: 'tsrs_2_par_b27',
    disclosureName: 'Ek B Par.27 — Emisyon hesaplama metodolojisi',
    paragraphRef: 'Par.B27',
    description: 'Sera gazı emisyonlarının hesaplanmasında kullanılan metodoloji ve varsayımları açıklayın.',
    materiality: false,
    priority: 'high',
    mandatory: true,
  },
];

const TSRS_2_ALTERNATE_KEYS: Record<string, string[]> = {
  'Par.29a-i1': ['scope1_emissions'],
  'Par.29a-i2': ['scope2_emissions'],
  'Par.29a-v': ['scope2_emissions'],
  'Par.29a-vi': ['scope3_emissions'],
};

function buildTsrs1Seed(): TsrsRequirementSeed[] {
  return TSRS_1_REQUIREMENT_DEFS.map((def) => ({
    ...def,
    frameworkId: 'tsrs_1',
    frameworkName: TSRS_1_FRAMEWORK_NAME,
    version: '2024',
    dataPointKeys: [makeTsrsDataPointKey('tsrs_1', def.paragraphRef)],
  }));
}

function buildTsrs2Seed(): TsrsRequirementSeed[] {
  return TSRS_2_REQUIREMENT_DEFS.map((def) => ({
    ...def,
    frameworkId: 'tsrs_2',
    frameworkName: TSRS_2_FRAMEWORK_NAME,
    version: '2024',
    dataPointKeys: [makeTsrsDataPointKey('tsrs_2', def.paragraphRef)],
    alternateDataKeys: TSRS_2_ALTERNATE_KEYS[def.paragraphRef],
  }));
}

export const TSRS_FRAMEWORK_REQUIREMENTS_SEED: TsrsRequirementSeed[] = [
  ...buildTsrs1Seed(),
  ...buildTsrs2Seed(),
];

export async function seedTsrsFrameworkRequirements(): Promise<number> {
  const { upsertFrameworkRequirementByDisclosureId } = await import('../data/seedDataAccess.ts');
  let upserted = 0;
  for (const req of TSRS_FRAMEWORK_REQUIREMENTS_SEED) {
    await upsertFrameworkRequirementByDisclosureId(req.disclosureId, req as Record<string, unknown>);
    upserted += 1;
  }
  return upserted;
}
