/**
 * Rename Excel sheet names (and ATANAN_SAYFA cells) for Kimya classifier templates.
 *
 * Usage: npm run migrate:kimya-excel-sheets
 */

import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import {
  KIMYA_SAYISAL_PAGE_RENAMES,
  KIMYA_SOZEL_PAGE_RENAMES,
} from '../server/migrations/kimyaClassifierPageRenames.ts';

type SheetRename = { from: string; to: string };

function buildSheetRenames(
  rules: typeof KIMYA_SAYISAL_PAGE_RENAMES,
): SheetRename[] {
  const renames: SheetRename[] = [];
  for (const rule of rules) {
    for (const from of rule.oldTitles) {
      renames.push({ from, to: rule.newTitle });
    }
  }
  return renames;
}

function renameWorkbookSheets(
  workbook: XLSX.WorkBook,
  renames: SheetRename[],
): number {
  let count = 0;
  for (const { from, to } of renames) {
    if (!workbook.Sheets[from]) continue;
    const sheet = workbook.Sheets[from];
    delete workbook.Sheets[from];
    workbook.Sheets[to] = sheet;
    workbook.SheetNames = workbook.SheetNames.map((name) =>
      name === from ? to : name,
    );

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
    const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
    })[0] as string[] | undefined;
    const atananIdx = headerRow?.findIndex(
      (h) => String(h).trim().toUpperCase() === 'ATANAN_SAYFA',
    );

    if (atananIdx !== undefined && atananIdx >= 0) {
      const atananKey = headerRow![atananIdx];
      for (const row of rows) {
        const cell = String(row[atananKey] ?? '').trim();
        if (cell === from) row[atananKey] = to;
      }
      const newSheet = XLSX.utils.json_to_sheet(rows, { header: headerRow });
      workbook.Sheets[to] = newSheet;
    }

    count += 1;
  }
  return count;
}

function processFile(
  relativePath: string,
  renames: SheetRename[],
): void {
  const filePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip missing file: ${filePath}`);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const renamed = renameWorkbookSheets(workbook, renames);
  XLSX.writeFile(workbook, filePath);
  console.log(`${relativePath}: renamed ${renamed} sheet(s)`);
}

async function main() {
  processFile(
    'docs/templates/Kimya_Sektoru_Sayisal_Siniflandirmali.xlsx',
    buildSheetRenames(KIMYA_SAYISAL_PAGE_RENAMES),
  );
  processFile(
    'docs/templates/Kimya_Sektoru_Sozel_Siniflandirmali.xlsx',
    buildSheetRenames(KIMYA_SOZEL_PAGE_RENAMES),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
