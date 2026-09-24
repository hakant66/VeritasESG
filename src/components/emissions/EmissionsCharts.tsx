/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dependency-free inline SVG charts for the Emissions module.
 */

const SCOPE1_COLOR = '#fb923c';
const SCOPE2_COLOR = '#60a5fa';
const SCOPE3_COLOR = '#c084fc';
const AXIS_COLOR = '#cbd5e1';
const LABEL_COLOR = '#64748b';
const EMPTY_COLOR = '#94a3b8';

interface YearlyBarChartProps {
  data: Array<{ year: number; scope1Total: number; scope2Total: number }>;
}

export function YearlyBarChart({ data }: YearlyBarChartProps) {
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = 500 - paddingLeft - paddingRight; // 430
  const chartHeight = 260 - paddingTop - paddingBottom; // 200

  const hasData = data.length > 0 && data.some((d) => d.scope1Total + d.scope2Total > 0);

  if (!hasData) {
    return (
      <svg viewBox="0 0 500 260" width="100%" role="img" aria-label="Yıllara göre emisyon grafiği">
        <text x="250" y="130" textAnchor="middle" fill={EMPTY_COLOR} fontSize="14">
          Veri yok
        </text>
      </svg>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.scope1Total + d.scope2Total), 0.001);
  const barWidth = Math.min(60, (chartWidth / data.length) * 0.6);
  const gap = (chartWidth - barWidth * data.length) / (data.length + 1);

  const gridLevels = [0, 0.33, 0.67, 1];

  return (
    <svg viewBox="0 0 500 260" width="100%" role="img" aria-label="Yıllara göre emisyon grafiği">
      {/* Gridlines + y-axis labels */}
      {gridLevels.map((level) => {
        const y = paddingTop + (1 - level) * chartHeight;
        return (
          <g key={level}>
            <line x1={paddingLeft} y1={y} x2={paddingLeft + chartWidth} y2={y} stroke={AXIS_COLOR} strokeWidth={0.5} />
            <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fill={LABEL_COLOR} fontSize="9">
              {(maxTotal * level).toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const total = d.scope1Total + d.scope2Total;
        const x = paddingLeft + gap * (i + 1) + barWidth * i;
        const s1Height = (d.scope1Total / maxTotal) * chartHeight;
        const s2Height = (d.scope2Total / maxTotal) * chartHeight;
        const baseY = paddingTop + chartHeight;
        const s1Y = baseY - s1Height;
        const s2Y = s1Y - s2Height;
        return (
          <g key={d.year}>
            <rect x={x} y={s1Y} width={barWidth} height={s1Height} fill={SCOPE1_COLOR} />
            <rect x={x} y={s2Y} width={barWidth} height={s2Height} fill={SCOPE2_COLOR} />
            <text x={x + barWidth / 2} y={s2Y - 4} textAnchor="middle" fill={LABEL_COLOR} fontSize="9">
              {total.toFixed(1)}t
            </text>
            <text x={x + barWidth / 2} y={baseY + 14} textAnchor="middle" fill={LABEL_COLOR} fontSize="10">
              {d.year}
            </text>
          </g>
        );
      })}

      {/* Legend (top-right) */}
      <g>
        <rect x={500 - paddingRight - 150} y={paddingTop - 12} width={10} height={10} fill={SCOPE1_COLOR} />
        <text x={500 - paddingRight - 136} y={paddingTop - 3} fill={LABEL_COLOR} fontSize="10">
          Kapsam 1
        </text>
        <rect x={500 - paddingRight - 75} y={paddingTop - 12} width={10} height={10} fill={SCOPE2_COLOR} />
        <text x={500 - paddingRight - 61} y={paddingTop - 3} fill={LABEL_COLOR} fontSize="10">
          Kapsam 2
        </text>
      </g>
    </svg>
  );
}

interface ScopeDistributionPieProps {
  scope1: number;
  scope2: number;
  scope3: number;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeSlice(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.999;
  const [x1, y1] = polarToXY(cx, cy, r, startDeg);
  const [x2, y2] = polarToXY(cx, cy, r, endDeg);
  const [ix1, iy1] = polarToXY(cx, cy, innerR, endDeg);
  const [ix2, iy2] = polarToXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
}

export function ScopeDistributionPie({ scope1, scope2, scope3 }: ScopeDistributionPieProps) {
  const cx = 110;
  const cy = 100;
  const r = 80;
  const innerR = 44;

  const total = scope1 + scope2 + scope3;

  if (total <= 0) {
    return (
      <svg viewBox="0 0 320 200" width="100%" role="img" aria-label="Kapsam dağılımı grafiği">
        <text x="110" y="105" textAnchor="middle" fill={EMPTY_COLOR} fontSize="14">
          Veri yok
        </text>
      </svg>
    );
  }

  const segments = [
    { label: 'Kapsam 1', value: scope1, color: SCOPE1_COLOR },
    { label: 'Kapsam 2', value: scope2, color: SCOPE2_COLOR },
    { label: 'Kapsam 3', value: scope3, color: SCOPE3_COLOR },
  ];

  let angleCursor = 0;
  const slices = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * 360;
      const start = angleCursor;
      const end = angleCursor + sweep;
      angleCursor = end;
      return {
        ...s,
        path: describeSlice(cx, cy, r, innerR, start, end),
        percent: (s.value / total) * 100,
      };
    });

  return (
    <svg viewBox="0 0 320 200" width="100%" role="img" aria-label="Kapsam dağılımı grafiği">
      {slices.map((slice) => (
        <path key={slice.label} d={slice.path} fill={slice.color} />
      ))}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="600">
        {total.toFixed(1)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={LABEL_COLOR} fontSize="10">
        tCO₂e
      </text>

      {/* Legend (right) */}
      {segments.map((s, idx) => {
        const percent = s.value > 0 ? (s.value / total) * 100 : 0;
        const ly = 70 + idx * 24;
        return (
          <g key={s.label}>
            <rect x={210} y={ly} width={12} height={12} fill={s.color} />
            <text x={228} y={ly + 10} fill={LABEL_COLOR} fontSize="11">
              {`${s.label} — ${percent.toFixed(1)}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
