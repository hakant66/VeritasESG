/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  getMacroSectorById,
  getSubSectorById,
  type SasbMacroSectorId,
  type SectorClassificationCatalog,
  BUILTIN_SECTOR_CLASSIFICATION_CATALOG,
} from '../../data/sectorClassification';
import { loadSectorClassificationCatalog } from '../../lib/sectorClassificationCatalog';
import { useTranslation } from '../../hooks/useTranslation';
import type { Customer } from '../../types';

type SectorClassificationDisplayProps = {
  customer: Pick<
    Customer,
    'naceCode' | 'naceDescription' | 'sasbMacroSector' | 'sasbSubSectorSics' | 'sectoralDefinition'
  >;
  notProvidedLabel: string;
};

function Field({ label, value, notProvidedLabel }: { label: string; value?: string; notProvidedLabel: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p
        className={`text-sm font-medium ${value ? 'text-slate-700' : 'italic text-slate-300'}`}
      >
        {value || notProvidedLabel}
      </p>
    </div>
  );
}

export function SectorClassificationDisplay({ customer, notProvidedLabel }: SectorClassificationDisplayProps) {
  const { t, language } = useTranslation();
  const lang = language === 'tr' ? 'tr' : 'en';
  const [catalog, setCatalog] = useState<SectorClassificationCatalog>(
    BUILTIN_SECTOR_CLASSIFICATION_CATALOG,
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

  const hasStructured =
    customer.naceCode ||
    customer.naceDescription ||
    customer.sasbMacroSector ||
    customer.sasbSubSectorSics;

  if (!hasStructured && customer.sectoralDefinition?.trim()) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {t.customers.sectorClassificationTitle}
          </h4>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {t.customers.sectorClassificationHint}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">{customer.sectoralDefinition}</p>
      </div>
    );
  }

  const macro = customer.sasbMacroSector
    ? getMacroSectorById(customer.sasbMacroSector as SasbMacroSectorId, catalog)
    : undefined;
  const sub = customer.sasbSubSectorSics
    ? getSubSectorById(customer.sasbSubSectorSics, catalog)
    : undefined;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.sectorClassificationTitle}
        </h4>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {t.customers.sectorClassificationHint}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t.customers.naceCodeLabel} value={customer.naceCode} notProvidedLabel={notProvidedLabel} />
        <Field
          label={t.customers.naceDescriptionLabel}
          value={customer.naceDescription}
          notProvidedLabel={notProvidedLabel}
        />
        <Field
          label={t.customers.sasbMacroSectorLabel}
          value={macro ? (lang === 'tr' ? macro.labelTr : macro.labelEn) : undefined}
          notProvidedLabel={notProvidedLabel}
        />
        <Field
          label={t.customers.sasbSubSectorLabel}
          value={
            sub
              ? `${customer.sasbSubSectorSics} — ${lang === 'tr' ? sub.labelTr : sub.labelEn}`
              : customer.sasbSubSectorSics
          }
          notProvidedLabel={notProvidedLabel}
        />
      </div>
    </div>
  );
}
