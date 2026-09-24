/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Question } from '../types';
import { sortQuestionsBySheetAndNumara } from '../lib/compareTemplateQuestions';
import { readQuestionIlgiliBirim } from '../lib/questionIlgiliBirim';

/** Canonical TSRS template spreadsheet columns (import + export). */
export const TEMPLATE_QUESTION_EXCEL_HEADERS = [
  'BÖLÜM',
  'KOD',
  'BAŞLIK',
  'SORU',
  'FİRMA_YANITI',
  'FİRMA_YANITI_YIL1',
  'FİRMA_YANITI_YIL2',
  'FİRMA_YANITI_YIL3',
  'İLGİLİ_BİRİM',
  'VERİ_DOĞRULAMA',
  'SORU AÇIKLAMA',
  'ÖRNEK_YANIT',
  'DAYANAK',
  'ONAY',
  'RAPOR_YERİ',
  'REPORTING_ITR',
  'ATANAN SAYFA',
  'KAYIT',
  'TSRS 1',
  'TSRS 2',
  'SASB_RT-CH',
  'GRI',
  'MSCI',
  'ESRS',
] as const;

export type TemplateQuestionExcelHeader =
  (typeof TEMPLATE_QUESTION_EXCEL_HEADERS)[number];

export type ExcelImportMode = 'sozel' | 'sayisal';

export interface ExcelMapping {
  bolumField: string;
  kodField: string;
  baslikField: string;
  soruField: string;
  firmaYanitiField: string;
  firmaYanitiYil1Field: string;
  firmaYanitiYil2Field: string;
  firmaYanitiYil3Field: string;
  /** Sayısal setler: firma notu (FİRMA_NOT sütunu). */
  firmaNotField: string;
  /** Sayısal setler: metrik birimi (BİRİM sütunu). */
  unitField: string;
  birimField: string;
  veriDogruluguField: string;
  aciklamaField: string;
  ornekField: string;
  dayanakField: string;
  onayField: string;
  raporField: string;
  reportingItrField: string;
  tsrs1Field: string;
  tsrs2Field: string;
  sasbRtChField: string;
  griField: string;
  msciField: string;
  esrsField: string;
  numaraField: string;
  atananSayfaField: string;
  kayitField: string;
  /** Fallback page title when the ATANAN SAYFA column is empty for a row (page is created if missing). */
  defaultAtananSayfaTitle?: string;
  /** Fallback existing template page id when column and default title are empty. */
  selectedPageId?: string;
  autoAssignKod?: boolean;
  /** When true, rows with the same KOD in this template are updated instead of duplicated. */
  upsertByKod?: boolean;
}

const EXCEL_IMPORT_FIELD_DEFS_COMMON: Array<{
  key: keyof ExcelMapping;
  label: string;
  required?: boolean;
}> = [
  { key: 'bolumField', label: 'BÖLÜM' },
  { key: 'kodField', label: 'KOD', required: true },
  { key: 'baslikField', label: 'BAŞLIK' },
  { key: 'birimField', label: 'İLGİLİ_BİRİM' },
  { key: 'veriDogruluguField', label: 'VERİ_DOĞRULAMA' },
  { key: 'aciklamaField', label: 'SORU AÇIKLAMA' },
  { key: 'ornekField', label: 'ÖRNEK_YANIT' },
  { key: 'dayanakField', label: 'DAYANAK' },
  { key: 'onayField', label: 'ONAY' },
  { key: 'raporField', label: 'RAPOR_YERİ' },
  { key: 'reportingItrField', label: 'REPORTING_ITR' },
  { key: 'tsrs1Field', label: 'TSRS 1' },
  { key: 'tsrs2Field', label: 'TSRS 2' },
  { key: 'sasbRtChField', label: 'SASB_RT-CH' },
  { key: 'griField', label: 'GRI' },
  { key: 'msciField', label: 'MSCI' },
  { key: 'esrsField', label: 'ESRS' },
];

/** Sözel soru seti: SORU + tek FİRMA_YANITI sütunu. */
export const EXCEL_IMPORT_FIELD_DEFS_SOZEL: Array<{
  key: keyof ExcelMapping;
  label: string;
  required?: boolean;
}> = [
  ...EXCEL_IMPORT_FIELD_DEFS_COMMON.slice(0, 3),
  { key: 'soruField', label: 'SORU', required: true },
  { key: 'firmaYanitiField', label: 'FİRMA_YANITI' },
  ...EXCEL_IMPORT_FIELD_DEFS_COMMON.slice(3),
];

/** Sayısal soru seti: yıl bazlı yanıtlar + metrik birimi; SORU / FİRMA_YANITI yok. */
export const EXCEL_IMPORT_FIELD_DEFS_SAYISAL: Array<{
  key: keyof ExcelMapping;
  label: string;
  required?: boolean;
}> = [
  ...EXCEL_IMPORT_FIELD_DEFS_COMMON.slice(0, 3),
  { key: 'unitField', label: 'BİRİM' },
  { key: 'firmaYanitiYil1Field', label: 'FİRMA_YANITI_YIL1' },
  { key: 'firmaYanitiYil2Field', label: 'FİRMA_YANITI_YIL2' },
  { key: 'firmaYanitiYil3Field', label: 'FİRMA_YANITI_YIL3' },
  { key: 'firmaNotField', label: 'FİRMA_NOT' },
  ...EXCEL_IMPORT_FIELD_DEFS_COMMON.slice(3),
];

/** @deprecated Use getExcelImportFieldDefs(mode) — kept for backwards compatibility. */
export const EXCEL_IMPORT_FIELD_DEFS = EXCEL_IMPORT_FIELD_DEFS_SOZEL;

export function getExcelImportFieldDefs(mode: ExcelImportMode) {
  return mode === 'sayisal'
    ? EXCEL_IMPORT_FIELD_DEFS_SAYISAL
    : EXCEL_IMPORT_FIELD_DEFS_SOZEL;
}

export function detectExcelImportMode(headers: string[]): ExcelImportMode {
  const hasYearCol =
    findExcelHeader(headers, [
      'FİRMA YANITI YIL1',
      'FIRMA YANITI YIL1',
      'FİRMA YANITI YIL 1',
      'FIRMA YANITI YIL 1',
      'FİRMA YANITI YIL2',
      'FIRMA YANITI YIL2',
      'FİRMA YANITI YIL3',
      'FIRMA YANITI YIL3',
    ]) !== '';
  const hasSoru =
    findExcelHeader(headers, ['SORU', 'QUESTION', 'DEFINITION', 'TANIM']) !== '';
  const hasFirmaYaniti =
    findExcelHeader(headers, [
      'FİRMA YANITI',
      'FIRMA YANITI',
      'FİRMA_YANITI',
      'FIRMA_YANITI',
    ]) !== '';

  if (hasYearCol && !hasSoru) return 'sayisal';
  if (hasYearCol && !hasFirmaYaniti) return 'sayisal';
  return 'sozel';
}

/** Import mapping UI — hidden; auto-mapped from spreadsheet headers. */
export const EXCEL_SILENT_IMPORT_FIELDS: Array<keyof ExcelMapping> = [
  'numaraField',
  'atananSayfaField',
  'kayitField',
];

/** Optional leading column on export (round-trip with import; hidden in UI). */
export const TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER = 'NUMARA' as const;

/** Parsed spreadsheet row; `atananSayfaTitle` is resolved to `pageId` during import. */
export type ParsedTemplateQuestion = Omit<Question, 'id'> & {
  atananSayfaTitle?: string;
};

/** Sector Category spreadsheet columns (import + export). */
export const SECTOR_CATEGORY_EXCEL_HEADERS = [
  'NUMARA',
  'BÖLÜM',
  'KOD',
  'BAŞLIK',
  'SORU',
  'FİRMA YANITI',
  'İLGİLİ BİRİN',
  'VERİ DOĞRULAMA',
  'SORU AÇIKLAMA',
  'ÖRNEK YANIT',
  'DAYANAK',
  'ONAY',
  'TESİS BAZINDA',
  'EK ZORUNLU',
  'RAPOR YERİ',
  'REPORTING ITR',
  'ATANAN SAYFA',
  'KAYIT',
] as const;

export type SectorCategoryExcelHeader =
  (typeof SECTOR_CATEGORY_EXCEL_HEADERS)[number];

export interface SectorCategoryExcelMapping {
  numaraField: string;
  bolumField: string;
  kodField: string;
  baslikField: string;
  soruField: string;
  firmaYanitiField: string;
  birimField: string;
  veriDogruluguField: string;
  aciklamaField: string;
  ornekField: string;
  dayanakField: string;
  onayField: string;
  tesisBazindaField: string;
  ekZorunluField: string;
  raporField: string;
  reportingItrField: string;
  atananSayfaField: string;
  kayitField: string;
  autoAssignKod?: boolean;
  upsertByKod?: boolean;
}

export const SECTOR_CATEGORY_IMPORT_FIELD_DEFS: Array<{
  key: keyof SectorCategoryExcelMapping;
  label: string;
  required?: boolean;
}> = [
  { key: 'numaraField', label: 'NUMARA' },
  { key: 'bolumField', label: 'BÖLÜM', required: true },
  { key: 'kodField', label: 'KOD', required: true },
  { key: 'baslikField', label: 'BAŞLIK', required: true },
  { key: 'soruField', label: 'SORU', required: true },
  { key: 'firmaYanitiField', label: 'FİRMA YANITI' },
  { key: 'birimField', label: 'İLGİLİ BİRİN' },
  { key: 'veriDogruluguField', label: 'VERİ DOĞRULAMA' },
  { key: 'aciklamaField', label: 'SORU AÇIKLAMA' },
  { key: 'ornekField', label: 'ÖRNEK YANIT' },
  { key: 'dayanakField', label: 'DAYANAK' },
  { key: 'onayField', label: 'ONAY' },
  { key: 'tesisBazindaField', label: 'TESİS BAZINDA' },
  { key: 'ekZorunluField', label: 'EK ZORUNLU' },
  { key: 'raporField', label: 'RAPOR YERİ' },
  { key: 'reportingItrField', label: 'REPORTING ITR' },
  { key: 'atananSayfaField', label: 'ATANAN SAYFA' },
  { key: 'kayitField', label: 'KAYIT' },
];

// Type-specific field definitions
export const SECTOR_CATEGORY_TYPE_FIELDS: Record<string, Array<{ label: string; key: string; required?: boolean }>> = {
  sozel: [
    { label: 'İLGİLİ KONU', key: 'ilgiliKonu' },
    { label: 'DEPARTMAN/KİŞİ İSMİ', key: 'departman' },
    { label: 'NOT', key: 'not' },
    { label: 'MAX UZUNLUK', key: 'maxLength' },
  ],
  sayisal: [
    { label: 'BİRİM', key: 'unit' },
    { label: 'MİN DEĞER', key: 'minValue' },
    { label: 'MAX DEĞER', key: 'maxValue' },
    { label: 'FORMÜL', key: 'formula' },
    { label: 'DEPARTMAN', key: 'department' },
  ],
  sasb: [
    { label: 'METRIK KOD', key: 'metricCode' },
    { label: 'METRIK ADI', key: 'metricName' },
    { label: 'KATEGORI', key: 'category' },
  ],
  gri: [
    { label: 'GRI KOD', key: 'griCode' },
    { label: 'GRI ADI', key: 'griName' },
    { label: 'DISCLOSURE', key: 'disclosure' },
  ],
  other: [],
};

export function autoMapSectorCategoryHeaders(headers: string[]): SectorCategoryExcelMapping {
  return {
    numaraField: findExcelHeader(headers, ['NUMARA', 'SIRA', 'SIRA NO']),
    bolumField: findExcelHeader(headers, ['BÖLÜM', 'BOLUM', 'SECTION']),
    kodField: findExcelHeader(headers, ['KOD', 'CODE', 'INDEX']),
    baslikField: findExcelHeader(headers, ['BAŞLIK', 'BASLIK', 'TITLE']),
    soruField: findExcelHeader(headers, ['SORU', 'QUESTION', 'DEFINITION']),
    firmaYanitiField: findExcelHeader(headers, ['FİRMA YANITI', 'FIRMA YANITI']),
    birimField: findExcelHeader(headers, ['İLGİLİ BİRİN', 'ILGILI BIRIM', 'DEPARTMENT']),
    veriDogruluguField: findExcelHeader(headers, ['VERİ DOĞRULAMA', 'VERI DOGRULAMA', 'VALIDATION']),
    aciklamaField: findExcelHeader(headers, ['SORU AÇIKLAMA', 'SORU ACIKLAMA', 'EXPLANATION']),
    ornekField: findExcelHeader(headers, ['ÖRNEK YANIT', 'ORNEK YANIT', 'EXAMPLE']),
    dayanakField: findExcelHeader(headers, ['DAYANAK', 'REFERENCE', 'BASIS']),
    onayField: findExcelHeader(headers, ['ONAY', 'APPROVAL']),
    tesisBazindaField: findExcelHeader(headers, ['TESİS BAZINDA', 'TESIS BAZINDA', 'FACILITY-BASED']),
    ekZorunluField: findExcelHeader(headers, ['EK ZORUNLU', 'ADDITIONAL REQUIRED']),
    raporField: findExcelHeader(headers, ['RAPOR YERİ', 'RAPOR YERI', 'REPORT LOCATION']),
    reportingItrField: findExcelHeader(headers, ['REPORTING ITR', 'REPORTING']),
    atananSayfaField: findExcelHeader(headers, ['ATANAN SAYFA', 'ASSIGNED PAGE']),
    kayitField: findExcelHeader(headers, ['KAYIT', 'RECORD', 'NOTE']),
  };
}

// Underscores count as spaces so 'FİRMA_YANITI' and 'FİRMA YANITI' both match.
const normalizeExcelHeader = (s: string) =>
  (s || '').replace(/_/g, ' ').replace(/\s+/g, ' ').toUpperCase().trim();

export function findExcelHeaderContaining(
  headers: string[],
  needle: string,
): string {
  const normalizedNeedle = normalizeExcelHeader(needle);
  return (
    headers.find((h) =>
      normalizeExcelHeader(h).includes(normalizedNeedle),
    ) || ''
  );
}

export function findExcelHeader(
  headers: string[],
  candidates: string[],
): string {
  const normalized = new Set(candidates.map(normalizeExcelHeader));
  return headers.find((h) => normalized.has(normalizeExcelHeader(h))) || '';
}

/** Spreadsheet headers plus any canonical template columns missing from the file (e.g. ESRS on Genel Beyanlar). */
export function mergeImportHeaderOptions(fileHeaders: string[]): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const label = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!label) return;
    const key = normalizeExcelHeader(label);
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(label);
  };

  add(TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER);
  for (const header of fileHeaders) add(header);
  for (const header of TEMPLATE_QUESTION_EXCEL_HEADERS) add(header);
  return ordered;
}

export function autoMapExcelHeaders(
  headers: string[],
  mode?: ExcelImportMode,
): ExcelMapping {
  const importMode = mode ?? detectExcelImportMode(headers);
  const isSayisal = importMode === 'sayisal';

  const ilgiliBirimCandidates = [
    'İLGİLİ BİRİM',
    'ILGILI BIRIM',
    'İLGİLİ_BİRİM',
    'ILGILI_BIRIM',
    'DEPARTMENT',
    'SORUMLU',
  ];
  const birimCandidates = isSayisal
    ? ilgiliBirimCandidates
    : [...ilgiliBirimCandidates, 'BİRİM', 'BIRIM', 'UNIT'];

  return {
    bolumField: findExcelHeader(headers, ['BÖLÜM', 'BOLUM', 'SECTION']),
    kodField: findExcelHeader(headers, ['KOD', 'CODE', 'INDEX', 'ID']),
    numaraField: findExcelHeader(headers, ['NUMARA', 'SIRA', 'SIRA NO', 'SIRA NO.']),
    baslikField: findExcelHeader(headers, [
      'BAŞLIK',
      'BASLIK',
      'TITLE',
      'HEADER',
      'KONU',
      'SUBJECT',
    ]),
    soruField: isSayisal
      ? ''
      : findExcelHeader(headers, [
          'SORU',
          'QUESTION',
          'DEFINITION',
          'TANIM',
          'SORUSU',
          'FIELD',
        ]),
    firmaYanitiField: isSayisal
      ? ''
      : findExcelHeader(headers, [
          'FİRMA YANITI',
          'FIRMA YANITI',
          'FİRMA_YANITI',
          'FIRMA_YANITI',
          'COMPANY RESPONSE',
          'FIRMA YANIT',
        ]),
    firmaYanitiYil1Field: findExcelHeader(headers, [
      'FİRMA YANITI YIL1',
      'FIRMA YANITI YIL1',
      'FİRMA YANITI YIL 1',
      'FIRMA YANITI YIL 1',
      'FİRMA_YANITI_YIL1',
      'FIRMA_YANITI_YIL1',
    ]),
    firmaYanitiYil2Field: findExcelHeader(headers, [
      'FİRMA YANITI YIL2',
      'FIRMA YANITI YIL2',
      'FİRMA YANITI YIL 2',
      'FIRMA YANITI YIL 2',
      'FİRMA_YANITI_YIL2',
      'FIRMA_YANITI_YIL2',
    ]),
    firmaYanitiYil3Field: findExcelHeader(headers, [
      'FİRMA YANITI YIL3',
      'FIRMA YANITI YIL3',
      'FİRMA YANITI YIL 3',
      'FIRMA YANITI YIL 3',
      'FİRMA_YANITI_YIL3',
      'FIRMA_YANITI_YIL3',
    ]),
    firmaNotField: findExcelHeader(headers, [
      'FİRMA NOT',
      'FIRMA NOT',
      'FİRMA_NOT',
      'FIRMA_NOT',
      'FIRMA NOTU',
      'FİRMA NOTU',
    ]),
    unitField: isSayisal
      ? findExcelHeader(headers, ['BİRİM', 'BIRIM', 'UNIT'])
      : '',
    birimField: findExcelHeader(headers, birimCandidates),
    veriDogruluguField: findExcelHeader(headers, [
      'VERİ DOĞRULAMA',
      'VERI DOGRULAMA',
      'VERİ DOĞRULUĞU',
      'VERI DOGRULUGU',
      'VERİ DOĞRULUĞU AÇIKLAMA',
      'VERI DOGRULUGU ACIKLAMA',
      'DATA VALIDATION',
      'VERIFICATION',
    ]),
    aciklamaField: findExcelHeader(headers, [
      'SORU AÇIKLAMA',
      'SORU ACIKLAMA',
      'FİRMA AÇIKLAMA',
      'FIRMA ACIKLAMA',
      'AÇIKLAMA',
      'ACIKLAMA',
      'DESCRIPTION',
      'DETAIL',
      'INFO',
      'EXPLANATION',
    ]),
    ornekField: findExcelHeader(headers, [
      'ÖRNEK YANIT',
      'ORNEK YANIT',
      'EXAMPLE',
      'SAMPLE',
      'YANIT',
      'ANSWER',
    ]),
    dayanakField: findExcelHeader(headers, [
      'DAYANAK',
      'BASIS',
      'REFERENCE',
      'REGULATORY REFERENCE',
    ]),
    onayField: findExcelHeader(headers, ['ONAY', 'APPROVAL', 'SIGN-OFF']),
    raporField: findExcelHeader(headers, [
      'RAPOR YERİ',
      'RAPOR YERI',
      'REPORTING',
      'LOCATION',
      'PLACE',
    ]),
    reportingItrField: findExcelHeader(headers, [
      'REPORTING ITR',
      'REPORTING',
      'ITR',
    ]),
    tsrs1Field: findExcelHeader(headers, ['TSRS 1', 'TSRS1']),
    tsrs2Field: findExcelHeader(headers, ['TSRS 2', 'TSRS2']),
    sasbRtChField: findExcelHeader(headers, [
      'SASB RT-CH',
      'SASB RT CH',
      'SASB',
    ]),
    griField: findExcelHeader(headers, ['GRI']),
    msciField:
      findExcelHeader(headers, ['MSCI']) ||
      findExcelHeaderContaining(headers, 'MSCI'),
    esrsField: findExcelHeader(headers, ['ESRS']),
    atananSayfaField: findExcelHeader(headers, [
      'ATANAN SAYFA',
      'ATANAN SAYFASI',
      'ASSIGNED PAGE',
      'PAGE ASSIGNMENT',
    ]),
    kayitField: findExcelHeader(headers, ['KAYIT', 'RECORD', 'REGISTRATION']),
    autoAssignKod: false,
    upsertByKod: true,
  };
}

function cellText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseNumaraCell(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function headerIndex(headers: string[], field: string | undefined): number {
  if (!field) return -1;
  return headers.indexOf(field);
}

const SHEET_MAX_COLS = 256;
const SHEET_MAX_ROWS = 50000;

/**
 * Excel sheets can report a hugely inflated used range (`!ref`) when stray
 * formatting touches distant cells (e.g. A1:XFD1048576). `sheet_to_json`
 * densifies that whole range and freezes the browser. This computes the real
 * extent of cells that actually contain values so we only materialize those.
 */
function getTrimmedSheetRange(worksheet: XLSX.WorkSheet): XLSX.Range | null {
  const ref = worksheet['!ref'];
  if (!ref) return null;
  const full = XLSX.utils.decode_range(ref);
  let maxRow = -1;
  let maxCol = -1;
  for (const key of Object.keys(worksheet)) {
    if (key.charCodeAt(0) === 33 /* '!' */) continue;
    const value = (worksheet[key] as XLSX.CellObject | undefined)?.v;
    if (value === undefined || value === null || String(value).trim() === '') continue;
    const addr = XLSX.utils.decode_cell(key);
    if (addr.r > maxRow) maxRow = addr.r;
    if (addr.c > maxCol) maxCol = addr.c;
  }
  if (maxRow < 0 || maxCol < 0) return null;
  return {
    s: { r: full.s.r, c: full.s.c },
    e: {
      r: Math.min(maxRow, full.s.r + SHEET_MAX_ROWS - 1),
      c: Math.min(maxCol, full.s.c + SHEET_MAX_COLS - 1),
    },
  };
}

export function sheetToRowArrays(worksheet: XLSX.WorkSheet, limitRows?: number): any[][] {
  const range = getTrimmedSheetRange(worksheet);
  if (!range) return [];
  if (limitRows !== undefined) {
    range.e.r = Math.min(range.e.r, range.s.r + limitRows - 1);
  }
  return XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, range });
}

export async function getExcelHeaders(file: File, sheetName?: string): Promise<{ headers: string[], sheetNames: string[], sampleRows: any[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const targetSheet = sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheet];
        if (!worksheet) {
          throw new Error(`Sheet "${targetSheet}" not found`);
        }
        // Headers live in the first ~10 rows; never densify the whole sheet.
        const rows = sheetToRowArrays(worksheet, 30);
        
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const nonEmpies = rows[i].filter(c => c !== undefined && c !== null && String(c).trim() !== "");
          if (nonEmpies.length >= 2) {
            headerRowIndex = i;
            break;
          }
        }
        
        const headers = (rows[headerRowIndex] || []).map((h: any) => String(h || '').trim());
        const sampleRows = rows.slice(headerRowIndex + 1, headerRowIndex + 4);
        
        resolve({ headers, sheetNames: workbook.SheetNames, sampleRows });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function parseQuestionSetExcel(
  file: File, 
  templateId: string, 
  sectorId: string,
  mapping?: ExcelMapping,
  sheetName?: string
): Promise<ParsedTemplateQuestion[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const allQuestions: ParsedTemplateQuestion[] = [];

        const targetSheets = sheetName ? [sheetName] : workbook.SheetNames;

        targetSheets.forEach(currentSheetName => {
          const worksheet = workbook.Sheets[currentSheetName];
          if (!worksheet) return;
          const rows = sheetToRowArrays(worksheet);

          if (rows.length < 2) return;

          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const nonEmpies = rows[i].filter(c => c !== undefined && c !== null && String(c).trim() !== "");
            if (nonEmpies.length >= 2) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = (rows[headerRowIndex] || []).map((h: any) => String(h || '').trim());
          
          const kodIdx = headerIndex(headers, mapping?.kodField);
          const soruIdx = headerIndex(headers, mapping?.soruField);
          const baslikIdx = headerIndex(headers, mapping?.baslikField);
          const bolumIdx = headerIndex(headers, mapping?.bolumField);
          const firmaYanitiIdx = headerIndex(headers, mapping?.firmaYanitiField);
          const firmaYanitiYil1Idx = headerIndex(headers, mapping?.firmaYanitiYil1Field);
          const firmaYanitiYil2Idx = headerIndex(headers, mapping?.firmaYanitiYil2Field);
          const firmaYanitiYil3Idx = headerIndex(headers, mapping?.firmaYanitiYil3Field);
          const firmaNotIdx = headerIndex(headers, mapping?.firmaNotField);
          const unitIdx = headerIndex(headers, mapping?.unitField);
          const birimIdx = headerIndex(headers, mapping?.birimField);
          const isSayisalImport =
            mapping && detectExcelImportMode(headers) === 'sayisal';
          const veriDogruluguIdx = headerIndex(headers, mapping?.veriDogruluguField);
          const aciklamaIdx = headerIndex(headers, mapping?.aciklamaField);
          const ornekIdx = headerIndex(headers, mapping?.ornekField);
          const dayanakIdx = headerIndex(headers, mapping?.dayanakField);
          const onayIdx = headerIndex(headers, mapping?.onayField);
          const raporIdx = headerIndex(headers, mapping?.raporField);
          const reportingItrIdx = headerIndex(headers, mapping?.reportingItrField);
          const tsrs1Idx = headerIndex(headers, mapping?.tsrs1Field);
          const tsrs2Idx = headerIndex(headers, mapping?.tsrs2Field);
          const sasbRtChIdx = headerIndex(headers, mapping?.sasbRtChField);
          const griIdx = headerIndex(headers, mapping?.griField);
          const msciIdx = headerIndex(headers, mapping?.msciField);
          const esrsIdx = headerIndex(headers, mapping?.esrsField);
          const numaraIdx = headerIndex(headers, mapping?.numaraField);
          const atananSayfaIdx = headerIndex(headers, mapping?.atananSayfaField);

          let lastParentKod = "";
          let lastBaslik = "";
          let lastBolum = "";
          let subIndexCount = 0;

          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            let kod = kodIdx !== -1 ? String(row[kodIdx] || '').trim() : '';
            let soru = soruIdx !== -1 ? String(row[soruIdx] || '').trim() : '';

            let baslikPeek =
              baslikIdx !== -1 ? String(row[baslikIdx] || '').trim() : '';
            if (!kod && !soru && !baslikPeek) continue;

            const originalKod = kod;
            
            if ((!kod || kod === '-') && lastParentKod) {
              subIndexCount++;
              kod = `${lastParentKod}-${subIndexCount}`;
            } else if (kod && kod !== '-') {
              lastParentKod = kod;
              subIndexCount = 0;
            }

            const finalKod = kod || (mapping?.autoAssignKod ? `Q-${allQuestions.length + 1}` : '');

            if (!finalKod.trim()) continue;

            let baslik = baslikIdx !== -1 ? String(row[baslikIdx] || '').trim() : '';
            
            if ((!baslik || baslik === '-' || /^\d+$/.test(baslik)) && lastBaslik) {
              baslik = lastBaslik;
            } else if (baslik && baslik !== '-' && !/^\d+$/.test(baslik)) {
              lastBaslik = baslik;
            }

            const finalBaslik = baslik || String(allQuestions.length + 1);

            if (!String(soru || '').trim()) {
              const unit = unitIdx !== -1 ? cellText(row[unitIdx]) : '';
              soru = finalBaslik;
              if (unit && isSayisalImport) {
                soru = `${finalBaslik} (${unit})`;
              }
            }
            if (!String(soru || '').trim()) continue;

            let bolum = bolumIdx !== -1 ? cellText(row[bolumIdx]) : '';
            if ((!bolum || bolum === '-') && lastBolum) {
              bolum = lastBolum;
            } else if (bolum && bolum !== '-') {
              lastBolum = bolum;
            }

            const thematicGroup = currentSheetName;
            const numara = numaraIdx !== -1 ? parseNumaraCell(row[numaraIdx]) : undefined;
            allQuestions.push({
              templateId,
              sectorId,
              numara,
              kod: finalKod,
              baslik: finalBaslik,
              soru: soru || '',
              bolum,
              firmaYaniti: firmaYanitiIdx !== -1 ? cellText(row[firmaYanitiIdx]) : '',
              firmaYanitiYil1: firmaYanitiYil1Idx !== -1 ? cellText(row[firmaYanitiYil1Idx]) : '',
              firmaYanitiYil2: firmaYanitiYil2Idx !== -1 ? cellText(row[firmaYanitiYil2Idx]) : '',
              firmaYanitiYil3: firmaYanitiYil3Idx !== -1 ? cellText(row[firmaYanitiYil3Idx]) : '',
              firmaNot: firmaNotIdx !== -1 ? cellText(row[firmaNotIdx]) : '',
              ilgiliBirim: birimIdx !== -1 ? cellText(row[birimIdx]) : '',
              veriDogrulugu: veriDogruluguIdx !== -1 ? cellText(row[veriDogruluguIdx]) : '',
              aciklama: aciklamaIdx !== -1 ? cellText(row[aciklamaIdx]) : '',
              ornekYanit: ornekIdx !== -1 ? cellText(row[ornekIdx]) : '',
              dayanak: dayanakIdx !== -1 ? cellText(row[dayanakIdx]) : '',
              onay: onayIdx !== -1 ? cellText(row[onayIdx]) : '',
              raporYeri: raporIdx !== -1 ? cellText(row[raporIdx]) : '',
              reportingItr: reportingItrIdx !== -1 ? cellText(row[reportingItrIdx]) : '',
              tsrs1: tsrs1Idx !== -1 ? cellText(row[tsrs1Idx]) : '',
              tsrs2: tsrs2Idx !== -1 ? cellText(row[tsrs2Idx]) : '',
              sasbRtCh: sasbRtChIdx !== -1 ? cellText(row[sasbRtChIdx]) : '',
              gri: griIdx !== -1 ? cellText(row[griIdx]) : '',
              msci: msciIdx !== -1 ? cellText(row[msciIdx]) : '',
              esrs: esrsIdx !== -1 ? cellText(row[esrsIdx]) : '',
              atananSayfaTitle:
                atananSayfaIdx !== -1 ? cellText(row[atananSayfaIdx]) : '',
              thematicGroup,
              isMandatory: originalKod.toUpperCase().includes('GRI 3-3') || originalKod.toUpperCase().includes('MANDATORY'),
              order: allQuestions.length,
              answerFormat: 'textarea',
              soruCogaltma: 'yok' as const,
            });
          }
        });

        console.log(`Parsed ${allQuestions.length} questions from Excel`);
        resolve(allQuestions);
      } catch (err) {
        console.error("Excel Parsing Error:", err);
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function questionToExcelRow(
  q: Question,
  pageTitle = '',
): Record<TemplateQuestionExcelHeader, string> & {
  [TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER]?: string;
} {
  return {
    [TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER]:
      typeof q.numara === 'number' && Number.isFinite(q.numara)
        ? String(q.numara)
        : '',
    'BÖLÜM': q.bolum || '',
    'KOD': q.kod,
    'BAŞLIK': q.baslik,
    'SORU': q.soru,
    'FİRMA_YANITI': q.firmaYaniti || '',
    'FİRMA_YANITI_YIL1': q.firmaYanitiYil1 || '',
    'FİRMA_YANITI_YIL2': q.firmaYanitiYil2 || '',
    'FİRMA_YANITI_YIL3': q.firmaYanitiYil3 || '',
    'İLGİLİ_BİRİM': readQuestionIlgiliBirim(q) || '',
    'VERİ_DOĞRULAMA': q.veriDogrulugu || '',
    'SORU AÇIKLAMA': q.aciklama || '',
    'ÖRNEK_YANIT': q.ornekYanit || '',
    'DAYANAK': q.dayanak || '',
    'ONAY': q.onay || '',
    'RAPOR_YERİ': q.raporYeri || '',
    'REPORTING_ITR': q.reportingItr || '',
    'ATANAN SAYFA': pageTitle,
    'KAYIT': q.kayit || '',
    'TSRS 1': q.tsrs1 || '',
    'TSRS 2': q.tsrs2 || '',
    'SASB_RT-CH': q.sasbRtCh || '',
    'GRI': q.gri || '',
    'MSCI': q.msci || '',
    'ESRS': q.esrs || '',
  };
}

export function exportQuestionsToExcel(
  questions: Question[],
  pages: Array<{ id: string; title?: string }>,
  templateName: string,
) {
  const pageMap = pages.reduce(
    (acc, page) => ({ ...acc, [page.id]: page.title || '' }),
    {} as Record<string, string>,
  );
  const data = sortQuestionsBySheetAndNumara(questions || []).map((q) =>
    questionToExcelRow(q, q.pageId ? pageMap[q.pageId] || '' : ''),
  );

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: [TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER, ...TEMPLATE_QUESTION_EXCEL_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${templateName.replace(/[^a-z0-9]/gi, '_')}_Structure.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
