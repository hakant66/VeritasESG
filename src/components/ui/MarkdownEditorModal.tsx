/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, type ReactNode } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { HelpMarkdown } from './HelpMarkdown';
import { MarkdownSyntaxGuide } from './MarkdownSyntaxGuide';
import { exportMarkdownPreviewToPdf } from '../../lib/exportMarkdownPreviewPdf';
import { useTranslation } from '../../hooks/useTranslation';
import { useHorizontalSplit } from '../../hooks/useHorizontalSplit';

export type MarkdownEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  onMarkdownChange: (value: string) => void;
  onSave: () => void;
  /** Shown next to source label, e.g. question id */
  sourceMeta?: ReactNode;
  saveDisabled?: boolean;
  isSaving?: boolean;
  sourceDisabled?: boolean;
  pdfFileName?: string;
};

export function MarkdownEditorModal({
  isOpen,
  onClose,
  markdown,
  onMarkdownChange,
  onSave,
  sourceMeta,
  saveDisabled = false,
  isSaving = false,
  sourceDisabled = false,
  pdfFileName = 'markdown-preview',
}: MarkdownEditorModalProps) {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { containerRef, leftPercent, startResizing } = useHorizontalSplit({
    defaultPercent: 50,
    resetKey: isOpen ? 'markdown-editor' : null,
  });

  const handleExportPdf = async () => {
    const root = previewRef.current;
    if (!root || !markdown.trim()) return;

    setPdfError(null);
    setIsExportingPdf(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await exportMarkdownPreviewToPdf(root, pdfFileName);
    } catch (err) {
      console.error('Markdown preview PDF export failed:', err);
      setPdfError(t.templates.explorerMarkdownExportPdfError);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.templates.explorerMarkdownEditorTitle}
      description={t.templates.explorerMarkdownEditorHint}
      type="info"
      size="2xl"
      showFooterClose={false}
    >
      <div className="flex max-h-[min(calc(90vh-11rem),720px)] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
      <div ref={containerRef} className="flex min-h-[260px] w-full">
        <div
          className="flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden pr-3"
          style={{ width: `${leftPercent}%` }}
        >
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {t.templates.explorerMarkdownSource}
            {sourceMeta}
          </span>
          <textarea
            className="min-h-[220px] w-full flex-1 resize-y rounded-lg border border-slate-200 p-3 font-mono text-xs leading-snug text-slate-900 disabled:opacity-50"
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            disabled={sourceDisabled || isSaving}
          />
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t.templates.questionGuidanceSplitResize}
          aria-valuenow={Math.round(leftPercent)}
          tabIndex={0}
          onMouseDown={startResizing}
          className="group relative mx-0.5 w-2 shrink-0 cursor-col-resize touch-none"
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition-colors group-hover:bg-blue-400 group-active:bg-blue-500" />
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-400/5" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden pl-1">
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {t.templates.explorerMarkdownPreview}
          </span>
          <div
            ref={previewRef}
            className="min-h-[220px] flex-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/70 p-3"
          >
            <HelpMarkdown emptyFallback={<p className="text-slate-400 italic">…</p>}>
              {markdown}
            </HelpMarkdown>
          </div>
          <div className="flex shrink-0 flex-col gap-1 pt-0.5">
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={isExportingPdf || !markdown.trim() || isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              ) : (
                <FileDown size={14} className="shrink-0" aria-hidden />
              )}
              {isExportingPdf
                ? t.templates.explorerMarkdownExportPdfLoading
                : t.templates.explorerMarkdownExportPdf}
            </button>
            {pdfError ? (
              <p className="text-[10px] font-medium text-red-600" role="alert">
                {pdfError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <MarkdownSyntaxGuide className="mt-3" />
        </div>
        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          {t.common.cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled || isSaving}
          className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="mx-auto animate-spin" size={16} /> : t.common.save}
        </button>
        </div>
      </div>
    </Modal>
  );
}
