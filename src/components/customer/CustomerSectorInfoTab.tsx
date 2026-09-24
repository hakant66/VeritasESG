/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Segment } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { SectorClassificationFields } from './SectorClassificationFields';

export type CustomerSectorInfoTabProps = {
  customer?: Customer | null;
  sectors: Segment[];
};

export function CustomerSectorInfoTab({ customer, sectors }: CustomerSectorInfoTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.editCustomerSectorsLabel}
        </h4>
        <p className="text-[11px] text-slate-500">{t.customers.platformSectorsHint}</p>
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-white p-3 sm:grid-cols-3">
          {sectors.map((s) => (
            <label key={s.id} className="group flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="sectorIds"
                value={s.id}
                defaultChecked={customer?.sectorIds?.includes(s.id)}
                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="truncate text-[11px] text-slate-600 group-hover:text-slate-900">{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      <SectorClassificationFields initial={customer ?? undefined} />
    </div>
  );
}
