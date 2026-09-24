/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { HelpMarkdown } from '../ui/HelpMarkdown';
import { getHelpEmbedUrl, videoIframeAllow } from '../../lib/helpVideoEmbed';
import { useSettings } from '../../lib/SettingsContext';
import { buildHelpTourSteps, resolveHelpBannerTitle } from '../../lib/helpTour';

export type PageHelpLabels = {
  guidance: string;
  interactiveTutorial: string;
  noVideo: string;
  /** iframe `title`; defaults to English "Tutorial Video" if omitted */
  tutorialVideo?: string;
  /** Inline banner: do not auto-show help on this page only */
  dontShowOnFirstOpen?: string;
  /** Inline banner: do not auto-show help on any page (all dismiss keys in localStorage) */
  dontShowHelpAllPages?: string;
  /** Tooltip on the leading ? icon for the “this page” row */
  inlineHelpThisPageHint?: string;
  /** Tooltip on the leading ? icon for the “all pages” row */
  inlineHelpAllPagesHint?: string;
  /** Close help modal (`title` / `aria-label` / button label) */
  inlineHideLabel?: string;
  tourPrev?: string;
  tourNext?: string;
};

type HeaderProps = {
  helpUrl: string;
  helpMd: string;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: Dispatch<SetStateAction<boolean>>;
  title: string;
};

export function PageHelpHeaderButton({
  helpUrl,
  helpMd,
  isHelpModalOpen,
  setIsHelpModalOpen,
  title,
}: HeaderProps) {
  if (!helpUrl?.trim() && !helpMd?.trim()) return null;
  return (
    <button
      type="button"
      onClick={() => setIsHelpModalOpen(true)}
      className={cn(
        'self-start shrink-0 rounded-xl border p-2 transition-all',
        isHelpModalOpen
          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'border-transparent text-slate-400 hover:border-slate-100 hover:bg-white hover:text-slate-900',
      )}
      title={title}
      aria-expanded={isHelpModalOpen}
    >
      <HelpCircle size={28} />
    </button>
  );
}

type ModalProps = {
  helpUrl: string;
  helpMd: string;
  isOpen: boolean;
  onClose: () => void;
  labels: PageHelpLabels;
};

export function PageHelpFullModal({ helpUrl, helpMd, isOpen, onClose, labels }: ModalProps) {
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      if (isOpen) onClose();
    }
  }, [isOpen, onClose]);

  const { settings } = useSettings();
  const tourSteps = useMemo(
    () => buildHelpTourSteps(settings as Record<string, unknown>),
    [settings],
  );
  const initialIndex = useMemo(() => {
    const idx = tourSteps.findIndex(
      (step) => step.url === helpUrl || (helpUrl ? step.md === helpMd : false),
    );
    return idx >= 0 ? idx : 0;
  }, [tourSteps, helpUrl, helpMd]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  useEffect(() => {
    setActiveStepIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const hasTourFlow = tourSteps.length > 1;
  const safeStepIndex = Math.min(
    Math.max(activeStepIndex, 0),
    Math.max(0, tourSteps.length - 1),
  );
  const activeStep = tourSteps[safeStepIndex];
  const displayedHelpUrl = activeStep?.url ?? helpUrl;
  const displayedHelpMd = activeStep?.md ?? helpMd;
  const embedSrc = getHelpEmbedUrl(displayedHelpUrl);
  const iframeTitle = labels.tutorialVideo || 'Tutorial Video';
  const prevLabel = labels.tourPrev?.trim() || 'Previous';
  const nextLabel = labels.tourNext?.trim() || 'Next';
  const canGoBack = hasTourFlow && safeStepIndex > 0;
  const canGoNext = hasTourFlow && safeStepIndex < tourSteps.length - 1;
  const displayedTitle = activeStep
    ? resolveHelpBannerTitle({
        configuredTitle: activeStep.title,
        markdown: activeStep.md,
      })
    : labels.guidance;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/92 backdrop-blur-md"
          />
          <div className="relative z-10 w-full max-w-5xl">
            <div
              className="pointer-events-none absolute -inset-10 rounded-3xl bg-slate-400/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -inset-5 rounded-2xl bg-white/12 blur-2xl"
              aria-hidden
            />
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_80px_24px_rgba(148,163,184,0.28),0_32px_96px_-16px_rgba(15,23,42,0.65)] ring-1 ring-white/10"
            >
            <div className="flex items-center justify-between gap-4 bg-[#0b1630] px-6 py-3 text-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">
                  <span>{labels.interactiveTutorial}</span>
                  <span>•</span>
                  <span className="tabular-nums">
                    {safeStepIndex + 1} / {Math.max(tourSteps.length, 1)}
                  </span>
                </div>
                <h3 className="truncate pt-1 text-xl font-bold leading-tight text-white">
                  {displayedTitle || labels.guidance}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr]">
              <div className="flex min-h-[320px] flex-col border-r border-slate-200 bg-slate-100">
                <div className="relative aspect-video w-full flex-1 overflow-hidden bg-black">
                  {embedSrc ? (
                    <iframe
                      src={embedSrc}
                      loading="lazy"
                      title={iframeTitle}
                      allowFullScreen
                      scrolling="no"
                      frameBorder="0"
                      style={{ border: 'none', overflow: 'hidden' }}
                      className="absolute inset-0 h-full w-full border-0"
                      allow={videoIframeAllow}
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-white/30">
                      {labels.noVideo}
                    </div>
                  )}
                </div>

                {hasTourFlow ? (
                  <div className="flex items-center justify-center gap-3 bg-[#0b1630] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => canGoBack && setActiveStepIndex((v) => v - 1)}
                      disabled={!canGoBack}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30"
                      title={prevLabel}
                      aria-label={prevLabel}
                    >
                      <ChevronLeft size={16} strokeWidth={2.25} />
                    </button>
                    <div className="flex items-center gap-2">
                      {tourSteps.map((step, idx) => (
                        <span
                          key={`${step.key}-${step.order}`}
                          className={cn(
                            'rounded-full transition-all duration-300',
                            idx === safeStepIndex
                              ? 'h-1.5 w-6 bg-orange-400'
                              : 'h-1.5 w-1.5 bg-white/35',
                          )}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => canGoNext && setActiveStepIndex((v) => v + 1)}
                      disabled={!canGoNext}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30"
                      title={nextLabel}
                      aria-label={nextLabel}
                    >
                      <ChevronRight size={16} strokeWidth={2.25} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="custom-scrollbar max-h-[70vh] overflow-y-auto bg-white p-5 sm:p-6">
                {displayedHelpMd?.trim() ? (
                  <HelpMarkdown className="text-[14px] leading-relaxed text-slate-700">
                    {displayedHelpMd}
                  </HelpMarkdown>
                ) : (
                  <p className="text-sm text-slate-400">{labels.noVideo}</p>
                )}
              </div>
            </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
