/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubsidiaryEntry } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import {
  BUILTIN_SECTOR_CLASSIFICATION_CATALOG,
  type SectorClassificationCatalog,
} from '../../data/sectorClassification';
import { loadSectorClassificationCatalog } from '../../lib/sectorClassificationCatalog';

type SubsidiariesFieldProps = {
  initial?: SubsidiaryEntry[];
};

let rowIdSeq = 0;
function nextRowId() {
  rowIdSeq += 1;
  return `row-${rowIdSeq}`;
}

export function SubsidiariesField({ initial }: SubsidiariesFieldProps) {
  const { t, lang } = useTranslation();
  const [catalog, setCatalog] = useState<SectorClassificationCatalog>(
    BUILTIN_SECTOR_CLASSIFICATION_CATALOG,
  );
  const [rows, setRows] = useState<Array<SubsidiaryEntry & { _id: string }>>(() =>
    (initial ?? []).map((row) => ({ ...row, _id: nextRowId() })),
  );

  useEffect(() => {
    let cancelled = false;
    void loadSectorClassificationCatalog().then((loaded) => {
      if (!cancelled) setCatalog(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const subSectorOptions = useMemo(
    () =>
      [...catalog.subSectors].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id),
      ),
    [catalog],
  );

  const subSectorLabel = (id: string) => {
    const s = catalog.subSectors.find((row) => row.id === id);
    if (!s) return id;
    return lang === 'tr' ? s.labelTr : s.labelEn;
  };

  const updateRow = (id: string, patch: Partial<SubsidiaryEntry>) => {
    setRows((prev) => prev.map((row) => (row._id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { _id: nextRowId(), legalName: '' }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row._id !== id));
  };

  const jsonValue = useMemo(
    () => JSON.stringify(rows.map(({ _id, ...row }) => row)),
    [rows],
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="esg_subsidiariesJson" value={jsonValue} />

      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500">{t.customers.subsidiariesEmptyHint}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row._id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  className="minimal-input"
                  placeholder={t.customers.subsidiaryLegalNamePlaceholder}
                  value={row.legalName}
                  onChange={(e) => updateRow(row._id, { legalName: e.target.value })}
                />
                <select
                  className="minimal-input h-10 cursor-pointer"
                  value={row.sasbSubSectorSics ?? ''}
                  onChange={(e) => updateRow(row._id, { sasbSubSectorSics: e.target.value || undefined })}
                >
                  <option value="">{t.customers.sasbSubSectorPlaceholder}</option>
                  {subSectorOptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {subSectorLabel(sub.id)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="minimal-input sm:col-span-2"
                  placeholder={t.customers.subsidiaryAddressPlaceholder}
                  value={row.address ?? ''}
                  onChange={(e) => updateRow(row._id, { address: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  className="minimal-input"
                  placeholder={t.customers.subsidiaryEmployeeCountPlaceholder}
                  value={row.employeeCount ?? ''}
                  onChange={(e) =>
                    updateRow(row._id, {
                      employeeCount: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    checked={Boolean(row.includedInConsolidatedReporting)}
                    onChange={(e) =>
                      updateRow(row._id, { includedInConsolidatedReporting: e.target.checked })
                    }
                  />
                  {t.customers.subsidiaryIncludedInConsolidation}
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeRow(row._id)}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700"
              >
                <Trash2 size={12} /> {t.common.delete}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50"
      >
        <Plus size={12} /> {t.customers.subsidiariesAddRow}
      </button>
    </div>
  );
}
