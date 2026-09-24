/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plain domain constants shared across the data-access layer and routes.
 */

export const EMISSION_SCOPE_ENUM = ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'] as const;
export type EmissionScope = (typeof EMISSION_SCOPE_ENUM)[number];

export const METRIC_ENTRY_APPROVAL_STAGES = [
  'DATA_ENTRY',
  'MANAGER_REVIEW',
  'HORIZON_REVIEW',
  'APPROVED',
  'REVISION_REQUESTED',
] as const;
export type MetricEntryApprovalStage = (typeof METRIC_ENTRY_APPROVAL_STAGES)[number];

export const ESRS_TOPICS = [
  { id: 'E1', nameTr: 'İklim Değişikliği',                   nameEn: 'Climate Change',                   category: 'E' },
  { id: 'E2', nameTr: 'Kirlilik',                             nameEn: 'Pollution',                        category: 'E' },
  { id: 'E3', nameTr: 'Su ve Deniz Kaynakları',               nameEn: 'Water & Marine Resources',         category: 'E' },
  { id: 'E4', nameTr: 'Biyoçeşitlilik ve Ekosistemler',       nameEn: 'Biodiversity & Ecosystems',        category: 'E' },
  { id: 'E5', nameTr: 'Kaynak Kullanımı ve Döngüsel Ekonomi', nameEn: 'Resource Use & Circular Economy',  category: 'E' },
  { id: 'S1', nameTr: 'Kendi İşgücü',                         nameEn: 'Own Workforce',                    category: 'S' },
  { id: 'S2', nameTr: 'Değer Zinciri İşçileri',               nameEn: 'Workers in Value Chain',           category: 'S' },
  { id: 'S3', nameTr: 'Etkilenen Topluluklar',                 nameEn: 'Affected Communities',             category: 'S' },
  { id: 'S4', nameTr: 'Tüketiciler ve Kullanıcılar',           nameEn: 'Consumers & End-users',            category: 'S' },
  { id: 'G1', nameTr: 'İş Yönetişimi',                        nameEn: 'Business Conduct',                 category: 'G' },
] as const;

export type EsrsTopicId = (typeof ESRS_TOPICS)[number]['id'];
