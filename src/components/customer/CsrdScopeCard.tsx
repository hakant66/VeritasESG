/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { computeCsrdScopeStatus } from '../../lib/reportingFrameworks';
import { useTranslation } from '../../hooks/useTranslation';
import type { Customer } from '../../types';

type CsrdScopeCardProps = {
  initial?: Pick<
    Customer,
    'csrdScopeEmployeeCount' | 'csrdScopeTurnoverMeur' | 'csrdScopeAssetsMeur' | 'isPublicInterestEntity'
  >;
};

export function CsrdScopeCard({ initial }: CsrdScopeCardProps) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState(String(initial?.csrdScopeEmployeeCount ?? ''));
  const [turnover, setTurnover] = useState(String(initial?.csrdScopeTurnoverMeur ?? ''));
  const [assets, setAssets] = useState(String(initial?.csrdScopeAssetsMeur ?? ''));
  const [isPie, setIsPie] = useState(initial?.isPublicInterestEntity ?? false);

  const status = useMemo(
    () =>
      computeCsrdScopeStatus({
        employeeCount: employees === '' ? undefined : Number(employees),
        turnoverMeur: turnover === '' ? undefined : Number(turnover),
        assetsMeur: assets === '' ? undefined : Number(assets),
        isPie,
      }),
    [employees, turnover, assets, isPie],
  );

  const badgeClass =
    status === 'in_scope'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'pie'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

  const badgeLabel =
    status === 'in_scope'
      ? t.customers.csrdScopeInScope
      : status === 'pie'
        ? t.customers.csrdScopePieBadge
        : t.customers.csrdScopeOutOfScope;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.csrdScopeTitle}
        </h4>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.customers.csrdScopeHint}</p>
        <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">{t.customers.tsrsScopeHint}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.csrdScopeEmployees}
          </label>
          <input
            name="csrdScopeEmployeeCount"
            type="number"
            min={0}
            className="minimal-input"
            value={employees}
            onChange={(e) => setEmployees(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.csrdScopeTurnover}
          </label>
          <input
            name="csrdScopeTurnoverMeur"
            type="number"
            min={0}
            step="any"
            className="minimal-input"
            value={turnover}
            onChange={(e) => setTurnover(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.csrdScopeAssets}
          </label>
          <input
            name="csrdScopeAssetsMeur"
            type="number"
            min={0}
            step="any"
            className="minimal-input"
            value={assets}
            onChange={(e) => setAssets(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
          <input
            type="checkbox"
            name="isPublicInterestEntity"
            checked={isPie}
            onChange={(e) => setIsPie(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {t.customers.csrdScopePie}
        </label>
        <span className={`rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}
