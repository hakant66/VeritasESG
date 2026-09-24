/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChevronDown, HelpCircle, Info, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { HelpMarkdown } from '../ui/HelpMarkdown';
import Modal from '../ui/Modal';
import { AciklamaVideoPlayer, resolveQuestionVideoEmbed } from './AciklamaVideoPlayer';
import { normalizeVideoUrlInput } from '../../lib/helpVideoEmbed';

export type QuestionGuidanceMaterialsLabels = {
  sectionTitle: string;
  guidance: string;
  example: string;
  videoTitle: string;
  noContent: string;
};

function questionHasVideo(videoUrl?: string | null): boolean {
  return Boolean(
    normalizeVideoUrlInput(videoUrl) && resolveQuestionVideoEmbed(videoUrl),
  );
}

export function questionHasGuidanceMaterials(
  aciklama?: string | null,
  ornekYanit?: string | null,
  videoUrl?: string | null,
): boolean {
  return countQuestionGuidanceMaterials(aciklama, ornekYanit, videoUrl) > 0;
}

/** How many of guidance / example / video have content (0–3). */
export function countQuestionGuidanceMaterials(
  aciklama?: string | null,
  ornekYanit?: string | null,
  videoUrl?: string | null,
): number {
  let count = 0;
  if (aciklama?.trim()) count += 1;
  if (ornekYanit?.trim()) count += 1;
  if (questionHasVideo(videoUrl)) count += 1;
  return count;
}

type QuestionGuidanceMaterialsContentProps = {
  aciklama?: string | null;
  ornekYanit?: string | null;
  videoUrl?: string | null;
  labels: QuestionGuidanceMaterialsLabels;
};

export function QuestionGuidanceMaterialsContent({
  aciklama,
  ornekYanit,
  videoUrl,
  labels,
}: QuestionGuidanceMaterialsContentProps) {
  const hasVideo = questionHasVideo(videoUrl);

  return (
    <div className="space-y-4">
      {hasVideo ? (
        <AciklamaVideoPlayer
          videoUrl={videoUrl}
          title={labels.videoTitle}
          className="aspect-video w-full max-h-[min(50vh,360px)] overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <HelpCircle size={12} className="text-blue-400/70" aria-hidden />
            {labels.guidance}
          </p>
          {aciklama?.trim() ? (
            <HelpMarkdown className="text-xs text-slate-600">{aciklama}</HelpMarkdown>
          ) : (
            <p className="text-xs font-medium italic text-slate-400">{labels.noContent}</p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/40 p-4">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-600/70">
            <Lightbulb size={12} aria-hidden />
            {labels.example}
          </p>
          {ornekYanit?.trim() ? (
            <HelpMarkdown className="text-xs italic text-amber-900/80">{ornekYanit}</HelpMarkdown>
          ) : (
            <p className="text-xs font-medium italic text-amber-700/60">{labels.noContent}</p>
          )}
        </div>
      </div>
    </div>
  );
}

type QuestionGuidanceMaterialsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  questionTitle?: string | null;
  questionText?: string | null;
  aciklama?: string | null;
  ornekYanit?: string | null;
  videoUrl?: string | null;
  labels: QuestionGuidanceMaterialsLabels;
};

export function QuestionGuidanceMaterialsModal({
  isOpen,
  onClose,
  questionTitle,
  questionText,
  aciklama,
  ornekYanit,
  videoUrl,
  labels,
}: QuestionGuidanceMaterialsModalProps) {
  const hasVideo = questionHasVideo(videoUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={questionTitle?.trim() || labels.sectionTitle}
      size="3xl"
      type="info"
      showTypeIcon={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Soru
              </p>
              {questionText?.trim() ? (
                <HelpMarkdown className="text-sm text-slate-700">{questionText}</HelpMarkdown>
              ) : (
                <p className="text-xs font-medium italic text-slate-400">{labels.noContent}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  <HelpCircle size={12} className="text-blue-400/70" aria-hidden />
                  {labels.guidance}
                </p>
                {aciklama?.trim() ? (
                  <HelpMarkdown className="text-xs text-slate-600">{aciklama}</HelpMarkdown>
                ) : (
                  <p className="text-xs font-medium italic text-slate-400">{labels.noContent}</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-600/70">
                  <Lightbulb size={12} aria-hidden />
                  {labels.example}
                </p>
                {ornekYanit?.trim() ? (
                  <HelpMarkdown className="text-xs italic text-amber-900/80">{ornekYanit}</HelpMarkdown>
                ) : (
                  <p className="text-xs font-medium italic text-amber-700/60">{labels.noContent}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {labels.videoTitle}
            </p>
            {hasVideo ? (
              <AciklamaVideoPlayer
                videoUrl={videoUrl}
                title={labels.videoTitle}
                className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm"
              />
            ) : (
              <p className="text-xs font-medium italic text-slate-400">{labels.noContent}</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

type QuestionGuidanceLightbulbButtonProps = {
  count: number;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  title: string;
  icon?: 'lightbulb' | 'info' | 'search';
  interactive?: boolean;
  /** When true, render a faint info icon even if count is 0 (question rows). */
  showWhenEmpty?: boolean;
};

export function QuestionGuidanceLightbulbButton({
  count,
  onClick,
  className,
  active = false,
  title,
  icon = 'lightbulb',
  interactive = true,
  showWhenEmpty = false,
}: QuestionGuidanceLightbulbButtonProps) {
  const hasMaterials = count > 0;
  if (!hasMaterials && !showWhenEmpty) return null;

  const Icon = icon === 'lightbulb' ? Lightbulb : Info;
  const iconColorClass = !hasMaterials
    ? 'text-slate-300'
    : active
      ? 'text-slate-800'
      : 'text-slate-600';
  const canInteract = interactive && hasMaterials;
  const rootClassName = cn(
    'inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border px-2 transition-all',
    className,
    !hasMaterials
      ? 'cursor-default border-transparent bg-transparent shadow-none'
      : active
        ? 'bg-white shadow-sm ring-1 ring-black/[0.06]'
        : 'bg-white/80 hover:bg-white',
  );

  return (
    <div className="relative inline-flex shrink-0">
      {canInteract ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          title={title}
          aria-label={title}
          className={rootClassName}
        >
          <Icon size={14} strokeWidth={2} className={iconColorClass} aria-hidden />
        </button>
      ) : (
        <div title={title} aria-label={title} className={rootClassName}>
          <Icon size={14} strokeWidth={2} className={iconColorClass} aria-hidden />
        </div>
      )}
      {hasMaterials ? (
        <span
          className={cn(
            'pointer-events-none absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-slate-700 px-0.5 text-[9px] font-bold leading-none text-white shadow tabular-nums',
            icon !== 'info' && count > 9 && 'min-w-[1.125rem] text-[8px]',
          )}
        >
          {icon === 'info' ? '!' : count}
        </span>
      ) : null}
    </div>
  );
}

type QuestionGuidanceMaterialsProps = {
  questionId: string;
  aciklama?: string | null;
  ornekYanit?: string | null;
  videoUrl?: string | null;
  labels: QuestionGuidanceMaterialsLabels;
  /** Controlled open state; omit for internal state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Initial open when uncontrolled; default false (collapsed). */
  defaultOpen?: boolean;
  className?: string;
};

/** Inline accordion — editor preview only; forms use modal + lightbulb. */
export function QuestionGuidanceMaterials({
  questionId,
  aciklama,
  ornekYanit,
  videoUrl,
  labels,
  open: openControlled,
  onOpenChange,
  defaultOpen = false,
  className,
}: QuestionGuidanceMaterialsProps) {
  const [openInternal, setOpenInternal] = useState(defaultOpen);
  const open = openControlled ?? openInternal;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openControlled === undefined) setOpenInternal(next);
  };

  if (!questionHasGuidanceMaterials(aciklama, ornekYanit, videoUrl)) {
    return null;
  }

  const panelId = `question-help-materials-${questionId}`;

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-slate-50/80', className)}>
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
      >
        <span className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <HelpCircle size={14} className="shrink-0 text-blue-500/80" aria-hidden />
          <span className="truncate">{labels.sectionTitle}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={`${panelId}-trigger`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 px-4 pb-4 pt-3">
              <QuestionGuidanceMaterialsContent
                aciklama={aciklama}
                ornekYanit={ornekYanit}
                videoUrl={videoUrl}
                labels={labels}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
