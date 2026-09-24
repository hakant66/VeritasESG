// Column visibility, order, and width state for the template questions grid
import { UI_HIDDEN_QUESTION_COLUMNS } from './questionKayitLog';

const STORAGE_KEY = 'goviq-template-columns:v2';

export interface ColumnState {
  columnOrder?: string[];
  columnVisibility?: Record<string, boolean>;
  columnWidths?: Record<string, number>;
}

export function loadColumnState(): ColumnState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ColumnState;
  } catch {
    return {};
  }
}

export function saveColumnState(state: ColumnState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}

export function normalizeColumnOrder(
  saved: string[] | undefined,
  defaults: string[],
): string[] {
  if (!saved?.length) return defaults;
  const allowed = new Set(defaults);
  const filtered = saved.filter(
    (id) => allowed.has(id) && !UI_HIDDEN_QUESTION_COLUMNS.has(id),
  );
  const missing = defaults.filter(
    (id) => !filtered.includes(id) && !UI_HIDDEN_QUESTION_COLUMNS.has(id),
  );
  return [...filtered, ...missing];
}

export function reorderColumns(
  order: string[],
  draggedId: string,
  targetId: string,
): string[] {
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, draggedId);
  return next;
}

// Default column visibility for template questions table
/** Master–detail özet görünümü: tabloda az kolon, detay sağ panelde. */
export const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  numara: true,
  kod: true,
  baslik: true,
  soru: true,
  ilgiliBirum: true,
  firmaYaniti: false,
  firmaYanitiYil1: false,
  firmaYanitiYil2: false,
  firmaYanitiYil3: false,
  firmaNot: false,
  bolum: false,
  veriDogrulugu: false,
  aciklama: false,
  ornekYanit: false,
  dayanak: false,
  onay: false,
  raporYeri: false,
  reportingItr: false,
  tsrs1: false,
  tsrs2: false,
  sasbRtCh: false,
  gri: false,
  msci: false,
  esrs: false,
};

export const DEFAULT_COLUMN_ORDER = [
  'numara',
  'kod',
  'baslik',
  'soru',
  'ilgiliBirum',
  'firmaYaniti',
  'firmaYanitiYil1',
  'firmaYanitiYil2',
  'firmaYanitiYil3',
  'firmaNot',
  'bolum',
  'veriDogrulugu',
  'aciklama',
  'ornekYanit',
  'dayanak',
  'onay',
  'raporYeri',
  'reportingItr',
  'tsrs1',
  'tsrs2',
  'sasbRtCh',
  'gri',
  'msci',
  'esrs',
];

export const COLUMN_LABELS: Record<string, string> = {
  numara: 'Numara',
  baslik: 'Başlık',
  soru: 'Soru',
  firmaYaniti: 'Firma Yanıtı',
  firmaYanitiYil1: 'Firma Yanıtı Yıl 1',
  firmaYanitiYil2: 'Firma Yanıtı Yıl 2',
  firmaYanitiYil3: 'Firma Yanıtı Yıl 3',
  firmaNot: 'Firma Not',
  bolum: 'Bölüm',
  kod: 'Kod',
  ilgiliBirum: 'İlgili Birim',
  veriDogrulugu: 'Veri Doğruluğu',
  aciklama: 'Açıklama',
  ornekYanit: 'Örnek Yanıt',
  dayanak: 'Dayanak',
  onay: 'Onay',
  raporYeri: 'Rapor Yeri',
  reportingItr: 'Reporting ITR',
  tsrs1: 'TSRS 1',
  tsrs2: 'TSRS 2',
  sasbRtCh: 'SASB RT-CH',
  gri: 'GRI',
  msci: 'MSCI',
  esrs: 'ESRS',
};
