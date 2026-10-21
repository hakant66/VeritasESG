/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  ESRS_STANDARD_CATEGORY_ORDER,
  getEsrsStandardsByCategory,
  type EsrsStandardCategory,
} from '../../lib/esrsStandards';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettings } from '../../lib/SettingsContext';

type EsrsStandardsPickerProps = {
  initialCodes?: string[];
};

export function EsrsStandardsPicker({ initialCodes = [] }: EsrsStandardsPickerProps) {
  const { t, lang } = useTranslation();
  const { settings } = useSettings();
  const disabledIds = settings.disabledEsrsStandardIds || [];
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialCodes));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categoryLabel = (category: EsrsStandardCategory): string => {
    switch (category) {
      case 'general':
        return t.customers.esrsCategoryGeneral;
      case 'environmental':
        return t.customers.esrsCategoryEnvironmental;
      case 'social':
        return t.customers.esrsCategorySocial;
      case 'governance':
        return t.customers.esrsCategoryGovernance;
      default:
        return category;
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.esrsStandardsTitle}
        </h4>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.customers.esrsStandardsHint}</p>
      </div>

      {ESRS_STANDARD_CATEGORY_ORDER.map((category) => {
        // Keep an already-selected-but-now-disabled standard visible so a save doesn't silently drop it.
        const items = getEsrsStandardsByCategory(category, disabledIds).concat(
          getEsrsStandardsByCategory(category, []).filter(
            (s) => disabledIds.includes(s.id) && selected.has(s.id),
          ),
        );
        if (items.length === 0) return null;
        return (
          <div key={category} className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {categoryLabel(category)}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const active = selected.has(item.id);
                const name = lang === 'tr' ? item.nameTr : item.nameEn;
                return (
                  <label
                    key={item.id}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="esrsStandardCodes"
                      value={item.id}
                      checked={active}
                      onChange={() => toggle(item.id)}
                      className="sr-only"
                    />
                    {item.code} — {name}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
