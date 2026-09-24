/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabular view of aggregated topic scores + CSV export in the existing
 * materiality scoring schema (reuses exportMaterialityScoresCsv).
 */

import { Button } from '../../../shared/ui/button.tsx';
import { exportMaterialityScoresCsv, type MaterialityScoreCsvRow } from '../../../lib/materialityScoringCsv.ts';
import type { MatrixResponse, MatrixTopic } from '../api/surveysApi.ts';

const score = (t: MatrixTopic) => Math.max(t.financial, t.impact);

export function MaterialityScoringTable({ data }: { data: MatrixResponse }) {
  const rows = [...data.topics].sort((a, b) => score(b) - score(a));

  const exportCsv = () => {
    const csvRows: MaterialityScoreCsvRow[] = rows.map((t) => ({
      id: t.topicRef,
      subject: t.subject,
      griMapping: t.griMapping,
      disclosures: t.disclosures,
      financialImpact: Math.round(t.financialAvg),
      impactSeverity: Math.round(t.severityAvg),
      probability: Math.round(t.probabilityAvg),
      stakeholderConcern: Math.round(t.scopeAvg),
      isMaterial: t.isMaterial,
      notes: '',
    }));
    exportMaterialityScoresCsv(csvRows, `${data.survey.title || 'materiality-survey'}.csv`);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Puanlama Tablosu</h4>
        <Button variant="secondary" disabled={rows.length === 0} onClick={exportCsv}>CSV Dışa Aktar</Button>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-slate-400">Henüz konu yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 text-left text-[11px] uppercase text-slate-400">
                <th className="px-4 py-2 font-semibold">Konu</th>
                <th className="px-3 py-2 text-right font-semibold">Finansal</th>
                <th className="px-3 py-2 text-right font-semibold">Etki</th>
                <th className="px-3 py-2 text-right font-semibold">Yanıt</th>
                <th className="px-3 py-2 text-center font-semibold">Önemli</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.topicRef} className="border-b border-slate-50">
                  <td className="px-4 py-2 text-slate-700">{t.subject}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{t.financial.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{t.impact.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{t.responseCount}</td>
                  <td className="px-3 py-2 text-center">
                    {t.isMaterial ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Evet</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
