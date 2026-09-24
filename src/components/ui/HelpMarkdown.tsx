/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';
import { MarkdownContent } from './MarkdownContent';

type HelpMarkdownProps = {
  children: string;
  className?: string;
  emptyFallback?: React.ReactNode;
  /** Wrapper style preset; defaults to help-markdown. */
  variant?: 'help' | 'chat';
};

/**
 * Renders markdown with shared styles (GFM tables, mermaid diagrams).
 */
export function HelpMarkdown({
  children,
  className,
  emptyFallback = <p className="text-slate-400 italic">—</p>,
  variant = 'help',
}: HelpMarkdownProps) {
  const wrapperClass = variant === 'chat' ? 'chat-markdown' : 'help-markdown';
  const trimmed = children?.trim() ?? '';

  if (!trimmed) {
    return <div className={cn(wrapperClass, 'max-w-none', className)}>{emptyFallback}</div>;
  }

  return (
    <div className={cn(wrapperClass, 'max-w-none', className)}>
      <MarkdownContent>{children}</MarkdownContent>
    </div>
  );
}
