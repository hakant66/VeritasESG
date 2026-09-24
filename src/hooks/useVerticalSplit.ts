/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type UseVerticalSplitOptions = {
  defaultPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  /** Reset when this key changes (e.g. new gantt row selection). */
  resetKey?: string | null;
};

/** Top/bottom split; drag the horizontal handle to resize (row-resize cursor). */
export function useVerticalSplit({
  defaultPercent = 42,
  minPercent = 22,
  maxPercent = 78,
  resetKey = null,
}: UseVerticalSplitOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [topPercent, setTopPercent] = useState(defaultPercent);

  useEffect(() => {
    setTopPercent(defaultPercent);
  }, [resetKey, defaultPercent]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setTopPercent(Math.min(maxPercent, Math.max(minPercent, pct)));
    },
    [minPercent, maxPercent],
  );

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [handleMouseMove, stopResizing],
  );

  useEffect(() => () => stopResizing(), [stopResizing]);

  return {
    containerRef,
    topPercent,
    startResizing,
  };
}
