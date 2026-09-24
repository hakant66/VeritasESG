/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Check, Edit2, Zap } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../lib/AuthContext';

type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

type ApprovalStage =
  | 'DATA_ENTRY'
  | 'MANAGER_REVIEW'
  | 'HORIZON_REVIEW'
  | 'APPROVED'
  | 'REVISION_REQUESTED';

interface MetricDef {
  id: string;
  code: string;
  name: string;
  nameTr: string;
  category: string;
  unit: string;
  isRequired: boolean;
  scope: EmissionScope;
}

interface DefinitionsByScope {
  scope1: MetricDef[];
  scope2: MetricDef[];
  scope3: MetricDef[];
}

interface ApprovalLogItem {
  stage: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  note?: string;
}

interface MetricEntry {
  id: string;
  customerId: string;
  year: number;
  facilityId?: string;
  facilityName?: string;
  metricDefinitionId: string;
  metricDefinitionCode: string;
  value?: number | null;
  unit: string;
  notes?: string;
  approvalStage: ApprovalStage;
  approvalStatusLog?: ApprovalLogItem[];
  emissionEntryId?: string;
  metricDefinition?: MetricDef | null;
}

interface CustomerOption {
  id: string;
  name: string;
}

const SCOPE_GROUPS: Array<{ key: keyof DefinitionsByScope; label: string; border: string }> = [
  { key: 'scope1', label: 'Kapsam 1', border: 'border-l-4 border-l-orange-400' },
  { key: 'scope2', label: 'Kapsam 2', border: 'border-l-4 border-l-blue-400' },
  { key: 'scope3', label: 'Kapsam 3', border: 'border-l-4 border-l-purple-400' },
];

const STAGE_BADGE: Record<ApprovalStage, string> = {
  DATA_ENTRY: 'bg-slate-100 text-slate-700',
  MANAGER_REVIEW: 'bg-blue-100 text-blue-700',
  HORIZON_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REVISION_REQUESTED: 'bg-red-100 text-red-700',
};

const ELEVATED_ROLES = ['platform_admin', 'consultant_manager', 'consultant'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2020 + 1 }, (_, i) => CURRENT_YEAR - i);

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(value);
}

function formatLogDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(parsed));
}

export default function EmissionDataPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const role = profile?.role || '';
  const stageLabels = t.emissionData.approvalStages as Record<ApprovalStage, string>;

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [definitions, setDefinitions] = useState<DefinitionsByScope>({
    scope1: [],
    scope2: [],
    scope3: [],
  });
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [selected, setSelected] = useState<MetricEntry | null>(null);
  const [editingDefId, setEditingDefId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dmaConfig, setDmaConfig] = useState<{
    isApproved: boolean;
    isE1Material: boolean;
    isDMAComplete: boolean;
  } | null>(null);

  // Load customers + metric definitions on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [customerList, defs] = await Promise.all([
          apiRequest<CustomerOption[]>('/api/db/customers?limit=500'),
          apiRequest<DefinitionsByScope>('/api/emissions/metric-definitions'),
        ]);
        if (cancelled) return;
        const sorted = (customerList || [])
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        setCustomers(sorted);
        setDefinitions(defs);
        if (sorted.length > 0) setCustomerId(sorted[0].id);
      } catch (err: any) {
        if (!cancelled) setMessage({ ok: false, text: err?.message || 'Veriler yüklenemedi.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEntries = useCallback(async () => {
    if (!customerId) {
      setEntries([]);
      setDmaConfig(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<MetricEntry[]>(
        `/api/emissions/metric-entries?customerId=${encodeURIComponent(customerId)}&year=${year}`,
      );
      setEntries(data || []);
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Kayıtlar yüklenemedi.' });
    } finally {
      setLoading(false);
    }
    // DMA materiality config — informational banner only; never blocks data entry.
    try {
      const config = await apiRequest<{
        isApproved: boolean;
        isE1Material: boolean;
        isDMAComplete: boolean;
      }>(`/api/materiality/config?customerId=${encodeURIComponent(customerId)}&year=${year}`);
      setDmaConfig(config);
    } catch {
      setDmaConfig({ isApproved: false, isE1Material: false, isDMAComplete: false });
    }
  }, [customerId, year]);

  useEffect(() => {
    void loadEntries();
    setSelected(null);
    setEditingDefId(null);
  }, [loadEntries]);

  // Index existing entries by definition id for fast lookup against the grid.
  const entryByDefId = useMemo(() => {
    const map = new Map<string, MetricEntry>();
    for (const entry of entries) map.set(entry.metricDefinitionId, entry);
    return map;
  }, [entries]);

  const allDefinitions = useMemo(
    () => [...definitions.scope1, ...definitions.scope2, ...definitions.scope3],
    [definitions],
  );

  const approvedCount = useMemo(
    () =>
      allDefinitions.filter((def) => entryByDefId.get(def.id)?.approvalStage === 'APPROVED').length,
    [allDefinitions, entryByDefId],
  );
  const totalCount = allDefinitions.length;
  const progressPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const startEdit = (def: MetricDef, entry?: MetricEntry) => {
    setEditingDefId(def.id);
    setEditValue(entry?.value != null ? String(entry.value) : '');
    setEditNotes(entry?.notes || '');
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingDefId(null);
    setEditValue('');
    setEditNotes('');
  };

  const saveEntry = async (def: MetricDef) => {
    setSaving(true);
    setMessage(null);
    const newValue = editValue.trim() === '' ? null : Number(editValue);
    try {
      const saved = await apiRequest<MetricEntry>('/api/emissions/metric-entries', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          year,
          metricDefinitionId: def.id,
          unit: def.unit,
          value: newValue,
          notes: editNotes.trim() || undefined,
        }),
      });
      // Optimistic update: immediately reflect the saved value in the table
      setEntries(prev => {
        const exists = prev.some(e => e.metricDefinitionId === def.id);
        if (exists) return prev.map(e => e.metricDefinitionId === def.id ? { ...e, ...saved } : e);
        return [...prev, saved];
      });
      cancelEdit();
      setMessage({ ok: true, text: 'Kaydedildi.' });
      // Sync with server in background to pick up any server-side changes
      void loadEntries();
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const changeStage = async (entry: MetricEntry, stage: ApprovalStage) => {
    // Block advancing from DATA_ENTRY when the metric has no value
    if (stage === 'MANAGER_REVIEW' && (entry.value == null || Number.isNaN(entry.value))) {
      setMessage({ ok: false, text: 'Devam etmeden önce bir değer girmeniz gerekiyor.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`/api/emissions/metric-entries/${encodeURIComponent(entry.id)}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage, changedByName: profile?.name || undefined }),
      });
      await loadEntries();
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Aşama güncellenemedi.' });
    } finally {
      setSaving(false);
    }
  };

  /** Render the stage-transition action button(s) for a given entry. */
  const renderStageActions = (entry: MetricEntry) => {
    const isElevated = ELEVATED_ROLES.includes(role);
    const buttons: Array<{ label: string; stage: ApprovalStage; tone: string }> = [];

    switch (entry.approvalStage) {
      case 'DATA_ENTRY':
        buttons.push({ label: 'Yöneticiye Gönder', stage: 'MANAGER_REVIEW', tone: 'blue' });
        break;
      case 'MANAGER_REVIEW':
        if (isElevated) buttons.push({ label: "Horizon'a Gönder", stage: 'HORIZON_REVIEW', tone: 'orange' });
        if (isElevated) buttons.push({ label: 'Revizyon İste', stage: 'REVISION_REQUESTED', tone: 'red' });
        break;
      case 'HORIZON_REVIEW':
        if (isElevated) buttons.push({ label: 'Onayla', stage: 'APPROVED', tone: 'green' });
        if (isElevated) buttons.push({ label: 'Revizyon İste', stage: 'REVISION_REQUESTED', tone: 'red' });
        break;
      case 'REVISION_REQUESTED':
        buttons.push({ label: 'Veri Girişine Dön', stage: 'DATA_ENTRY', tone: 'slate' });
        break;
      case 'APPROVED':
      default:
        break;
    }

    const toneClass: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      orange: 'bg-orange-500 hover:bg-orange-600 text-white',
      green: 'bg-green-600 hover:bg-green-700 text-white',
      red: 'border border-red-300 text-red-700 hover:bg-red-50',
      slate: 'bg-slate-700 hover:bg-slate-800 text-white',
    };

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.stage}
            disabled={saving}
            onClick={() => changeStage(entry, b.stage)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${toneClass[b.tone]}`}
          >
            {b.label}
          </button>
        ))}
        {entry.approvalStage === 'APPROVED' && (
          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
            <Check size={14} />
          </span>
        )}
        {entry.emissionEntryId && (
          <Link
            to="/emissions"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            title="Emisyon hesaplandı"
          >
            <Zap size={12} /> Hesaplandı
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <BarChart2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{t.nav.emissionData}</h1>
            <p className="text-sm text-slate-500">Faaliyet verisi girişi ve onay akışı</p>
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <label className="flex-1 text-sm">
          <span className="block text-slate-600 font-medium mb-1">Firma</span>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {customers.length === 0 && <option value="">Firma bulunamadı</option>}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:w-40 text-sm">
          <span className="block text-slate-600 font-medium mb-1">Yıl</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* DMA materiality banner — informational only, never blocks data entry. */}
      {customerId && year && dmaConfig !== null && (
        <div
          className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
            dmaConfig.isApproved && dmaConfig.isE1Material
              ? 'bg-green-50 border border-green-200 text-green-800'
              : dmaConfig.isApproved && !dmaConfig.isE1Material
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}
        >
          <span className="text-lg">
            {dmaConfig.isApproved && dmaConfig.isE1Material
              ? '✅'
              : dmaConfig.isApproved && !dmaConfig.isE1Material
                ? '⚠️'
                : 'ℹ️'}
          </span>
          <div>
            {dmaConfig.isApproved && dmaConfig.isE1Material && (
              <>
                <strong>E1 İklim Değişikliği önemli bulundu.</strong> Bu firma için emisyon
                verisi toplanması gerekmektedir.
              </>
            )}
            {dmaConfig.isApproved && !dmaConfig.isE1Material && (
              <>
                <strong>E1 İklim Değişikliği bu dönem için önemli bulunmadı.</strong> Emisyon veri
                girişi zorunlu değil; isteğe bağlı devam edebilirsiniz.
              </>
            )}
            {!dmaConfig.isApproved && (
              <>
                <strong>Önemlilik değerlendirmesi (DMA) henüz tamamlanmadı.</strong>{' '}
                <a href="#/materiality" className="underline font-medium">
                  Önemlilik sayfasına gidin
                </a>{' '}
                ve E1 konusunu değerlendirin. Şimdilik veri girişine devam edebilirsiniz.
              </>
            )}
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">İlerleme</span>
          <span className="text-slate-500">
            {approvedCount}/{totalCount} onaylandı
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-700 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scope groups */}
      {SCOPE_GROUPS.map((group) => {
        const defs = definitions[group.key];
        if (defs.length === 0) return null;
        return (
          <div
            key={group.key}
            className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${group.border}`}
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                {group.label}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-2 font-medium">Metrik</th>
                    <th className="px-4 py-2 font-medium w-40">Değer</th>
                    <th className="px-4 py-2 font-medium w-20">Birim</th>
                    <th className="px-4 py-2 font-medium w-44">Aşama</th>
                    <th className="px-4 py-2 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {defs.map((def) => {
                    const entry = entryByDefId.get(def.id);
                    const isEditing = editingDefId === def.id;
                    const isApproved = entry?.approvalStage === 'APPROVED';
                    const isSelected = selected?.id && entry?.id === selected.id;
                    return (
                      <tr
                        key={def.id}
                        onClick={() => entry && setSelected(entry)}
                        className={`border-b border-slate-50 last:border-0 ${
                          entry ? 'cursor-pointer hover:bg-slate-50' : ''
                        } ${isSelected ? 'bg-slate-50' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-slate-800">
                          {def.nameTr}
                          {def.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-32 border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                          ) : (
                            <span className="text-slate-700">{formatNumber(entry?.value)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{def.unit}</td>
                        <td className="px-4 py-2.5">
                          {entry ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_BADGE[entry.approvalStage]}`}
                            >
                              {stageLabels[entry.approvalStage]}
                              {entry.approvalStage === 'APPROVED' ? ' ✓' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                disabled={saving}
                                onClick={() => saveEntry(def)}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-40"
                              >
                                Kaydet
                              </button>
                              <button
                                disabled={saving}
                                onClick={cancelEdit}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {entry && renderStageActions(entry)}
                              {!isApproved && (
                                <button
                                  onClick={() => startEdit(def, entry)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                  <Edit2 size={12} /> Düzenle
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {loading && <p className="text-sm text-slate-400">Yükleniyor…</p>}

      {/* Approval history for the selected entry */}
      {selected && (selected.approvalStatusLog?.length || 0) > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Aşama geçmişi — {selected.metricDefinition?.nameTr || selected.metricDefinitionCode}
          </h3>
          <ol className="space-y-2">
            {selected.approvalStatusLog!.map((log, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-700">
                  <span className="font-medium">
                    {stageLabels[log.stage as ApprovalStage] || log.stage}
                  </span>
                  {' — '}
                  <span className="text-slate-500">
                    {log.changedByName || '—'}, {formatLogDate(log.changedAt)}
                  </span>
                  {log.note && <span className="block text-slate-400 text-xs mt-0.5">{log.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
