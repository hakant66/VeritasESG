/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  applyMaterialityCsvImport,
  exportMaterialityScoresCsv,
  parseMaterialityScoresCsv,
  readFileAsText,
  type MaterialityScoreCsvRow,
} from '../../lib/materialityScoringCsv';

type MaterialityScoreCsvButtonsProps<T extends MaterialityScoreCsvRow> = {
  rows: T[];
  framework: 'gri' | 'esrs' | 'issb';
  customerId: string;
  year: number;
  disabled?: boolean;
  onImported: (rows: T[]) => void | Promise<void>;
  onMessage?: (message: { ok: boolean; text: string }) => void;
};

export function MaterialityScoreCsvButtons<T extends MaterialityScoreCsvRow>({
  rows,
  framework,
  customerId,
  year,
  disabled,
  onImported,
  onMessage,
}: MaterialityScoreCsvButtonsProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = useCallback(() => {
    if (rows.length === 0) {
      onMessage?.({ ok: false, text: 'Dışa aktarılacak satır yok.' });
      return;
    }
    const safeCustomer = String(customerId || 'firma').replace(/[^\w.\-]+/g, '_');
    exportMaterialityScoresCsv(
      rows,
      `onceliklendirme-${framework}-${safeCustomer}-${year}.csv`,
    );
    onMessage?.({ ok: true, text: 'CSV indirildi' });
  }, [rows, framework, customerId, year, onMessage]);

  const handleImportFile = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const text = await readFileAsText(file);
        const parsed = parseMaterialityScoresCsv(text);
        if (parsed.length === 0) {
          throw new Error('CSV içinde aktarılacak satır bulunamadı.');
        }
        const { rows: next, matched, unmatched } = applyMaterialityCsvImport(rows, parsed);
        if (matched === 0) {
          throw new Error(
            'Hiçbir satır eşleşmedi. CSV’deki id veya subject alanlarının mevcut konularla uyumlu olduğundan emin olun.',
          );
        }
        await onImported(next);
        onMessage?.({
          ok: true,
          text:
            unmatched > 0
              ? `${matched} satır içe aktarıldı, ${unmatched} satır eşleşmedi.`
              : `${matched} satır içe aktarıldı.`,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'CSV içe aktarma başarısız.';
        onMessage?.({ ok: false, text: message });
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [rows, onImported, onMessage],
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy || rows.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
        title="CSV içe aktar"
      >
        <Upload size={16} /> {busy ? 'Aktarılıyor…' : 'CSV İçe Aktar'}
      </button>
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || busy || rows.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
        title="CSV dışa aktar"
      >
        <Download size={16} /> CSV Dışa Aktar
      </button>
    </>
  );
}
