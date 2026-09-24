/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  type?: 'info' | 'warning' | 'danger' | 'confirm';
  confirmLabel?: string;
  cancelLabel?: string;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  /** When false, hides the top-right X control (footer Close is separate). */
  showHeaderClose?: boolean;
  showFooterClose?: boolean;
  closeLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
  /** Renders above standard modals (e.g. confirm over a large editor dialog). */
  elevated?: boolean;
  /** Hides the leading icon next to modal title when false. */
  showTypeIcon?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  size = 'md',
  showHeaderClose = true,
  showFooterClose,
  closeLabel,
  onConfirm,
  onCancel,
  children,
  elevated = false,
  showTypeIcon = true,
}: ModalProps) {
  const { t } = useTranslation();
  const resolvedCloseLabel = closeLabel ?? t.common.close;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      const raf = requestAnimationFrame(() => {
        const el = panelRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        el?.focus();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      (previousFocusRef.current as HTMLElement | null)?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null);
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { last.focus(); e.preventDefault(); }
      } else {
        if (document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    },
    [onClose],
  );
  const footerCloseVisible =
    showFooterClose ?? !(type === 'info' && !onConfirm);
  const backdropZ = elevated ? 'z-[10098]' : 'z-[9998]';
  const panelZ = elevated ? 'z-[10099]' : 'z-[9999]';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0 bg-slate-900/40 backdrop-blur-sm',
              backdropZ,
            )}
          />
          <div
            className={cn(
              'fixed inset-0 flex items-center justify-center p-4 pointer-events-none',
              panelZ,
            )}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              onKeyDown={handleKeyDown}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "bg-white rounded-2xl shadow-2xl border border-slate-200 w-full pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]",
                size === 'md' ? "max-w-md" :
                size === 'lg' ? "max-w-2xl" :
                size === 'xl' ? "max-w-4xl" :
                size === '2xl' ? "max-w-6xl" :
                size === '3xl' ? "max-w-[min(96vw,88rem)]" :
                size === 'full' ? "max-w-none" : "max-w-md"
              )}
            >
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="flex items-start gap-4">
                  {showTypeIcon ? (
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      type === 'danger' ? "bg-red-50 text-red-600" :
                      type === 'warning' ? "bg-amber-50 text-amber-600" :
                      type === 'confirm' ? "bg-blue-50 text-blue-600" :
                      "bg-slate-50 text-slate-600"
                    )}>
                      {type === 'danger' || type === 'warning' ? <AlertCircle size={20} /> :
                       type === 'confirm' ? <HelpCircle size={20} /> :
                       <Info size={20} />}
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <h3 id="modal-title" className="text-lg font-bold text-slate-900 leading-6">{title}</h3>
                    {description ? (
                      <div className="mt-2 text-sm text-slate-500 leading-relaxed">{description}</div>
                    ) : null}
                  </div>
                  {showHeaderClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      aria-label={resolvedCloseLabel}
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {children && <div className="mt-4">{children}</div>}

                {(type === 'confirm' ||
                  type === 'danger' ||
                  type === 'warning' ||
                  onCancel ||
                  onConfirm ||
                  (!onConfirm && type === 'info' && footerCloseVisible)) && (
                <div className="mt-8 flex items-center justify-end gap-3">
                  {(type === 'confirm' || type === 'danger' || type === 'warning' || onCancel) && (
                    <button
                      onClick={() => {
                        onCancel?.();
                        onClose();
                      }}
                      className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      {cancelLabel}
                    </button>
                  )}
                  {onConfirm && (
                    <button
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                      className={cn(
                        "px-6 py-2 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95",
                        type === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200" :
                        type === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" :
                        "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
                      )}
                    >
                      {confirmLabel}
                    </button>
                  )}
                  {!onConfirm && type === 'info' && footerCloseVisible && (
                    <button
                      onClick={onClose}
                      className="px-6 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-95"
                    >
                      {resolvedCloseLabel}
                    </button>
                  )}
                </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
