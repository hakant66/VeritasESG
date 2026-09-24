/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../ui/Modal';
import { MarkdownSyntaxGuide } from '../ui/MarkdownSyntaxGuide';
import type { Question, QuestionAnswerFormat, QuestionSoruCogaltma } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useHorizontalSplit } from '../../hooks/useHorizontalSplit';
import { cn } from '../../lib/utils';
import {
  QuestionGuidancePreview,
  type QuestionGuidancePreviewFields,
} from './QuestionGuidancePreview';

export type QuestionGuidanceDraft = QuestionGuidancePreviewFields & {
  kod: string;
  baslik: string;
  pageId: string;
  domainIds: string[];
  ilgiliBirim: string;
  soruCogaltma: QuestionSoruCogaltma;
};

export type QuestionGuidancePageOption = { id: string; title: string };
export type QuestionGuidanceDomainOption = { id: string; name: string };

export type QuestionGuidanceReferenceContext = {
  templateName?: string | null;
  /** Template question id (source). */
  sourceQuestionId?: string | null;
  /** Project question copy id or current row id. */
  recordQuestionId?: string | null;
  templateSectorId?: string | null;
  templateId?: string | null;
};

type QuestionGuidanceEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  question: Pick<Question, 'id' | 'kod' | 'baslik'> | null;
  referenceContext?: QuestionGuidanceReferenceContext | null;
  canOpenTemplateEditor?: boolean;
  pageOptions?: QuestionGuidancePageOption[];
  domainOptions?: QuestionGuidanceDomainOption[];
  draft: QuestionGuidanceDraft;
  onDraftChange: (patch: Partial<QuestionGuidanceDraft>) => void;
  onSave: () => void;
  onCopyQuestion?: () => void;
  showCopyQuestion?: boolean;
  saveDisabled?: boolean;
  isSaving?: boolean;
  isCopying?: boolean;
};

const META_LABEL =
  'text-[9px] font-bold uppercase tracking-widest text-slate-400';

const META_INPUT =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 disabled:opacity-50';

const FIELD_TEXTAREA =
  'min-h-[7rem] w-full resize-y rounded-lg border border-slate-200 p-3 font-mono text-xs leading-snug text-slate-900 disabled:opacity-50';

const FIELD_TEXTAREA_LARGE =
  'min-h-[9rem] w-full resize-y rounded-lg border border-slate-200 p-3 font-mono text-xs leading-snug text-slate-900 disabled:opacity-50';

function buildTemplateEditorHref(ctx: QuestionGuidanceReferenceContext): string | null {
  const sectorId = ctx.templateSectorId?.trim();
  const templateId = ctx.templateId?.trim();
  const sourceQuestionId = ctx.sourceQuestionId?.trim();
  if (!sectorId || !templateId) return null;
  const params = new URLSearchParams({ templateId });
  if (sourceQuestionId) params.set('questionId', sourceQuestionId);
  return `/templates/${sectorId}?${params.toString()}`;
}

function CollapsibleMarkdownField({
  label,
  value,
  onChange,
  disabled,
  defaultOpen,
  textareaClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
  textareaClassName?: string;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <ChevronDown
          size={14}
          className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-100 p-3 pt-2">
        <textarea
          className={cn(FIELD_TEXTAREA, textareaClassName)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Markdown"
        />
      </div>
    </details>
  );
}

function toggleDomainId(current: string[], domainId: string): string[] {
  return current.includes(domainId)
    ? current.filter((id) => id !== domainId)
    : [...current, domainId];
}

export function QuestionGuidanceEditorModal({
  isOpen,
  onClose,
  question,
  referenceContext,
  canOpenTemplateEditor = false,
  pageOptions = [],
  domainOptions = [],
  draft,
  onDraftChange,
  onSave,
  onCopyQuestion,
  showCopyQuestion = false,
  saveDisabled = false,
  isSaving = false,
  isCopying = false,
}: QuestionGuidanceEditorModalProps) {
  const { t } = useTranslation();
  const { containerRef, leftPercent, startResizing } = useHorizontalSplit({
    defaultPercent: 34,
    minPercent: 26,
    maxPercent: 48,
    resetKey: isOpen && question ? question.id : null,
  });

  if (!question) return null;

  const sourceQuestionId =
    referenceContext?.sourceQuestionId?.trim() || question.id;
  const recordQuestionId =
    referenceContext?.recordQuestionId?.trim() || question.id;
  const templateName = referenceContext?.templateName?.trim();
  const templateEditorHref =
    referenceContext && canOpenTemplateEditor
      ? buildTemplateEditorHref(referenceContext)
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.templates.questionGuidanceEditorTitle}
      description={t.templates.questionGuidanceEditorHint}
      type="info"
      size="3xl"
      showFooterClose={false}
    >
      <div className="flex max-h-[min(calc(92vh-10rem),860px)] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div
            ref={containerRef}
            className="flex min-h-[min(72vh,520px)] w-full flex-nowrap"
          >
            <div
              className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-3"
              style={{ width: `${leftPercent}%` }}
            >
              <details className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-100/80 [&::-webkit-details-marker]:hidden">
                  <span>{t.templates.questionGuidanceEditorFields}</span>
                  <ChevronDown
                    size={14}
                    className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="space-y-2 border-t border-slate-200/80 px-3 py-2.5">
                {templateName ? (
                  <p className="text-xs font-semibold leading-snug text-slate-900">
                    {templateEditorHref && canOpenTemplateEditor ? (
                      <Link
                        to={templateEditorHref}
                        className="inline-flex items-center gap-1 text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900"
                        title={t.templates.openTemplateQuestionEditor}
                      >
                        {templateName}
                        <ExternalLink size={12} className="shrink-0" aria-hidden />
                      </Link>
                    ) : (
                      templateName
                    )}
                  </p>
                ) : null}
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-snug text-slate-700">
                  <span className="font-bold text-slate-500">
                    {t.templates.sourceQuestionIdLabel}
                  </span>
                  <span aria-hidden>:</span>
                  <span className="break-all font-mono text-[11px] text-slate-800">
                    {sourceQuestionId}
                  </span>
                  {templateEditorHref && canOpenTemplateEditor ? (
                    <Link
                      to={templateEditorHref}
                      className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                      title={t.templates.openTemplateQuestionEditor}
                      aria-label={t.templates.openTemplateQuestionEditor}
                    >
                      <ExternalLink size={13} strokeWidth={2} aria-hidden />
                    </Link>
                  ) : null}
                </p>
                <p className="text-xs leading-snug text-slate-700">
                  <span className="font-bold text-slate-500">
                    {t.templates.recordQuestionIdLabel}
                  </span>
                  :{' '}
                  <span className="break-all font-mono text-[11px] text-slate-800">
                    {recordQuestionId}
                  </span>
                </p>

                <div className="grid grid-cols-1 gap-2.5 border-t border-slate-200/80 pt-2.5 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 sm:col-span-1">
                    <span className={META_LABEL}>{t.templates.kod}</span>
                    <input
                      type="text"
                      value={draft.kod}
                      onChange={(e) => onDraftChange({ kod: e.target.value })}
                      disabled={isSaving}
                      className={META_INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-1">
                    <span className={META_LABEL}>{t.templates.fieldLabel}</span>
                    <input
                      type="text"
                      value={draft.baslik}
                      onChange={(e) => onDraftChange({ baslik: e.target.value })}
                      disabled={isSaving}
                      className={META_INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className={META_LABEL}>{t.templates.assignedPage}</span>
                    <select
                      value={draft.pageId}
                      onChange={(e) => onDraftChange({ pageId: e.target.value })}
                      disabled={isSaving}
                      className={cn(META_INPUT, 'font-bold')}
                    >
                      <option value="">{t.common.none}</option>
                      {pageOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <span className={META_LABEL}>{t.templates.domains}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {domainOptions.map((domain) => {
                        const isChecked = draft.domainIds.includes(domain.id);
                        return (
                          <button
                            key={domain.id}
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              onDraftChange({
                                domainIds: toggleDomainId(draft.domainIds, domain.id),
                              })
                            }
                            className={cn(
                              'rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all disabled:opacity-50',
                              isChecked
                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800',
                            )}
                          >
                            {domain.name}
                          </button>
                        );
                      })}
                      {domainOptions.length === 0 ? (
                        <span className="text-[10px] italic text-slate-400">
                          {t.templates.noDomainsInExplorer}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className={META_LABEL}>{t.templates.mappedClause}</span>
                    <input
                      type="text"
                      value={draft.ilgiliBirim}
                      onChange={(e) => onDraftChange({ ilgiliBirim: e.target.value })}
                      disabled={isSaving}
                      className={META_INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className={META_LABEL}>{t.templates.questionDataType}</span>
                    <select
                      value={draft.answerFormat}
                      onChange={(e) =>
                        onDraftChange({
                          answerFormat: e.target.value as QuestionAnswerFormat,
                        })
                      }
                      disabled={isSaving}
                      className={cn(META_INPUT, 'font-bold')}
                    >
                      <option value="textarea">{t.templates.answerFormatTextarea}</option>
                      <option value="integer">{t.templates.answerFormatInteger}</option>
                      <option value="decimal">{t.templates.answerFormatDecimal}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className={META_LABEL}>{t.templates.soruCogaltma}</span>
                    <select
                      value={draft.soruCogaltma}
                      onChange={(e) =>
                        onDraftChange({
                          soruCogaltma: e.target.value as QuestionSoruCogaltma,
                        })
                      }
                      disabled={isSaving}
                      aria-label={t.templates.soruCogaltma}
                      className={cn(META_INPUT, 'font-bold')}
                    >
                      <option value="yok">{t.templates.soruCogaltmaYok}</option>
                      <option value="sube_bazinda">{t.templates.soruCogaltmaSube}</option>
                    </select>
                  </label>
                </div>
                </div>
              </details>

              <MarkdownSyntaxGuide />

              <CollapsibleMarkdownField
                label={t.templates.questionText}
                value={draft.soru}
                onChange={(value) => onDraftChange({ soru: value })}
                disabled={isSaving}
                defaultOpen
                textareaClassName={FIELD_TEXTAREA_LARGE}
              />

              <CollapsibleMarkdownField
                label={t.projectDetail.guidance}
                value={draft.aciklama}
                onChange={(value) => onDraftChange({ aciklama: value })}
                disabled={isSaving}
              />

              <CollapsibleMarkdownField
                label={t.projectDetail.example}
                value={draft.ornekYanit}
                onChange={(value) => onDraftChange({ ornekYanit: value })}
                disabled={isSaving}
                defaultOpen={Boolean(draft.ornekYanit.trim())}
              />

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t.templates.aciklamaVideoUrlLabel}
                </span>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={draft.aciklamaVideoUrl}
                  onChange={(e) => onDraftChange({ aciklamaVideoUrl: e.target.value })}
                  disabled={isSaving}
                  placeholder="https://"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 disabled:opacity-50"
                />
              </label>
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
                {t.templates.questionGuidanceEditorFullPreview}
              </span>
              <div className="min-h-[360px] flex-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <QuestionGuidancePreview
                  question={{
                    kod: draft.kod || question.kod,
                    baslik: draft.baslik || question.baslik,
                  }}
                  fields={draft}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isCopying}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          {showCopyQuestion && onCopyQuestion ? (
            <button
              type="button"
              onClick={onCopyQuestion}
              disabled={isSaving || isCopying}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              {isCopying ? (
                <Loader2 className="animate-spin" size={16} aria-hidden />
              ) : (
                <Copy size={16} strokeWidth={2} aria-hidden />
              )}
              {t.templates.copyProjectQuestion}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || isSaving || isCopying}
            className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="mx-auto animate-spin" size={16} /> : t.common.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
