/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, Plus, Trash2, ChevronDown, ChevronRight, Info, Download, FileText } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../lib/AuthContext';
import { YearlyBarChart, ScopeDistributionPie } from '../../components/emissions/EmissionsCharts.tsx';
import { exportEmissionsCsv } from '../../lib/exportEmissionsCsv.ts';
import { exportEmissionsPdf } from '../../lib/exportEmissionsPdf.ts';

type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

interface EmissionFactor {
  id: string;
  name: string;
  scope: EmissionScope;
  category: string;
  activityUnit: string;
  factorValue: number;
  factorUnit: string;
  source: string;
  versionYear: number;
  country: string;
}

interface EmissionEntry {
  id: string;
  customerId: string;
  year: number;
  scope: EmissionScope;
  category: string;
  activityValue: number;
  activityUnit: string;
  emissionFactorId: string;
  factorValue: number;
  facilityId?: string;
  facilityName?: string;
  resultTCO2e: number;
  calculationFormula?: string;
  notes?: string;
  createdAt?: number;
}

interface EmissionSummary {
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  scope2LocationBased?: number;
  scope2MarketBased?: number | null;
  byFacility?: Array<{ facilityId: string; facilityName: string; scope1Total: number; scope2Total: number; scope3Total: number }>;
  intensityMetrics?: { tCO2ePerMillionTRY: number | null; tCO2ePerProductionTon: number | null; tCO2ePerEmployee: number | null } | null;
  entries: EmissionEntry[];
}

interface CustomerOption {
  id: string;
  name: string;
}

type FactorsByScope = Record<EmissionScope, EmissionFactor[]>;

const SCOPE_ORDER: EmissionScope[] = ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'];

const SCOPE_LABELS: Record<EmissionScope, string> = {
  SCOPE_1: 'Kapsam 1',
  SCOPE_2: 'Kapsam 2',
  SCOPE_3: 'Kapsam 3',
};

const SCOPE_EXPLANATIONS: Record<EmissionScope, string> = {
  SCOPE_1:
    'Şirkete ait kaynaklardan doğrudan atmosfere salınan sera gazlarıdır. Araç yakıtları, kazanlar ve endüstriyel süreçler başlıca kaynaklardır.',
  SCOPE_2:
    'Dışarıdan satın alınan elektrik, ısı veya buharın üretimi sırasında oluşan dolaylı emisyonlardır.',
  SCOPE_3:
    'Şirketin değer zincirindeki tüm dolaylı emisyonlardır. Tedarik, lojistik ve ürün kullanımı bu kapsamda değerlendirilir.',
};

const SCOPE_BORDER: Record<EmissionScope, string> = {
  SCOPE_1: 'border-l-4 border-l-orange-400',
  SCOPE_2: 'border-l-4 border-l-blue-400',
  SCOPE_3: 'border-l-4 border-l-purple-400',
};

function formatTco2e(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value || 0);
}

function formatDate(ms?: number): string {
  if (!ms) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2020 + 1 },
  (_, i) => CURRENT_YEAR - i,
);

export default function EmissionsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);

  const [factorsByScope, setFactorsByScope] = useState<FactorsByScope>({
    SCOPE_1: [],
    SCOPE_2: [],
    SCOPE_3: [],
  });

  const [summary, setSummary] = useState<EmissionSummary>({
    scope1Total: 0,
    scope2Total: 0,
    scope3Total: 0,
    entries: [],
  });

  const [activeScope, setActiveScope] = useState<EmissionScope>('SCOPE_1');
  const [explanationOpen, setExplanationOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [activityValue, setActivityValue] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [summaryFacilityFilter, setSummaryFacilityFilter] = useState('');
  const [intensity, setIntensity] = useState<{ revenueMillionTRY?: number | null; productionTons?: number | null; employeeCount?: number | null } | null>(null);
  const [intensityForm, setIntensityForm] = useState({ revenueMillionTRY: '', productionTons: '', employeeCount: '' });
  const [intensityOpen, setIntensityOpen] = useState(false);
  const [intensitySaving, setIntensitySaving] = useState(false);
  const [market, setMarket] = useState<{ certificateMWh?: number; contractualFactorKgCO2ePerKWh?: number } | null>(null);
  const [marketForm, setMarketForm] = useState({ certificateMWh: '', contractualFactor: '' });
  const [marketSaving, setMarketSaving] = useState(false);
  const [yearlyTotals, setYearlyTotals] = useState<Array<{ year: number; scope1Total: number; scope2Total: number }>>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Load customers + factors on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [customerList, factors] = await Promise.all([
          apiRequest<CustomerOption[]>('/api/db/customers?limit=500'),
          apiRequest<FactorsByScope>('/api/emissions/factors'),
        ]);
        if (cancelled) return;
        const sorted = (customerList || [])
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        setCustomers(sorted);
        setFactorsByScope(factors);
        if (sorted.length > 0) setCustomerId(sorted[0].id);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Veriler yüklenemedi.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load branches (facilities) for the selected customer.
  useEffect(() => {
    if (!customerId) {
      setBranches([]);
      return;
    }
    apiRequest<{ data: Array<{ id: string; name: string }> }>(
      `/api/db/branches?customerId=${encodeURIComponent(customerId)}&limit=500`,
    )
      .then((r) => setBranches((r?.data || []).sort((a, b) => a.name.localeCompare(b.name, 'tr'))))
      .catch(() => setBranches([]));
    setSelectedFacilityId('');
    setSummaryFacilityFilter('');
  }, [customerId]);

  const loadSummary = useCallback(async () => {
    if (!customerId) {
      setSummary({ scope1Total: 0, scope2Total: 0, scope3Total: 0, entries: [] });
      setIntensity(null);
      setMarket(null);
      setYearlyTotals([]);
      return;
    }
    setLoadingSummary(true);
    setError(null);
    try {
      const facilityParam = summaryFacilityFilter
        ? `&facilityId=${encodeURIComponent(summaryFacilityFilter)}`
        : '';
      const years = [year - 2, year - 1, year].filter((y) => y >= 2020);
      const [data, intensityDoc, marketDoc, yearly] = await Promise.all([
        apiRequest<EmissionSummary>(
          `/api/emissions/summary?customerId=${encodeURIComponent(customerId)}&year=${year}${facilityParam}`,
        ),
        apiRequest<{ revenueMillionTRY?: number | null; productionTons?: number | null; employeeCount?: number | null } | null>(
          `/api/emissions/intensity?customerId=${encodeURIComponent(customerId)}&year=${year}`,
        ),
        apiRequest<{ certificateMWh?: number; contractualFactorKgCO2ePerKWh?: number } | null>(
          `/api/emissions/scope2-market?customerId=${encodeURIComponent(customerId)}&year=${year}`,
        ),
        apiRequest<Array<{ year: number; scope1Total: number; scope2Total: number }>>(
          `/api/emissions/yearly-totals?customerId=${encodeURIComponent(customerId)}&years=${years.join(',')}`,
        ),
      ]);
      setSummary(data);

      setIntensity(intensityDoc);
      setIntensityForm({
        revenueMillionTRY: intensityDoc?.revenueMillionTRY != null ? String(intensityDoc.revenueMillionTRY) : '',
        productionTons: intensityDoc?.productionTons != null ? String(intensityDoc.productionTons) : '',
        employeeCount: intensityDoc?.employeeCount != null ? String(intensityDoc.employeeCount) : '',
      });

      setMarket(marketDoc);
      setMarketForm({
        certificateMWh: marketDoc?.certificateMWh != null ? String(marketDoc.certificateMWh) : '',
        contractualFactor:
          marketDoc?.contractualFactorKgCO2ePerKWh != null ? String(marketDoc.contractualFactorKgCO2ePerKWh) : '',
      });

      setYearlyTotals(Array.isArray(yearly) ? yearly : []);
    } catch (err: any) {
      setError(err?.message || 'Özet yüklenemedi.');
    } finally {
      setLoadingSummary(false);
    }
  }, [customerId, year, summaryFacilityFilter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const scopeTotals: Record<EmissionScope, number> = {
    SCOPE_1: summary.scope1Total,
    SCOPE_2: summary.scope2Total,
    SCOPE_3: summary.scope3Total,
  };

  const activeFactors = factorsByScope[activeScope] || [];
  const scopeEntries = useMemo(
    () => summary.entries.filter((e) => e.scope === activeScope),
    [summary.entries, activeScope],
  );

  const selectedFactor = activeFactors.find((f) => f.id === selectedFactorId);

  const resetForm = () => {
    setSelectedFactorId('');
    setActivityValue('');
    setNotes('');
    setSelectedFacilityId('');
  };

  const handleScopeChange = (scope: EmissionScope) => {
    setActiveScope(scope);
    setFormOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    setError(null);
    if (!customerId) {
      setError('Lütfen önce bir firma seçin.');
      return;
    }
    if (!selectedFactorId) {
      setError('Lütfen bir yakıt/enerji tipi seçin.');
      return;
    }
    const value = Number(activityValue);
    if (!Number.isFinite(value) || value < 0) {
      setError('Geçerli bir faaliyet değeri girin.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/api/emissions/calculate', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          year,
          emissionFactorId: selectedFactorId,
          activityValue: value,
          facilityId: selectedFacilityId || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      resetForm();
      setFormOpen(false);
      await loadSummary();
    } catch (err: any) {
      setError(err?.message || 'Hesaplama kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    setError(null);
    try {
      await apiRequest(`/api/db/emissionEntries/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
      });
      await loadSummary();
    } catch (err: any) {
      setError(err?.message || 'Kayıt silinemedi.');
    }
  };

  const canEdit =
    profile?.role === 'platform_admin' ||
    profile?.role === 'consultant_manager' ||
    profile?.role === 'consultant';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Flame size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{t.nav.emissions}</h1>
            <p className="text-sm text-slate-500">Emisyon Yönetimi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!summary?.entries?.length}
            onClick={() => {
              const customerObj = customers.find((c) => c.id === customerId);
              const customerName = customerObj?.name || customerId;
              exportEmissionsCsv(
                (summary?.entries || []).map((e) => ({
                  customerName,
                  year: Number(year),
                  facilityName: e.facilityName,
                  scope: e.scope,
                  category: e.category,
                  activityValue: Number(e.activityValue),
                  activityUnit: e.activityUnit,
                  factorValue: Number(e.factorValue),
                  calculationFormula: e.calculationFormula,
                  resultTCO2e: Number(e.resultTCO2e),
                  createdAt: e.createdAt,
                })),
                `emisyonlar-${String(customerName).replace(/[^\w.\-]+/g, '_')}-${year}.csv`,
              );
            }}
            className="px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download size={14} /> CSV İndir
          </button>
          <button
            disabled={!summary?.entries?.length || pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              const customerObj = customers.find((c) => c.id === customerId);
              const customerName = customerObj?.name || customerId;
              try {
                await exportEmissionsPdf({
                  customerName: String(customerName),
                  year: Number(year),
                  scope1Total: summary.scope1Total,
                  scope2Total: summary.scope2Total,
                  scope3Total: summary.scope3Total,
                  scope2LocationBased: summary.scope2LocationBased,
                  scope2MarketBased: summary.scope2MarketBased,
                  intensityMetrics: summary.intensityMetrics,
                  entries: (summary.entries || []).map((e) => ({
                    facilityName: e.facilityName,
                    scope: e.scope,
                    category: e.category,
                    activityValue: Number(e.activityValue),
                    activityUnit: e.activityUnit,
                    factorValue: Number(e.factorValue),
                    calculationFormula: e.calculationFormula,
                    resultTCO2e: Number(e.resultTCO2e),
                  })),
                });
              } finally {
                setPdfLoading(false);
              }
            }}
            className="px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <FileText size={14} /> {pdfLoading ? 'Hazırlanıyor…' : 'PDF İndir'}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Firma</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {customers.length === 0 && <option value="">Firma bulunamadı</option>}
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Yıl</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Facility filter */}
      {branches.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Tesis Filtresi:</label>
          <select
            value={summaryFacilityFilter}
            onChange={(e) => setSummaryFacilityFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">Tüm Tesisler</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SCOPE_ORDER.map((scope) => (
          <div
            key={scope}
            className={`bg-white border border-slate-200 rounded-xl p-6 ${SCOPE_BORDER[scope]}`}
          >
            <p className="text-sm font-semibold text-slate-700">{SCOPE_LABELS[scope]}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatTco2e(scopeTotals[scope])}
              <span className="ml-1 text-sm font-medium text-slate-500">tCO₂e</span>
            </p>
            {scope === 'SCOPE_2' && summary.scope2MarketBased != null && (
              <div className="mt-2 space-y-0.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Lokasyon tabanlı:</span>
                  <span>{formatTco2e(summary.scope2LocationBased ?? summary.scope2Total)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Piyasa tabanlı:</span>
                  <span>{formatTco2e(summary.scope2MarketBased)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* By-facility breakdown */}
      {summary && (summary.byFacility?.length ?? 0) > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Tesis Bazında Dağılım</h3>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Tesis', 'Kapsam 1', 'Kapsam 2', 'Kapsam 3', 'Toplam'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.byFacility!.map((row) => (
                <tr key={row.facilityId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-sm font-medium text-slate-700">{row.facilityName || '—'}</td>
                  <td className="py-2 px-3 text-sm text-orange-700">{formatTco2e(row.scope1Total)}</td>
                  <td className="py-2 px-3 text-sm text-blue-700">{formatTco2e(row.scope2Total)}</td>
                  <td className="py-2 px-3 text-sm text-purple-700">{formatTco2e(row.scope3Total)}</td>
                  <td className="py-2 px-3 text-sm font-semibold text-slate-900">
                    {formatTco2e(row.scope1Total + row.scope2Total + row.scope3Total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Market-based Scope 2 inputs */}
      {customerId && year && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Piyasa Tabanlı Kapsam 2</h3>
          <p className="text-xs text-slate-500 mb-3">
            Sertifikalı yenilenebilir enerji (YEK-G / I-REC) MWh ve sözleşmeli faktör girişi.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sertifikalı MWh</label>
              <input
                type="number"
                min="0"
                value={marketForm.certificateMWh}
                onChange={(e) => setMarketForm((frm) => ({ ...frm, certificateMWh: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sözleşmeli Faktör (kgCO₂e/kWh)</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={marketForm.contractualFactor}
                onChange={(e) => setMarketForm((frm) => ({ ...frm, contractualFactor: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="0 = tamamen yenilenebilir"
              />
            </div>
          </div>
          {canEdit && (
            <button
              disabled={marketSaving}
              onClick={async () => {
                setMarketSaving(true);
                try {
                  await apiRequest('/api/emissions/scope2-market', {
                    method: 'PUT',
                    body: JSON.stringify({
                      customerId,
                      year: Number(year),
                      certificateMWh: Number(marketForm.certificateMWh) || 0,
                      contractualFactorKgCO2ePerKWh: Number(marketForm.contractualFactor) || 0,
                    }),
                  });
                  await loadSummary();
                } finally {
                  setMarketSaving(false);
                }
              }}
              className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {marketSaving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          )}
        </div>
      )}

      {/* Intensity metrics (collapsible) */}
      {customerId && year && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <button onClick={() => setIntensityOpen((v) => !v)} className="flex items-center gap-2 w-full text-left">
            {intensityOpen ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronRight size={16} className="text-slate-400" />
            )}
            <h3 className="text-sm font-semibold text-slate-700">Yoğunluk Metrikleri</h3>
          </button>
          {intensityOpen && (
            <div className="mt-4 space-y-4">
              {canEdit && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'revenueMillionTRY', label: 'Ciro (Milyon TRY)' },
                    { key: 'productionTons', label: 'Üretim (Ton)' },
                    { key: 'employeeCount', label: 'Çalışan Sayısı' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                      <input
                        type="number"
                        min="0"
                        value={intensityForm[key as keyof typeof intensityForm]}
                        onChange={(e) => setIntensityForm((frm) => ({ ...frm, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <button
                  disabled={intensitySaving}
                  onClick={async () => {
                    setIntensitySaving(true);
                    const toNum = (v: string) => (v === '' ? null : Number(v));
                    try {
                      await apiRequest('/api/emissions/intensity', {
                        method: 'PUT',
                        body: JSON.stringify({
                          customerId,
                          year: Number(year),
                          revenueMillionTRY: toNum(intensityForm.revenueMillionTRY),
                          productionTons: toNum(intensityForm.productionTons),
                          employeeCount: toNum(intensityForm.employeeCount),
                        }),
                      });
                      await loadSummary();
                    } finally {
                      setIntensitySaving(false);
                    }
                  }}
                  className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {intensitySaving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              )}
              {summary?.intensityMetrics ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'tCO2ePerMillionTRY', label: 'tCO₂e / Milyon TRY' },
                    { key: 'tCO2ePerProductionTon', label: 'tCO₂e / Üretim Tonu' },
                    { key: 'tCO2ePerEmployee', label: 'tCO₂e / Çalışan' },
                  ].map(({ key, label }) => {
                    const val = summary.intensityMetrics![key as keyof typeof summary.intensityMetrics];
                    if (val == null) return null;
                    return (
                      <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="text-lg font-semibold text-slate-900">{Number(val).toFixed(4)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Yoğunluk metriklerini görmek için payda değerlerini girin.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Yıllara Göre Emisyon</h3>
            <YearlyBarChart data={yearlyTotals} />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Kapsam Dağılımı</h3>
            <ScopeDistributionPie
              scope1={summary.scope1Total}
              scope2={summary.scope2Total}
              scope3={summary.scope3Total}
            />
          </div>
        </div>
      )}

      {/* Scope tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          {SCOPE_ORDER.map((scope) => (
            <button
              key={scope}
              onClick={() => handleScopeChange(scope)}
              className={
                activeScope === scope
                  ? 'px-4 py-2 text-sm font-medium border-b-2 border-slate-900 text-slate-900'
                  : 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700'
              }
            >
              {SCOPE_LABELS[scope]}
            </button>
          ))}
        </div>
      </div>

      {/* Scope explanation (collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <button
          onClick={() => setExplanationOpen((open) => !open)}
          className="flex items-center gap-2 w-full text-left"
          aria-expanded={explanationOpen}
        >
          {explanationOpen ? (
            <ChevronDown size={16} className="text-slate-500 shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-slate-500 shrink-0" />
          )}
          <Info size={16} className="text-slate-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-700">
            {SCOPE_LABELS[activeScope]} Nedir?
          </h3>
        </button>
        {explanationOpen && (
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {SCOPE_EXPLANATIONS[activeScope]}
          </p>
        )}
      </div>

      {/* Entries + add form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {SCOPE_LABELS[activeScope]} Hesaplamaları
          </h2>
          {canEdit && (
            <button
              onClick={() => {
                setFormOpen((open) => !open);
                if (formOpen) resetForm();
              }}
              disabled={!customerId}
              className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Yeni Hesaplama Ekle
            </button>
          )}
        </div>

        {formOpen && canEdit && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Yakıt / Enerji Tipi
                </label>
                <select
                  value={selectedFactorId}
                  onChange={(e) => setSelectedFactorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Seçiniz…</option>
                  {activeFactors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.factorValue} {f.factorUnit})
                    </option>
                  ))}
                </select>
                {activeFactors.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Bu kapsam için tanımlı emisyon faktörü bulunmuyor.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Faaliyet Değeri
                  {selectedFactor && (
                    <span className="ml-1 font-normal text-slate-500">
                      ({selectedFactor.activityUnit})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={activityValue}
                  onChange={(e) => setActivityValue(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tesis (opsiyonel)</label>
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Tesis seçilmedi</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Notlar (opsiyonel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {selectedFactor && activityValue !== '' && Number.isFinite(Number(activityValue)) && (
              <p className="text-xs text-slate-500">
                Tahmini sonuç:{' '}
                <span className="font-semibold text-slate-700">
                  {formatTco2e((Number(activityValue) * selectedFactor.factorValue) / 1000)} tCO₂e
                </span>
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor…' : 'Hesapla ve Kaydet'}
              </button>
              <button
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                  setError(null);
                }}
                className="px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Entries table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Yakıt/Enerji Tipi
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Faaliyet Değeri
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Birim
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Emisyon Faktörü
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Formül
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Sonuç (tCO₂e)
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                  Tarih
                </th>
                {canEdit && (
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-2 px-3">
                    Sil
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loadingSummary ? (
                <tr className="border-t border-slate-100">
                  <td className="py-4 px-3 text-sm text-slate-500" colSpan={canEdit ? 8 : 7}>
                    Yükleniyor…
                  </td>
                </tr>
              ) : scopeEntries.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td className="py-4 px-3 text-sm text-slate-500" colSpan={canEdit ? 8 : 7}>
                    Bu kapsam için kayıt bulunmuyor.
                  </td>
                </tr>
              ) : (
                scopeEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-sm text-slate-700">{entry.category}</td>
                    <td className="py-2 px-3 text-sm text-slate-700">
                      {formatTco2e(entry.activityValue)}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-700">{entry.activityUnit}</td>
                    <td className="py-2 px-3 text-sm text-slate-700">{entry.factorValue}</td>
                    <td className="py-2 px-3 text-sm text-slate-500">
                      {entry.calculationFormula || '—'}
                    </td>
                    <td className="py-2 px-3 text-sm font-semibold text-slate-900">
                      {formatTco2e(entry.resultTCO2e)}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-700">
                      {formatDate(entry.createdAt)}
                    </td>
                    {canEdit && (
                      <td className="py-2 px-3 text-sm text-slate-700">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          aria-label="Kaydı sil"
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
