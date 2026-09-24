/**
 * Fill ESRS column for all rows in "Genel Beyanlar" sheet of Kimya template.
 * Mapping based on GRI-ESRS Interoperability Index (EFRAG/GRI 2023) and
 * ESRS format conventions used in other sheets of the same workbook.
 */
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = process.argv[2] || path.resolve(
  __dirname,
  '../../Horizon/horizon docs/Kimya_Sektoru_Standart_Siniflandirmali.xlsx',
);

/** @type {Record<string, string>} */
const GRI2_ESRS_MAP = {
  'GRI 2-1': 'ESRS 2 BP-1',
  'GRI 2-2': 'ESRS 2 BP-1',
  'GRI 2-3': 'ESRS 2 BP-1',
  'GRI 2-4': 'ESRS 2 BP-2',
  'GRI 2-5': 'ESRS 2 BP-1',
  'GRI 2-6': 'ESRS 2 SBM-1; ESRS 2 SBM-3, IRO-1, MDR-P/A/T',
  'GRI 2-7': 'ESRS S1-6, S1-8; ESRS 2 SBM-1',
  'GRI 2-8': 'ESRS S1-7',
  'GRI 2-9': 'ESRS 2 GOV-1 to GOV-5; ESRS G1',
  'GRI 2-10': 'ESRS 2 GOV-1 to GOV-5',
  'GRI 2-11': 'ESRS 2 GOV-1 to GOV-5',
  'GRI 2-12': 'ESRS 2 GOV-1 to GOV-5; ESRS 2 SBM-2',
  'GRI 2-13': 'ESRS 2 GOV-1 to GOV-5; ESRS G1-3',
  'GRI 2-14': 'ESRS 2 GOV-5, IRO-1',
  'GRI 2-15': 'ESRS G1-1, G1-3, G1-4; ESRS 2 SBM-3, IRO-1, MDR-P/A/T',
  'GRI 2-16': 'ESRS 2 GOV-2; ESRS G1-1, G1-3',
  'GRI 2-17': 'ESRS 2 GOV-1',
  'GRI 2-18': 'ESRS 2 GOV-1 to GOV-5',
  'GRI 2-19': 'ESRS 2 GOV-3',
  'GRI 2-20': 'ESRS 2 GOV-3',
  'GRI 2-21': 'ESRS S1-16',
  'GRI 2-22': 'ESRS 2 SBM-1',
  'GRI 2-23': 'ESRS G1-1, G1-3, G1-4; ESRS 2 GOV-4, MDR-P',
  'GRI 2-24': 'ESRS G1-1, G1-3, G1-4; ESRS 2 GOV-2, MDR-P',
  'GRI 2-25': 'ESRS S1-1, S1-3; ESRS S2-1, S2-3; ESRS S3-1, S3-3; ESRS S4-1, S4-3',
  'GRI 2-26': 'ESRS G1-1, G1-3; ESRS S1-3',
  'GRI 2-27': 'ESRS G1-1, G1-3, G1-4; ESRS G1-4; ESRS 2 SBM-3',
  'GRI 2-28': 'ESRS G1-1, G1-3, G1-4; ESRS 2 MDR-P/A/T',
  'GRI 2-29': 'ESRS 2 SBM-2; ESRS S1-1, S1-2; ESRS S2-1, S2-2',
  'GRI 2-30': 'ESRS S1-8',
};

/** Sub-question refinements within a KOD (matched against SORU text). */
/** @type {Record<string, Array<{ match: RegExp; esrs: string }>>} */
const SUB_ROW_REFINEMENTS = {
  'GRI 2-9': [
    { match: /cinsiyet|kadın/i, esrs: 'ESRS 2 GOV-1; ESRS S1-9' },
    { match: /az temsil/i, esrs: 'ESRS 2 GOV-1; ESRS S1-13' },
    { match: /yetkinlik/i, esrs: 'ESRS 2 GOV-1' },
  ],
  'GRI 2-7': [
    { match: /bağlamsal|dalgalanma/i, esrs: 'ESRS S1-6; ESRS 2 SBM-1' },
  ],
  'GRI 2-23': [
    { match: /insan hakları/i, esrs: 'ESRS S1-1; ESRS 2 GOV-4, MDR-P' },
    { match: /iletişimi/i, esrs: 'ESRS G1-1; ESRS 2 GOV-4, MDR-P' },
  ],
  'GRI 2-26': [
    { match: /whistle|endişe|şikayet|tavsiye/i, esrs: 'ESRS G1-1, G1-3; ESRS S1-3' },
  ],
};

function resolveEsrs(kod, soru) {
  const base = GRI2_ESRS_MAP[kod];
  if (!base) return null;

  const refinements = SUB_ROW_REFINEMENTS[kod];
  if (!refinements) return base;

  const soruText = String(soru || '');
  for (const rule of refinements) {
    if (rule.match.test(soruText)) return rule.esrs;
  }
  return base;
}

function normalizeHeader(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

const workbook = XLSX.readFile(INPUT);
const sheetName = 'Genel Beyanlar';
const sheet = workbook.Sheets[sheetName];
if (!sheet) {
  console.error(`Sheet not found: ${sheetName}`);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
const headers = rows[0].map(normalizeHeader);
const kodIdx = headers.indexOf('KOD');
const soruIdx = headers.indexOf('SORU');
const esrsIdx = headers.indexOf('ESRS');

if (kodIdx < 0 || esrsIdx < 0) {
  console.error('Required columns KOD or ESRS not found');
  process.exit(1);
}

let updated = 0;
let missingKod = 0;
const unmappedKods = new Set();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const kod = String(row[kodIdx] || '').trim();
  if (!kod) continue;

  const esrs = resolveEsrs(kod, row[soruIdx]);
  if (!esrs) {
    unmappedKods.add(kod);
    missingKod++;
    continue;
  }

  if (row[esrsIdx] !== esrs) {
    row[esrsIdx] = esrs;
    updated++;
  }
}

if (unmappedKods.size > 0) {
  console.error('Unmapped KODs:', [...unmappedKods].join(', '));
  process.exit(1);
}

workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
XLSX.writeFile(workbook, INPUT);

const filled = rows.slice(1).filter((r) => String(r[kodIdx] || '').trim() && String(r[esrsIdx] || '').trim()).length;
const total = rows.slice(1).filter((r) => String(r[kodIdx] || '').trim()).length;
const empty = total - filled;

console.log(`File: ${INPUT}`);
console.log(`Rows with KOD: ${total}`);
console.log(`ESRS filled: ${filled}`);
console.log(`ESRS empty: ${empty}`);
console.log(`Cells updated: ${updated}`);

if (empty > 0) {
  process.exit(1);
}
