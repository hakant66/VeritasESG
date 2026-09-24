/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Double-materiality scatter for a survey's topics: x = financial materiality,
 * y = impact materiality (both on the 1..scaleMax axis). Dot size scales with
 * response count; material topics (past threshold) are highlighted. Dedicated
 * SVG because the DMA MaterialityMatrixChart is bound to fixed ESG topic ids.
 */

import type { MatrixResponse } from '../api/surveysApi.ts';

const SIZE = 380;
const PAD = 48;

export function SurveyMaterialityMatrix({ data }: { data: MatrixResponse }) {
  const { scaleMax, materialThreshold } = data.survey;
  const plot = SIZE - PAD * 2;
  const span = Math.max(1, scaleMax - 1);
  const toX = (v: number) => PAD + ((v - 1) / span) * plot;
  const toY = (v: number) => PAD + plot - ((v - 1) / span) * plot;

  const maxRc = Math.max(1, ...data.topics.map((t) => t.responseCount));
  const radius = (rc: number) => 5 + (rc / maxRc) * 9;

  const scored = data.topics.filter((t) => t.responseCount > 0);
  const thr = materialThreshold ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Önemlilik Matrisi</h4>
      {scored.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Henüz yanıt yok — matris yanıtlar geldikçe oluşur.</p>
      ) : (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[420px]">
          {/* grid + axes */}
          <rect x={PAD} y={PAD} width={plot} height={plot} fill="#f8fafc" stroke="#e2e8f0" />
          {thr != null && (
            <>
              <line x1={toX(thr)} y1={PAD} x2={toX(thr)} y2={PAD + plot} stroke="#fca5a5" strokeDasharray="4 3" />
              <line x1={PAD} y1={toY(thr)} x2={PAD + plot} y2={toY(thr)} stroke="#fca5a5" strokeDasharray="4 3" />
            </>
          )}
          {/* axis labels */}
          <text x={PAD + plot / 2} y={SIZE - 12} textAnchor="middle" className="fill-slate-500" fontSize="11">
            Finansal önemlilik →
          </text>
          <text x={16} y={PAD + plot / 2} textAnchor="middle" fontSize="11" className="fill-slate-500" transform={`rotate(-90 16 ${PAD + plot / 2})`}>
            Etki önemliliği →
          </text>
          {/* points */}
          {scored.map((t) => (
            <g key={t.topicRef}>
              <circle
                cx={toX(t.financial)}
                cy={toY(t.impact)}
                r={radius(t.responseCount)}
                fill={t.isMaterial ? 'rgba(16,185,129,0.75)' : 'rgba(100,116,139,0.55)'}
                stroke={t.isMaterial ? '#059669' : '#64748b'}
              />
              <title>{`${t.subject} — F:${t.financial.toFixed(1)} / E:${t.impact.toFixed(1)} (${t.responseCount})`}</title>
            </g>
          ))}
        </svg>
      )}
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Önemli</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" /> Önemli değil</span>
        <span>Nokta boyutu = yanıt sayısı</span>
      </div>
    </div>
  );
}
