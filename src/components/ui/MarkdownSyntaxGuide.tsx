/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

type MarkdownSyntaxGuideProps = {
  className?: string;
  /** When true, section starts expanded. */
  defaultOpen?: boolean;
};

export function MarkdownSyntaxGuide({ className, defaultOpen = false }: MarkdownSyntaxGuideProps) {
  const { t } = useTranslation();

  return (
    <details
      open={defaultOpen || undefined}
      className={cn(
        'group overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100/90 [&::-webkit-details-marker]:hidden">
        <span>{t.templates.explorerMarkdownExamplesToggle}</span>
        <ChevronDown
          size={16}
          className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-200 px-3 py-3">
        <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-slate-700">
          {t.templates.explorerMarkdownExamplesBody}
        </pre>
      </div>
    </details>
  );
}
