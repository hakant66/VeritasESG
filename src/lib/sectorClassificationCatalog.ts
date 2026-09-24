/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Load NACE ↔ SASB catalog from DB tables and activate it for lookups.
 */

import { apiRequest } from './apiClient';
import {
  BUILTIN_SECTOR_CLASSIFICATION_CATALOG,
  catalogFromRows,
  setActiveSectorClassificationCatalog,
  type SectorClassificationCatalog,
} from '../data/sectorClassification';

type Row = Record<string, unknown>;

function unwrapList(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload as Row[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: Row[] }).items;
  }
  return [];
}

let cached: SectorClassificationCatalog | null = null;
let inflight: Promise<SectorClassificationCatalog> | null = null;

export async function loadSectorClassificationCatalog(
  force = false,
): Promise<SectorClassificationCatalog> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const [macrosRes, subsRes, naceRes] = await Promise.all([
        apiRequest<unknown>('/api/db/sasbMacroSectors?limit=500'),
        apiRequest<unknown>('/api/db/sasbSubSectors?limit=500'),
        apiRequest<unknown>('/api/db/naceCodeMappings?limit=2000'),
      ]);

      const catalog = catalogFromRows({
        macros: unwrapList(macrosRes).map((row) => ({
          id: String(row.id),
          labelEn: String(row.labelEn || ''),
          labelTr: String(row.labelTr || ''),
          sortOrder: Number(row.sortOrder ?? 0),
        })),
        subSectors: unwrapList(subsRes).map((row) => ({
          id: String(row.id),
          macroId: String(row.macroId || ''),
          labelEn: String(row.labelEn || ''),
          labelTr: String(row.labelTr || ''),
          sortOrder: Number(row.sortOrder ?? 0),
        })),
        naceEntries: unwrapList(naceRes).map((row) => ({
          code: String(row.code || ''),
          descriptionEn: String(row.descriptionEn || ''),
          descriptionTr: String(row.descriptionTr || ''),
          sasbSubSectorId: String(row.sasbSubSectorId || ''),
          sortOrder: Number(row.sortOrder ?? 0),
        })),
      });

      const usable =
        catalog.macros.length > 0 &&
        catalog.subSectors.length > 0 &&
        catalog.naceEntries.length > 0
          ? catalog
          : BUILTIN_SECTOR_CLASSIFICATION_CATALOG;

      cached = usable;
      setActiveSectorClassificationCatalog(usable);
      return usable;
    } catch (err) {
      console.warn('Failed to load sector classification catalog; using builtin.', err);
      cached = BUILTIN_SECTOR_CLASSIFICATION_CATALOG;
      setActiveSectorClassificationCatalog(cached);
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
