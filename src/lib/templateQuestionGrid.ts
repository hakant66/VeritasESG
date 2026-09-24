import type { ColDef } from "ag-grid-community";
import { COLUMN_LABELS, DEFAULT_COLUMN_ORDER } from "./columnState";
import { UI_HIDDEN_QUESTION_COLUMNS } from "./questionKayitLog";

const TEMPLATE_QUESTION_GRID_FIELD_ID_LIST = [
  "numara",
  "baslik",
  "soru",
  "firmaYaniti",
  "firmaYanitiYil1",
  "firmaYanitiYil2",
  "firmaYanitiYil3",
  "firmaNot",
  "bolum",
  "kod",
  "ilgiliBirum",
  "veriDogrulugu",
  "aciklama",
  "ornekYanit",
  "dayanak",
  "onay",
  "raporYeri",
  "reportingItr",
  "tsrs1",
  "tsrs2",
  "sasbRtCh",
  "gri",
  "msci",
  "esrs",
] as const;

/** Editable question fields shown as grid columns (Excel-only fields excluded). */
export const TEMPLATE_QUESTION_GRID_FIELD_IDS =
  TEMPLATE_QUESTION_GRID_FIELD_ID_LIST.filter(
    (id) => !UI_HIDDEN_QUESTION_COLUMNS.has(id),
  );

export type TemplateQuestionGridFieldId =
  (typeof TEMPLATE_QUESTION_GRID_FIELD_IDS)[number];

export const TEMPLATE_QUESTION_GRID_DEFAULT_WIDTHS: Record<
  TemplateQuestionGridFieldId,
  number
> = {
  numara: 72,
  baslik: 200,
  soru: 400,
  firmaYaniti: 300,
  firmaYanitiYil1: 160,
  firmaYanitiYil2: 160,
  firmaYanitiYil3: 160,
  firmaNot: 180,
  bolum: 150,
  kod: 120,
  ilgiliBirum: 150,
  veriDogrulugu: 180,
  aciklama: 200,
  ornekYanit: 180,
  dayanak: 180,
  onay: 150,
  raporYeri: 180,
  reportingItr: 180,
  tsrs1: 120,
  tsrs2: 120,
  sasbRtCh: 140,
  gri: 140,
  msci: 160,
  esrs: 180,
};

export const TEMPLATE_QUESTION_GRID_MIN_WIDTHS: Record<
  TemplateQuestionGridFieldId,
  number
> = {
  numara: 56,
  baslik: 100,
  soru: 150,
  firmaYaniti: 150,
  firmaYanitiYil1: 100,
  firmaYanitiYil2: 100,
  firmaYanitiYil3: 100,
  firmaNot: 100,
  bolum: 100,
  kod: 80,
  ilgiliBirum: 100,
  veriDogrulugu: 120,
  aciklama: 120,
  ornekYanit: 120,
  dayanak: 120,
  onay: 100,
  raporYeri: 120,
  reportingItr: 120,
  tsrs1: 90,
  tsrs2: 90,
  sasbRtCh: 100,
  gri: 100,
  msci: 100,
  esrs: 120,
};

export const LONG_TEXT_GRID_FIELDS = new Set<TemplateQuestionGridFieldId>([
  "aciklama",
  "ornekYanit",
]);

/** Özet tabloda tek satır önizleme (detay sheet'te tam metin). */
export const SUMMARY_PREVIEW_FIELDS = new Set<TemplateQuestionGridFieldId>([
  "baslik",
  "soru",
  "firmaYaniti",
  "aciklama",
  "ornekYanit",
]);

export function truncateGridPreview(value: string, max = 120): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function gridFieldComparator(
  colId: TemplateQuestionGridFieldId,
  a: string,
  b: string,
): number {
  if (colId === "numara") {
    const aEmpty = !String(a).trim();
    const bEmpty = !String(b).trim();
    if (aEmpty && bEmpty) return 0;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return 0;
  }
  if (colId === "kod") {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  }
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export const GRID_INTERNAL_COLUMN_IDS = new Set([
  "_actions",
  "_detail",
  "ag-Grid-SelectionColumn",
]);

export const GRID_DATA_CELL_CLASS = "question-explorer-ag-grid-data-cell";

export function isDataGridColumnId(colId: string): colId is TemplateQuestionGridFieldId {
  return (TEMPLATE_QUESTION_GRID_FIELD_IDS as readonly string[]).includes(colId);
}

export function extractDataColumnOrder(columnState: { colId: string }[]): string[] {
  return columnState
    .map((c) => c.colId)
    .filter((id) => isDataGridColumnId(id));
}

export function buildDefaultColumnWidths(): Record<string, number> {
  return { ...TEMPLATE_QUESTION_GRID_DEFAULT_WIDTHS };
}

export function mergeColumnWidths(
  saved?: Record<string, number>,
): Record<string, number> {
  const merged = buildDefaultColumnWidths();
  if (!saved) return merged;
  for (const id of TEMPLATE_QUESTION_GRID_FIELD_IDS) {
    const w = saved[id];
    if (typeof w === "number" && w >= TEMPLATE_QUESTION_GRID_MIN_WIDTHS[id]) {
      merged[id] = w;
    }
  }
  return merged;
}

export function columnLabel(
  colId: TemplateQuestionGridFieldId,
  overrides?: Partial<Record<TemplateQuestionGridFieldId, string>>,
): string {
  return overrides?.[colId] ?? COLUMN_LABELS[colId] ?? colId;
}

export function orderedVisibleFieldIds(
  columnOrder: string[],
  columnVisibility: Record<string, boolean>,
): TemplateQuestionGridFieldId[] {
  const order = columnOrder.length ? columnOrder : [...DEFAULT_COLUMN_ORDER];
  return order.filter(
    (id): id is TemplateQuestionGridFieldId =>
      isDataGridColumnId(id) && columnVisibility[id] !== false,
  );
}

export type TemplateQuestionGridLabels = Partial<
  Record<TemplateQuestionGridFieldId, string>
> & {
  detail?: string;
  actions?: string;
};

export function buildDataColumnDefs(options: {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  labels?: TemplateQuestionGridLabels;
}): ColDef[] {
  const { columnOrder, columnVisibility, columnWidths, labels } = options;
  const order = columnOrder.length ? columnOrder : [...DEFAULT_COLUMN_ORDER];

  return order
    .filter(isDataGridColumnId)
    .map((colId) => {
      const def: ColDef = {
        colId,
        headerName: columnLabel(colId, labels),
        hide: columnVisibility[colId] === false,
        width: columnWidths[colId] ?? TEMPLATE_QUESTION_GRID_DEFAULT_WIDTHS[colId],
        minWidth: TEMPLATE_QUESTION_GRID_MIN_WIDTHS[colId],
        resizable: true,
        sortable: true,
        wrapText: true,
        autoHeight: true,
        editable: false,
        cellClass: GRID_DATA_CELL_CLASS,
      };
      return def;
    });
}
