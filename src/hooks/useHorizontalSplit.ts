/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type UseHorizontalSplitOptions = {
  defaultPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  /** Reset when this key changes (e.g. modal open + question id). */
  resetKey?: string | null;
};

export function useHorizontalSplit({
  defaultPercent = 48,
  minPercent = 28,
  maxPercent = 72,
  resetKey = null,
}: UseHorizontalSplitOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [leftPercent, setLeftPercent] = useState(defaultPercent);

  useEffect(() => {
    setLeftPercent(defaultPercent);
  }, [resetKey, defaultPercent]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.min(maxPercent, Math.max(minPercent, pct)));
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
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [handleMouseMove, stopResizing],
  );

  useEffect(() => () => stopResizing(), [stopResizing]);

  return {
    containerRef,
    leftPercent,
    startResizing,
  };
}
