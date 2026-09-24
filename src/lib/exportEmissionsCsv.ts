/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmissionCsvRow {
  customerName: string;
  year: number;
  facilityName?: string;
  scope: string;
  category: string;
  activityValue: number;
  activityUnit: string;
  factorValue: number;
  calculationFormula?: string;
  resultTCO2e: number;
  createdAt?: number;
}

export function exportEmissionsCsv(rows: EmissionCsvRow[], filename: string): void {
  const BOM = '﻿';
  const SEP = ';';
  const q = (v: string | number | undefined) => {
    const s = String(v ?? '');
    return s.includes(SEP) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Firma', 'Yıl', 'Tesis', 'Kapsam', 'Kategori', 'Aktivite Değeri', 'Birim', 'Faktör (kgCO2e/unit)', 'Formül', 'Sonuç (tCO2e)', 'Tarih'].join(SEP);
  const lines = rows.map((r) => [
    q(r.customerName), q(r.year), q(r.facilityName || '—'),
    q(r.scope), q(r.category), q(r.activityValue), q(r.activityUnit),
    q(r.factorValue), q(r.calculationFormula || ''), q(r.resultTCO2e),
    q(r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''),
  ].join(SEP));
  const csv = BOM + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
