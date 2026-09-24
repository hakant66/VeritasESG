/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seed NACE ↔ SASB catalog tables from builtin defaults when empty.
 */

import {
  NACE_ENTRIES,
  SASB_MACRO_SECTORS,
  SASB_SUB_SECTORS,
} from '../../lib/sectorClassification.ts';
import {
  countNaceCodeMappings,
  upsertNaceCodeMappingByCode,
  upsertSasbMacroSectorById,
  upsertSasbSubSectorById,
} from '../data/seedDataAccess.ts';

export async function seedSectorClassificationCatalog(): Promise<void> {
  try {
    const count = await countNaceCodeMappings();
    if (count > 0) {
      console.log(`✓ Sector classification catalog already seeded (${count} NACE rows). Skipping.`);
      return;
    }

    console.log('Seeding sector classification catalog (SASB macros/subs + NACE mappings)...');

    for (const [index, macro] of SASB_MACRO_SECTORS.entries()) {
      await upsertSasbMacroSectorById(String(macro.id), {
        labelEn: macro.labelEn,
        labelTr: macro.labelTr,
        sortOrder: typeof macro.sortOrder === 'number' ? macro.sortOrder : index,
      });
    }

    for (const [index, sub] of SASB_SUB_SECTORS.entries()) {
      await upsertSasbSubSectorById(sub.id, {
        macroId: String(sub.macroId),
        labelEn: sub.labelEn,
        labelTr: sub.labelTr,
        sortOrder: typeof sub.sortOrder === 'number' ? sub.sortOrder : index,
      });
    }

    for (const [index, entry] of NACE_ENTRIES.entries()) {
      await upsertNaceCodeMappingByCode(entry.code, {
        descriptionEn: entry.descriptionEn,
        descriptionTr: entry.descriptionTr,
        sasbSubSectorId: entry.sasbSubSectorId,
        sortOrder: typeof entry.sortOrder === 'number' ? entry.sortOrder : index,
      });
    }

    console.log(
      `✓ Seeded ${SASB_MACRO_SECTORS.length} SASB macros, ${SASB_SUB_SECTORS.length} SICS subs, ${NACE_ENTRIES.length} NACE mappings`,
    );
  } catch (error) {
    console.error('Failed to seed sector classification catalog:', error);
    throw error;
  }
}
