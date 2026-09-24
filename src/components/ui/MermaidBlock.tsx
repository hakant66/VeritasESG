/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });
  mermaidInitialized = true;
}

type MermaidBlockProps = {
  chart: string;
};

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    const source = chart.trim();
    if (!el || !source) return;

    let cancelled = false;
    ensureMermaidInitialized();
    setError(null);

    void (async () => {
      try {
        const { svg } = await mermaid.render(`mmd-${reactId}`, source);
        if (!cancelled) {
          el.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not render diagram');
          el.innerHTML = '';
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className="help-mermaid help-mermaid--error" role="alert">
        <p className="text-xs font-medium text-amber-800">{error}</p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-slate-600">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="help-mermaid my-3 flex justify-center overflow-x-auto rounded-lg border border-slate-200 bg-white p-3"
      role="img"
      aria-label="Diagram"
    />
  );
}
