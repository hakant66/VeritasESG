/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ESG_MATERIALITY_TOPIC_IDS } from '../../data/esgMaterialityTopics';
import { matrixCoordinates } from '../../lib/materialityAssessment';
import type { MaterialityTopicScore } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

type MaterialityMatrixChartProps = {
  scores: Record<string, MaterialityTopicScore>;
  topicLabels: Record<string, string>;
};

const SIZE = 360;
const PAD = 44;

export function MaterialityMatrixChart({ scores, topicLabels }: MaterialityMatrixChartProps) {
  const { t } = useTranslation();
  const plot = SIZE - PAD * 2;

  const toPx = (value: number) => PAD + ((value - 1) / 4) * plot;

  const points = ESG_MATERIALITY_TOPIC_IDS.map((id) => {
    const score = scores[id];
    if (!score) return null;
    const { x, y } = matrixCoordinates(score);
    return {
      id,
      label: topicLabels[id] ?? id,
      cx: toPx(x),
      cy: toPx(5 - y),
    };
  }).filter(Boolean) as { id: string; label: string; cx: number; cy: number }[];

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {t.customers.materialityMatrixTitle}
      </h4>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto w-full max-w-md"
        role="img"
        aria-label={t.customers.materialityMatrixTitle}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <g key={`grid-${n}`}>
            <line
              x1={PAD}
              y1={toPx(6 - n)}
              x2={SIZE - PAD}
              y2={toPx(6 - n)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <line
              x1={toPx(n)}
              y1={PAD}
              x2={toPx(n)}
              y2={SIZE - PAD}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={PAD - 10} y={toPx(6 - n) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
              {n}
            </text>
            <text x={toPx(n)} y={SIZE - PAD + 18} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {n}
            </text>
          </g>
        ))}
        <rect
          x={PAD}
          y={PAD}
          width={plot}
          height={plot}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <text
          x={SIZE / 2}
          y={SIZE - 8}
          textAnchor="middle"
          className="fill-slate-500 text-[9px] font-bold uppercase"
        >
          {t.customers.materialityAxisFinancial}
        </text>
        <text
          x={12}
          y={SIZE / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${SIZE / 2})`}
          className="fill-slate-500 text-[9px] font-bold uppercase"
        >
          {t.customers.materialityAxisImpact}
        </text>
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={p.cx} cy={p.cy} r={7} fill="#0f172a" opacity={0.85} />
            <title>{p.label}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
