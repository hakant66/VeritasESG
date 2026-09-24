/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { exportMarkdownPreviewToPdf } from './exportMarkdownPreviewPdf.ts';

interface PdfEntry {
  facilityName?: string;
  scope: string;
  category: string;
  activityValue: number;
  activityUnit: string;
  factorValue: number;
  factorSource?: string;
  factorVersionYear?: number;
  calculationFormula?: string;
  resultTCO2e: number;
}

interface PdfOpts {
  customerName: string;
  year: number;
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  scope2LocationBased?: number;
  scope2MarketBased?: number | null;
  intensityMetrics?: { tCO2ePerMillionTRY: number | null; tCO2ePerProductionTon: number | null; tCO2ePerEmployee: number | null } | null;
  entries: PdfEntry[];
}

export async function exportEmissionsPdf(opts: PdfOpts): Promise<void> {
  const f = (n: number | null | undefined) => (n != null ? n.toFixed(3) + ' tCO₂e' : '—');
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-12000px;top:0;width:800px;font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;';

  const summaryRows = [
    ['Kapsam 1 (Doğrudan)', f(opts.scope1Total)],
    ['Kapsam 2 (Lokasyon Tabanlı)', f(opts.scope2LocationBased ?? opts.scope2Total)],
    ...(opts.scope2MarketBased != null ? [['Kapsam 2 (Piyasa Tabanlı)', f(opts.scope2MarketBased)]] : []),
    ['Kapsam 3 (Dolaylı)', f(opts.scope3Total)],
    ['Toplam (Kapsam 1+2)', f(opts.scope1Total + opts.scope2Total)],
    ...(opts.intensityMetrics ? [
      ['tCO₂e / Milyon TRY', opts.intensityMetrics.tCO2ePerMillionTRY != null ? opts.intensityMetrics.tCO2ePerMillionTRY.toFixed(4) : '—'],
      ['tCO₂e / Üretim Tonu', opts.intensityMetrics.tCO2ePerProductionTon != null ? opts.intensityMetrics.tCO2ePerProductionTon.toFixed(4) : '—'],
      ['tCO₂e / Çalışan', opts.intensityMetrics.tCO2ePerEmployee != null ? opts.intensityMetrics.tCO2ePerEmployee.toFixed(4) : '—'],
    ] : []),
  ];

  const tableStyle = 'border-collapse:collapse;width:100%;margin-bottom:16px;';
  const thStyle = 'background:#f1f5f9;padding:6px 8px;text-align:left;border:1px solid #cbd5e1;font-weight:600;';
  const tdStyle = 'padding:5px 8px;border:1px solid #cbd5e1;';

  div.innerHTML = `
    <h1 style="font-size:18px;margin-bottom:4px;">Emisyon Hesaplama Raporu</h1>
    <p style="color:#64748b;margin-bottom:16px;">${opts.customerName} — ${opts.year} Yılı</p>
    <h2 style="font-size:14px;margin-bottom:8px;">Kapsam Özeti</h2>
    <table style="${tableStyle}">
      <thead><tr><th style="${thStyle}">Metrik</th><th style="${thStyle}">Değer</th></tr></thead>
      <tbody>${summaryRows.map(([k, v]) => `<tr><td style="${tdStyle}">${k}</td><td style="${tdStyle}">${v}</td></tr>`).join('')}</tbody>
    </table>
    <h2 style="font-size:14px;margin-bottom:8px;">Hesaplama Detayları</h2>
    <table style="${tableStyle}">
      <thead><tr>
        ${['Tesis', 'Kapsam', 'Kategori', 'Aktivite', 'Birim', 'Faktör', 'Kaynak', 'Formül', 'Sonuç (tCO₂e)'].map((h) => `<th style="${thStyle}">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${opts.entries.map((e) => `<tr>
        <td style="${tdStyle}">${e.facilityName || '—'}</td>
        <td style="${tdStyle}">${e.scope.replace('SCOPE_', 'Kapsam ')}</td>
        <td style="${tdStyle}">${e.category}</td>
        <td style="${tdStyle}">${e.activityValue}</td>
        <td style="${tdStyle}">${e.activityUnit}</td>
        <td style="${tdStyle}">${e.factorValue}</td>
        <td style="${tdStyle}">${e.factorSource || ''}${e.factorVersionYear ? ' ' + e.factorVersionYear : ''}</td>
        <td style="${tdStyle}">${e.calculationFormula || ''}</td>
        <td style="${tdStyle}">${e.resultTCO2e.toFixed(4)}</td>
      </tr>`).join('')}</tbody>
    </table>`;

  document.body.appendChild(div);
  try {
    await exportMarkdownPreviewToPdf(div, `emisyon-raporu-${opts.customerName.replace(/[^\w.\-]+/g, '_')}-${opts.year}`);
  } finally {
    document.body.removeChild(div);
  }
}
