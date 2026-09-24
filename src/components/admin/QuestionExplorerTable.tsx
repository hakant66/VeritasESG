import { useMemo } from "react";
import { ChevronRight, Edit2, Plus, Trash2 } from "lucide-react";
import type { Question } from "../../types";
import {
  columnLabel,
  orderedVisibleFieldIds,
  SUMMARY_PREVIEW_FIELDS,
  TEMPLATE_QUESTION_GRID_DEFAULT_WIDTHS,
  TEMPLATE_QUESTION_GRID_MIN_WIDTHS,
  truncateGridPreview,
  type TemplateQuestionGridFieldId,
  type TemplateQuestionGridLabels,
} from "../../lib/templateQuestionGrid";
import { cn } from "../../lib/utils";
import "./questionExplorerTable.css";

export interface QuestionExplorerTableProps {
  rows: Question[];
  selectedQuestionIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  getFieldValue: (question: Question, field: TemplateQuestionGridFieldId) => string;
  onOpenDetail: (question: Question) => void;
  onDelete: (question: Question) => void;
  onInsertAbove: (question: Question) => void;
  onInsertBelow: (question: Question) => void;
  activeDetailQuestionId?: string | null;
  urlHighlightQuestionId?: string | null;
  isSubmitting?: boolean;
  emptyMessage: string;
  labels?: TemplateQuestionGridLabels;
  onBulkDelete?: () => void;
  onToggleSelectAll?: () => void;
  bulkDeleteTitle?: string;
  selectAllLabel?: string;
}

export function QuestionExplorerTable({
  rows,
  selectedQuestionIds,
  onSelectionChange,
  columnOrder,
  columnVisibility,
  columnWidths,
  getFieldValue,
  onOpenDetail,
  onDelete,
  onInsertAbove,
  onInsertBelow,
  activeDetailQuestionId,
  urlHighlightQuestionId,
  isSubmitting = false,
  emptyMessage,
  labels,
  onBulkDelete,
  onToggleSelectAll,
  bulkDeleteTitle,
  selectAllLabel,
}: QuestionExplorerTableProps) {
  const visibleFields = useMemo(
    () => orderedVisibleFieldIds(columnOrder, columnVisibility),
    [columnOrder, columnVisibility],
  );

  const allSelected =
    rows.length > 0 && rows.every((q) => selectedQuestionIds.has(q.id));
  const someSelected = rows.some((q) => selectedQuestionIds.has(q.id));

  const toggleRowSelection = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const widthFor = (field: TemplateQuestionGridFieldId) =>
    Math.max(
      columnWidths[field] ?? TEMPLATE_QUESTION_GRID_DEFAULT_WIDTHS[field],
      TEMPLATE_QUESTION_GRID_MIN_WIDTHS[field],
    );

  return (
    <div className="question-explorer-table-wrap rounded-b-lg border-t border-slate-100">
      <table className="question-explorer-table">
        <thead>
          <tr>
            <th className="qet-col-select" scope="col">
              <div className="qet-selection-header">
                <input
                  type="checkbox"
                  className="qet-selection-checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={() => onToggleSelectAll?.()}
                  aria-label={selectAllLabel ?? "Select all"}
                />
                <button
                  type="button"
                  className="qet-selection-delete"
                  disabled={selectedQuestionIds.size === 0 || isSubmitting}
                  onClick={() => onBulkDelete?.()}
                  title={bulkDeleteTitle ?? "Delete selected"}
                  aria-label={bulkDeleteTitle ?? "Delete selected"}
                >
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            </th>
            <th className="qet-col-actions" scope="col">
              {labels?.actions ?? ""}
            </th>
            {visibleFields.map((field) => (
              <th
                key={field}
                scope="col"
                style={{ width: widthFor(field), minWidth: TEMPLATE_QUESTION_GRID_MIN_WIDTHS[field] }}
              >
                {columnLabel(field, labels)}
              </th>
            ))}
            <th className="qet-col-detail" scope="col">
              {labels?.detail ?? "Detay"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={visibleFields.length + 3}
                className="qet-empty"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((q) => {
              const isSelected = selectedQuestionIds.has(q.id);
              return (
                <tr
                  key={q.id}
                  className={cn(
                    "qet-row",
                    isSelected && "qet-row-selected",
                    q.id === activeDetailQuestionId && "qet-row-detail-active",
                    q.id === urlHighlightQuestionId && "qet-row-url-highlight",
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button, input, a")) return;
                    onOpenDetail(q);
                  }}
                >
                  <td className="qet-col-select">
                    <input
                      type="checkbox"
                      className="qet-selection-checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelection(q.id)}
                      aria-label={q.kod || q.id}
                    />
                  </td>
                  <td className="qet-col-actions">
                    <div className="qet-actions">
                      <button
                        type="button"
                        title="Add row above"
                        disabled={isSubmitting}
                        onClick={() => onInsertAbove(q)}
                      >
                        <Plus size={10} strokeWidth={2.25} aria-hidden />
                      </button>
                      <button type="button" title="Edit" className="qet-muted" disabled>
                        <Edit2 size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        className="danger"
                        onClick={() => onDelete(q)}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        title="Add row below"
                        disabled={isSubmitting}
                        onClick={() => onInsertBelow(q)}
                      >
                        <Plus size={10} strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                  </td>
                  {visibleFields.map((field) => {
                    const raw = getFieldValue(q, field) || "";
                    const value = SUMMARY_PREVIEW_FIELDS.has(field)
                      ? truncateGridPreview(raw)
                      : raw.trim() || "—";
                    return (
                      <td
                        key={field}
                        className="qet-data-cell"
                        style={{ width: widthFor(field) }}
                        title={raw.trim() || undefined}
                      >
                        {value}
                      </td>
                    );
                  })}
                  <td className="qet-col-detail">
                    <button
                      type="button"
                      className="qet-detail-btn"
                      title="Detayı aç"
                      onClick={() => onOpenDetail(q)}
                    >
                      <ChevronRight size={18} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
