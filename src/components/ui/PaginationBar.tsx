/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PageSizeOption = 10 | 25 | 50 | 100 | 200 | 250 | 500;

const DEFAULT_PAGE_SIZE_OPTIONS: PageSizeOption[] = [10, 25, 50];

function fillRangeSummary(template: string, from: number, to: number, total: number) {
  return template.replace(/\{from\}/g, String(from)).replace(/\{to\}/g, String(to)).replace(/\{total\}/g, String(total));
}

export interface PaginationBarProps {
  page: number;
  pageSize: PageSizeOption;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  /** e.g. "{from}–{to} arası gösteriliyor / Toplam {total} kayıt" */
  rangeSummaryTemplate: string;
  /** Right column label (e.g. Sayfa başına) */
  perPageLabel: string;
  pageOfLabel: (current: number, totalPages: number) => string;
  prevLabel: string;
  nextLabel: string;
  className?: string;
  /** Per-page choices in the selector (defaults to 10 / 25 / 50). */
  pageSizeOptions?: readonly PageSizeOption[];
}

export function PaginationBar({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  rangeSummaryTemplate,
  perPageLabel,
  pageOfLabel,
  prevLabel,
  nextLabel,
  className,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  const rangeLine =
    totalItems > 0 ? fillRangeSummary(rangeSummaryTemplate, from, to, totalItems) : fillRangeSummary(rangeSummaryTemplate, 0, 0, 0);

  return (
    <div
      className={cn(
        'flex w-full flex-row flex-wrap justify-between items-start gap-x-8 gap-y-4 pt-4 border-t border-slate-100',
        className,
      )}
    >
      {/* Left: summary + paginator */}
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3 text-left">
        <p className="text-sm font-medium text-slate-600 tabular-nums tracking-tight">{rangeLine}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
            title={prevLabel}
            aria-label={prevLabel}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[7rem] px-1 text-center text-xs font-bold tabular-nums text-slate-700">
            {pageOfLabel(safePage, totalPages)}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
            title={nextLabel}
            aria-label={nextLabel}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Right: per-page size */}
      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-slate-400">{perPageLabel}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
          className="minimal-input min-w-[4.5rem] max-w-[6rem] px-2 py-1.5 text-xs font-semibold"
          aria-label={perPageLabel}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
