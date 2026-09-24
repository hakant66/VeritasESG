/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTranslation } from '../../hooks/useTranslation';
import type { Customer } from '../../types';

type CustomerFinancialDataFieldsProps = {
  initial?: Pick<Customer, 'annualTurnoverMeur' | 'totalAssetsMeur'>;
};

export function CustomerFinancialDataFields({ initial }: CustomerFinancialDataFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {t.customers.financialDataTitle}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.annualTurnoverMeurLabel}
          </label>
          <input
            name="annualTurnoverMeur"
            type="number"
            min={0}
            step="any"
            className="minimal-input"
            defaultValue={initial?.annualTurnoverMeur ?? ''}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.totalAssetsMeurLabel}
          </label>
          <input
            name="totalAssetsMeur"
            type="number"
            min={0}
            step="any"
            className="minimal-input"
            defaultValue={initial?.totalAssetsMeur ?? ''}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}
