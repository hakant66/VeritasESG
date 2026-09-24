/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidBlock } from './MermaidBlock';

export const markdownRemarkPlugins = [remarkGfm];

function isMermaidCodeChild(child: React.ReactNode): boolean {
  if (!React.isValidElement(child)) return false;
  const props = child.props as { className?: string };
  return Boolean(props.className?.includes('language-mermaid'));
}

export const markdownComponents: Components = {
  table({ children, ...props }) {
    return (
      <div className="markdown-table-wrap">
        <table {...props}>{children}</table>
      </div>
    );
  },
  pre({ children, ...props }) {
    if (isMermaidCodeChild(children)) {
      return <>{children}</>;
    }
    return <pre {...props}>{children}</pre>;
  },
  code({ className, children, ...props }) {
    const text = String(children).replace(/\n$/, '');
    const match = /language-(\w+)/.exec(className ?? '');
    if (match?.[1] === 'mermaid') {
      return <MermaidBlock chart={text} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

type MarkdownContentProps = {
  children: string;
};

/** Shared markdown → HTML renderer (GFM tables, mermaid diagrams). */
export function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={markdownRemarkPlugins} components={markdownComponents}>
      {children}
    </ReactMarkdown>
  );
}
