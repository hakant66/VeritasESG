/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useId, useMemo, useState } from 'react';
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
import { resolvePlatformSectorIds } from '../../lib/resolvePlatformSectorIds';
import type { Segment } from '../../types';

export type SectorClassificationValues = {
  naceCode: string;
  naceDescription: string;
  sasbMacroSector: string;
  sasbSubSectorSics: string;
};

type ClassificationMode = 'sasb' | 'nace';

type SectorClassificationFieldsProps = {
  initial?: Partial<SectorClassificationValues> & { sectoralDefinition?: string };
  /** Platform sectors (Segments); used to derive the hidden `sectorIds` from the NACE/SASB selection. */
  sectors: Segment[];
};

/** Strips the " — description" suffix a datalist selection appends, leaving just the NACE code. */
function extractNaceCodeToken(raw: string): string {
  const trimmed = raw.trim();
  const dashIndex = trimmed.indexOf('—');
  return (dashIndex >= 0 ? trimmed.slice(0, dashIndex) : trimmed).trim();
}

export function SectorClassificationFields({ initial, sectors }: SectorClassificationFieldsProps) {
  const { t, lang } = useTranslation();
  const naceDatalistId = useId();
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

  const [mode, setMode] = useState<ClassificationMode>(() =>
    resolvedInitial.sasbSubSectorSics ? 'sasb' : resolvedInitial.naceCode ? 'nace' : 'sasb',
  );
  const [naceCode, setNaceCode] = useState(resolvedInitial.naceCode);
  const [naceDescription, setNaceDescription] = useState(resolvedInitial.naceDescription);
  const [sasbMacroSector, setSasbMacroSector] = useState(resolvedInitial.sasbMacroSector);
  const [sasbSubSectorSics, setSasbSubSectorSics] = useState(resolvedInitial.sasbSubSectorSics);
  const [autoMatchedSubId, setAutoMatchedSubId] = useState<string | null>(null);
  const [naceSuggestedFromSasb, setNaceSuggestedFromSasb] = useState(false);
  const [naceSearchText, setNaceSearchText] = useState(resolvedInitial.naceCode);

  useEffect(() => {
    setNaceCode(resolvedInitial.naceCode);
    setNaceDescription(resolvedInitial.naceDescription);
    setSasbMacroSector(resolvedInitial.sasbMacroSector);
    setSasbSubSectorSics(resolvedInitial.sasbSubSectorSics);
    setAutoMatchedSubId(null);
    setNaceSuggestedFromSasb(false);
    setNaceSearchText(resolvedInitial.naceCode);
    setMode(resolvedInitial.sasbSubSectorSics ? 'sasb' : resolvedInitial.naceCode ? 'nace' : 'sasb');
  }, [resolvedInitial]);

  // Keep the search box in sync whenever the committed NACE code changes (lookup match,
  // SASB-driven suggestion, etc.) without interfering while the user is actively typing.
  useEffect(() => {
    setNaceSearchText(naceCode);
  }, [naceCode]);

  const sortedMacros = useMemo(
    () =>
      [...catalog.macros].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id),
      ),
    [catalog],
  );

  const subSectorsByMacro = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getSubSectorsForMacro>>();
    for (const macro of sortedMacros) {
      map.set(macro.id, getSubSectorsForMacro(macro.id, catalog));
    }
    return map;
  }, [sortedMacros, catalog]);

  const naceDatalistOptions = useMemo(
    () =>
      [...catalog.naceEntries]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((entry) => ({
          code: entry.code,
          label: `${entry.code} — ${lang === 'tr' ? entry.descriptionTr : entry.descriptionEn}`,
        })),
    [catalog, lang],
  );

  const selectedSubSector = sasbSubSectorSics
    ? getSubSectorById(sasbSubSectorSics, catalog)
    : undefined;
  const selectedMacro = sasbMacroSector
    ? getMacroSectorById(sasbMacroSector as SasbMacroSectorId, catalog)
    : undefined;

  const derivedSectorIds = useMemo(
    () =>
      resolvePlatformSectorIds(sectors, {
        naceCode,
        naceDescription,
        sasbSubSectorSics,
      }),
    [sectors, naceCode, naceDescription, sasbSubSectorSics],
  );

  /** NACE code entry is the source of truth: on blur, match its description and SASB classification. */
  const applyNaceLookup = (raw: string) => {
    const normalized = extractNaceCodeToken(raw).toUpperCase();
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

  /** Alt Sektör seçilince NACE alanını o alt sektörün varsayılan (en düşük sortOrder) kodu ile doldurur; kullanıcı değiştirebilir. */
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

  /** Selecting a sub-sector directly matches its macro sector and suggests a NACE code (editable). */
  const handleSubSectorChange = (subId: string) => {
    setSasbSubSectorSics(subId);
    setAutoMatchedSubId(null);
    if (subId) {
      const sub = getSubSectorById(subId, catalog);
      if (sub) setSasbMacroSector(sub.macroId);
      applyNaceFromSasbSubSector(subId);
    } else {
      setSasbMacroSector('');
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
      {derivedSectorIds.map((id) => (
        <input key={id} type="hidden" name="sectorIds" value={id} />
      ))}

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t.customers.sectorClassificationModeQuestion}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('sasb')}
            className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
              mode === 'sasb'
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {t.customers.sectorClassificationModeSasb}
          </button>
          <button
            type="button"
            onClick={() => setMode('nace')}
            className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
              mode === 'nace'
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {t.customers.sectorClassificationModeNace}
          </button>
        </div>
      </div>

      {mode === 'sasb' ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t.customers.sasbSubSectorLabel}
            </label>
            <div className="relative">
              <select
                className="minimal-input h-10 cursor-pointer appearance-none pr-10"
                value={sasbSubSectorSics}
                onChange={(e) => handleSubSectorChange(e.target.value)}
              >
                <option value="">{t.customers.sasbSubSectorPlaceholder}</option>
                {sortedMacros.map((macro) => (
                  <optgroup key={macro.id} label={macroLabel(macro.id)}>
                    {(subSectorsByMacro.get(macro.id) ?? []).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {subLabel(sub.id)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
            {selectedMacro ? (
              <p className="text-[10px] text-slate-500">
                {t.customers.sasbMacroSectorLabel}: {lang === 'tr' ? selectedMacro.labelTr : selectedMacro.labelEn}
              </p>
            ) : null}
          </div>

          {sasbSubSectorSics ? (
            <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
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
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t.customers.naceCodeLabel}
            </label>
            <input
              type="text"
              list={naceDatalistId}
              className="minimal-input"
              value={naceSearchText}
              onChange={(e) => setNaceSearchText(e.target.value)}
              onBlur={(e) => applyNaceLookup(e.target.value)}
              placeholder={t.customers.naceCodeSearchPlaceholder}
            />
            <datalist id={naceDatalistId}>
              {naceDatalistOptions.map((opt) => (
                <option key={opt.code} value={opt.label} />
              ))}
            </datalist>
            {autoMatchedSubId && sasbSubSectorSics === autoMatchedSubId ? (
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

          {selectedSubSector && selectedMacro ? (
            <p className="border-t border-slate-200 pt-3 text-[10px] text-slate-500">
              {t.customers.sasbSelectedSics.replace(
                '{name}',
                `${lang === 'tr' ? selectedMacro.labelTr : selectedMacro.labelEn} / ${
                  lang === 'tr' ? selectedSubSector.labelTr : selectedSubSector.labelEn
                }`,
              )}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
