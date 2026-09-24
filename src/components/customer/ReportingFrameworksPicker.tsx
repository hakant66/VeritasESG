/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { REPORTING_FRAMEWORKS } from '../../lib/reportingFrameworks';
import { useTranslation } from '../../hooks/useTranslation';

type ReportingFrameworksPickerProps = {
  initialKeys?: string[];
};

export function ReportingFrameworksPicker({ initialKeys = [] }: ReportingFrameworksPickerProps) {
  const { t, language } = useTranslation();
  const lang = language === 'tr' ? 'tr' : 'en';
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialKeys));

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.reportingFrameworksTitle}
        </h4>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.customers.reportingFrameworksHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {REPORTING_FRAMEWORKS.map((fw) => {
          const active = selected.has(fw.key);
          return (
            <label
              key={fw.key}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                name="reportingFrameworkKeys"
                value={fw.key}
                checked={active}
                onChange={() => toggle(fw.key)}
                className="sr-only"
              />
              {lang === 'tr' ? fw.labelTr : fw.labelEn}
            </label>
          );
        })}
      </div>
    </div>
  );
}
