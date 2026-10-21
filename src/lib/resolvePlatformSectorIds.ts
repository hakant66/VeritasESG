/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lookupNaceCode, normalizeNaceCode, getSubSectorById } from '../data/sectorClassification';
import {
  DEMO_SECTOR_ROWS,
  legacyCustomerSectorNameToKey,
  type SectorKey,
} from './demoSectorSeed';
import type { Segment } from '../types';

function nf(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SECTOR_KEY_TO_CANONICAL_NAMES: Record<SectorKey, string[]> = {
  export: ['Türkiye İhracatı', 'Turkey Exports'],
  agrifood: ['Tarım ve Gıda Ürünleri', 'Agriculture & Food Products'],
  chem: ['Kimyevi Maddeler', 'Chemicals'],
  auto: ['Otomotiv Endüstrisi', 'Automotive Industry'],
  elec: ['Elektrik Elektronik', 'Electrical & Electronics'],
  machine: ['Makina ve Aksamları', 'Machinery & Components'],
  steel: ['Demir ve Çelik Ürünleri', 'Iron & Steel Products'],
  cement: ['Çimento - Cam - Seramik', 'Cement - Glass - Ceramics'],
  resource_transformation: [
    'Kaynak Dönüşümü (Resource Transformation)',
    'Kaynak Dönüşümü',
    'Resource Transformation',
  ],
  other: ['Diğer', 'Other'],
};

export type SectorResolutionHints = {
  naceCode?: string;
  naceDescription?: string;
  sasbSubSectorSics?: string;
  sectoralDefinition?: string;
};

export function inferSectorKeyFromHints(hints: SectorResolutionHints): SectorKey {
  const naceCode = hints.naceCode?.trim() ? normalizeNaceCode(hints.naceCode) : '';
  const lookup = naceCode ? lookupNaceCode(naceCode) : null;
  // A sub-sector can now be chosen directly, with no NACE code entered at all, so resolve
  // it from the raw SASB hint too, not only from a NACE-derived lookup.
  const subSectorFromHint = hints.sasbSubSectorSics?.trim()
    ? getSubSectorById(hints.sasbSubSectorSics.trim())
    : undefined;
  const subSectorId = lookup?.subSector.id ?? subSectorFromHint?.id;

  const textParts = [
    hints.naceDescription,
    hints.sectoralDefinition,
    lookup?.entry.descriptionTr,
    lookup?.entry.descriptionEn,
    lookup?.subSector.labelTr,
    lookup?.subSector.labelEn,
    subSectorFromHint?.labelTr,
    subSectorFromHint?.labelEn,
  ].filter(Boolean) as string[];

  for (const part of textParts) {
    const key = legacyCustomerSectorNameToKey(part);
    if (key !== 'other') return key;
  }

  if (subSectorId === 'RT-CH') return 'chem';
  if (subSectorId === 'RT-AV' || subSectorId === 'RT-AP') return 'auto';
  if (subSectorId === 'TC-HW' || subSectorId === 'TC-SI') return 'elec';
  if (subSectorId === 'RT-IG') return 'machine';
  if (subSectorId === 'EM-MM') return 'steel';

  return 'other';
}

/** Map NACE / SASB hints to platform Segment ids (checkbox sectorIds). */
export function resolvePlatformSectorIds(
  sectors: Segment[],
  hints: SectorResolutionHints,
): string[] {
  const sectorKey = inferSectorKeyFromHints(hints);
  const canonicalNames = new Set(
    (SECTOR_KEY_TO_CANONICAL_NAMES[sectorKey] || []).map((n) => nf(n)),
  );

  for (const row of DEMO_SECTOR_ROWS.tr) {
    if (row.key === sectorKey) canonicalNames.add(nf(row.name));
  }
  for (const row of DEMO_SECTOR_ROWS.en) {
    if (row.key === sectorKey) canonicalNames.add(nf(row.name));
  }

  const matched = sectors.filter((segment) => {
    const nameNorm = nf(segment.name);
    if (canonicalNames.has(nameNorm)) return true;
    return legacyCustomerSectorNameToKey(segment.name) === sectorKey && sectorKey !== 'other';
  });

  return matched.map((s) => s.id);
}
