/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  GRI_STANDARD_CATEGORY_ORDER,
  getGriStandardsByCategory,
  type GriStandardCategory,
} from '../../lib/griStandards';
import { useTranslation } from '../../hooks/useTranslation';

type GriStandardsPickerProps = {
  initialCodes?: string[];
};

export function GriStandardsPicker({ initialCodes = [] }: GriStandardsPickerProps) {
  const { t, lang } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialCodes));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categoryLabel = (category: GriStandardCategory): string => {
    switch (category) {
      case 'universal':
        return t.customers.griCategoryUniversal;
      case 'topic_2024':
        return t.customers.griCategoryTopic2024;
      case 'economic':
        return t.customers.griCategoryEconomic;
      case 'environmental':
        return t.customers.griCategoryEnvironmental;
      case 'social':
        return t.customers.griCategorySocial;
      default:
        return category;
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.griStandardsTitle}
        </h4>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.customers.griStandardsHint}</p>
      </div>

      {GRI_STANDARD_CATEGORY_ORDER.map((category) => {
        const items = getGriStandardsByCategory(category);
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
                      name="griStandardCodes"
                      value={item.id}
                      checked={active}
                      onChange={() => toggle(item.id)}
                      className="sr-only"
                    />
                    {item.code} — {name} ({item.year})
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
