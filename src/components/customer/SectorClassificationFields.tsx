/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  lookupNaceCode,
  getDefaultNaceForSasbSubSector,
  getSubSectorsForMacro,
  getSubSectorById,
  getMacroSectorById,
  parseLegacySectoralDefinition,
  type SasbMacroSectorId,
  type SectorClassificationCatalog,
  BUILTIN_SECTOR_CLASSIFICATION_CATALOG,
} from '../../data/sectorClassification';
import { loadSectorClassificationCatalog } from '../../lib/sectorClassificationCatalog';
import { useTranslation } from '../../hooks/useTranslation';

export type SectorClassificationValues = {
  naceCode: string;
  naceDescription: string;
  sasbMacroSector: string;
  sasbSubSectorSics: string;
};

type SectorClassificationFieldsProps = {
  initial?: Partial<SectorClassificationValues> & { sectoralDefinition?: string };
};

export function SectorClassificationFields({ initial }: SectorClassificationFieldsProps) {
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

  const resolvedInitial = useMemo((): SectorClassificationValues => {
    const legacyCode = parseLegacySectoralDefinition(initial?.sectoralDefinition);
    const naceCode = initial?.naceCode?.trim() || legacyCode || '';
    const lookup = naceCode ? lookupNaceCode(naceCode, catalog) : null;

    return {
      naceCode,
      naceDescription:
        initial?.naceDescription?.trim() ||
        (lookup ? (lang === 'tr' ? lookup.entry.descriptionTr : lookup.entry.descriptionEn) : ''),
      sasbMacroSector:
        initial?.sasbMacroSector?.trim() ||
        lookup?.macroSector.id ||
        '',
      sasbSubSectorSics:
        initial?.sasbSubSectorSics?.trim() ||
        lookup?.subSector.id ||
        '',
    };
  }, [initial, lang, catalog]);

  const [naceCode, setNaceCode] = useState(resolvedInitial.naceCode);
  const [naceDescription, setNaceDescription] = useState(resolvedInitial.naceDescription);
  const [sasbMacroSector, setSasbMacroSector] = useState(resolvedInitial.sasbMacroSector);
  const [sasbSubSectorSics, setSasbSubSectorSics] = useState(resolvedInitial.sasbSubSectorSics);
  const [autoMatchedSubId, setAutoMatchedSubId] = useState<string | null>(null);
  const [naceSuggestedFromSasb, setNaceSuggestedFromSasb] = useState(false);

  useEffect(() => {
    setNaceCode(resolvedInitial.naceCode);
    setNaceDescription(resolvedInitial.naceDescription);
    setSasbMacroSector(resolvedInitial.sasbMacroSector);
    setSasbSubSectorSics(resolvedInitial.sasbSubSectorSics);
    setAutoMatchedSubId(null);
    setNaceSuggestedFromSasb(false);
  }, [resolvedInitial]);

  const subSectorOptions = useMemo(() => {
    if (!sasbMacroSector) return [];
    return getSubSectorsForMacro(sasbMacroSector as SasbMacroSectorId, catalog);
  }, [sasbMacroSector, catalog]);

  const selectedSubSector = sasbSubSectorSics
    ? getSubSectorById(sasbSubSectorSics, catalog)
    : undefined;

  const applyNaceFromSasbSubSector = (subId: string) => {
    const entry = getDefaultNaceForSasbSubSector(subId, catalog);
    if (!entry) {
      setNaceSuggestedFromSasb(false);
      return;
    }
    setNaceCode(entry.code);
    setNaceDescription(lang === 'tr' ? entry.descriptionTr : entry.descriptionEn);
    setAutoMatchedSubId(null);
    setNaceSuggestedFromSasb(true);
  };

  const applyNaceLookup = (raw: string) => {
    const normalized = raw.trim().toUpperCase();
    setNaceCode(normalized);
    setNaceSuggestedFromSasb(false);

    const result = lookupNaceCode(normalized, catalog);
    if (!result) {
      setAutoMatchedSubId(null);
      return;
    }

    setNaceDescription(lang === 'tr' ? result.entry.descriptionTr : result.entry.descriptionEn);
    setSasbMacroSector(result.macroSector.id);
    setSasbSubSectorSics(result.subSector.id);
    setAutoMatchedSubId(result.subSector.id);
  };

  const handleMacroChange = (macroId: string) => {
    setSasbMacroSector(macroId);
    const subs = macroId ? getSubSectorsForMacro(macroId as SasbMacroSectorId, catalog) : [];
    const nextSubId = subs.some((s) => s.id === sasbSubSectorSics)
      ? sasbSubSectorSics
      : (subs[0]?.id ?? '');
    setSasbSubSectorSics(nextSubId);
    setAutoMatchedSubId(null);
    if (nextSubId) {
      applyNaceFromSasbSubSector(nextSubId);
    } else {
      setNaceSuggestedFromSasb(false);
    }
  };

  const handleSubSectorChange = (subId: string) => {
    setSasbSubSectorSics(subId);
    setAutoMatchedSubId(null);
    if (subId) {
      applyNaceFromSasbSubSector(subId);
    } else {
      setNaceSuggestedFromSasb(false);
    }
  };

  const macroLabel = (id: SasbMacroSectorId) => {
    const m = getMacroSectorById(id, catalog);
    if (!m) return id;
    return lang === 'tr' ? m.labelTr : m.labelEn;
  };

  const subLabel = (id: string) => {
    const s = getSubSectorById(id, catalog);
    if (!s) return id;
    return lang === 'tr' ? s.labelTr : s.labelEn;
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.customers.sectorClassificationTitle}
        </h4>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
          {t.customers.sectorClassificationHint}
        </p>
      </div>

      <input type="hidden" name="naceCode" value={naceCode} />
      <input type="hidden" name="naceDescription" value={naceDescription} />
      <input type="hidden" name="sasbMacroSector" value={sasbMacroSector} />
      <input type="hidden" name="sasbSubSectorSics" value={sasbSubSectorSics} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.naceCodeLabel}
          </label>
          <input
            type="text"
            className="minimal-input"
            value={naceCode}
            onChange={(e) => {
              setNaceCode(e.target.value.toUpperCase());
              setNaceSuggestedFromSasb(false);
              setAutoMatchedSubId(null);
            }}
            onBlur={(e) => applyNaceLookup(e.target.value)}
            placeholder={t.customers.naceCodePlaceholder}
          />
          {naceSuggestedFromSasb && naceCode ? (
            <p className="text-[10px] font-semibold text-emerald-600">
              {t.customers.naceSuggestedFromSasb.replace('{code}', naceCode)}
            </p>
          ) : autoMatchedSubId && sasbSubSectorSics === autoMatchedSubId ? (
            <p className="text-[10px] font-semibold text-emerald-600">
              {t.customers.naceAutoMatched.replace('{code}', sasbSubSectorSics)}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.naceDescriptionLabel}
          </label>
          <input
            type="text"
            className="minimal-input"
            value={naceDescription}
            onChange={(e) => setNaceDescription(e.target.value)}
            placeholder={t.customers.naceDescriptionPlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.sasbMacroSectorLabel}
          </label>
          <div className="relative">
            <select
              className="minimal-input h-10 cursor-pointer appearance-none pr-10"
              value={sasbMacroSector}
              onChange={(e) => handleMacroChange(e.target.value)}
            >
              <option value="">{t.customers.sasbMacroSectorPlaceholder}</option>
              {catalog.macros.map((macro) => (
                <option key={macro.id} value={macro.id}>
                  {macroLabel(macro.id)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {t.customers.sasbSubSectorLabel}
          </label>
          <div className="relative">
            <select
              className="minimal-input h-10 cursor-pointer appearance-none pr-10"
              value={sasbSubSectorSics}
              onChange={(e) => handleSubSectorChange(e.target.value)}
              disabled={!sasbMacroSector}
            >
              <option value="">{t.customers.sasbSubSectorPlaceholder}</option>
              {subSectorOptions.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {subLabel(sub.id)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronDown size={14} />
            </div>
            </div>
          {selectedSubSector ? (
            <p className="text-[10px] text-slate-500">
              {t.customers.sasbSelectedSics.replace(
                '{name}',
                lang === 'tr' ? selectedSubSector.labelTr : selectedSubSector.labelEn,
              )}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
