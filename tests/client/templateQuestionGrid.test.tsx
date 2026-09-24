import { describe, expect, it } from "vitest";
import {
  buildDataColumnDefs,
  extractDataColumnOrder,
  gridFieldComparator,
  mergeColumnWidths,
  orderedVisibleFieldIds,
  truncateGridPreview,
} from "../../src/lib/templateQuestionGrid";
import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_COLUMN_VISIBILITY,
  normalizeColumnOrder,
} from "../../src/lib/columnState";

describe("templateQuestionGrid", () => {
  it("merges saved column widths with defaults and min bounds", () => {
    const merged = mergeColumnWidths({ baslik: 50, soru: 500, kod: 9999 });
    expect(merged.baslik).toBe(200);
    expect(merged.soru).toBe(500);
    expect(merged.kod).toBe(9999);
  });

  it("orders visible fields from column order and visibility map", () => {
    const order = normalizeColumnOrder(
      ["soru", "baslik", "kod"],
      DEFAULT_COLUMN_ORDER,
    );
    const visible = orderedVisibleFieldIds(order, {
      ...DEFAULT_COLUMN_VISIBILITY,
      firmaYaniti: false,
      kod: true,
    });
    expect(visible).toEqual(["soru", "baslik", "kod", "numara", "ilgiliBirum"]);
  });

  it("builds column defs with hide flag from visibility", () => {
    const defs = buildDataColumnDefs({
      columnOrder: DEFAULT_COLUMN_ORDER,
      columnVisibility: { ...DEFAULT_COLUMN_VISIBILITY, kod: true },
      columnWidths: mergeColumnWidths(),
    });
    const kod = defs.find((d) => d.colId === "kod");
    const bolum = defs.find((d) => d.colId === "bolum");
    expect(kod?.hide).toBe(false);
    expect(bolum?.hide).toBe(true);
  });

  it("truncates long preview text for summary cells", () => {
    const long = "A".repeat(150);
    expect(truncateGridPreview(long).length).toBeLessThanOrEqual(120);
    expect(truncateGridPreview("")).toBe("—");
  });

  it("sorts kod numerically in comparator", () => {
    expect(gridFieldComparator("kod", "10", "2")).toBeGreaterThan(0);
    expect(gridFieldComparator("baslik", "b", "a")).toBeGreaterThan(0);
  });

  it("sorts numara numerically in comparator", () => {
    expect(gridFieldComparator("numara", "10", "2")).toBeGreaterThan(0);
    expect(gridFieldComparator("numara", "", "3")).toBeGreaterThan(0);
    expect(gridFieldComparator("numara", "2", "")).toBeLessThan(0);
  });

  it("extracts data column order from ag-grid column state", () => {
    const order = extractDataColumnOrder([
      { colId: "_actions" },
      { colId: "baslik" },
      { colId: "soru" },
      { colId: "ag-Grid-SelectionColumn" },
      { colId: "kod" },
    ]);
    expect(order).toEqual(["baslik", "soru", "kod"]);
  });
});
