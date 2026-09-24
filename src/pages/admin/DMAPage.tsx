/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target, Lock, CheckCircle2, BookOpen } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { getRecommendedTemplatesForMaterialTopics } from '../../lib/materialityTemplateMapping';
import { GRIMaterialityTab } from '../../components/customer/GRIMaterialityTab';
import { GRIScoringTab } from '../../components/customer/GRIScoringTab';
import { ESRSScoringTab } from '../../components/customer/ESRSScoringTab';
import { ISSBScoringTab } from '../../components/customer/ISSBScoringTab';

interface CustomerOption {
  id: string;
  name: string;
}

interface MergedTopic {
  esrsId: string;
  nameTr: string;
  nameEn: string;
  category: string;
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
  isMaterial: boolean;
  notes: string;
  hasScore: boolean;
}

interface Assessment {
  id: string;
  customerId: string;
  year: number;
  status: 'DRAFT' | 'APPROVED';
  materialTopics: string[];
  approvedBy?: string;
  approvedAt?: number;
  notes?: string;
}

interface MaterialityResponse {
  assessment: Assessment | null;
  merged: MergedTopic[];
}

const APPROVE_ROLES = ['platform_admin', 'consultant_manager', 'consultant'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 4 + i);

const CATEGORY_LABELS: Record<string, string> = {
  E: 'ÇEVRE (E)',
  S: 'SOSYAL (S)',
  G: 'YÖNETİŞİM (G)',
};

const DIMENSION_LABELS: Array<{ key: keyof MergedTopic; label: string }> = [
  { key: 'financialImpact', label: 'Finansal Etki' },
  { key: 'impactSeverity', label: 'Etki Şiddeti' },
  { key: 'probability', label: 'Olasılık' },
  { key: 'stakeholderConcern', label: 'Paydaş End.' },
];

const ESRS_TO_MODULE: Record<string, string> = {
  E1: 'Emisyon Verileri (Kapsam 1/2/3)',
  E2: 'Kirlilik Metrikleri (gelecek)',
  E3: 'Su Kaynakları Metrikleri (gelecek)',
  E4: 'Biyoçeşitlilik Değerlendirmesi (gelecek)',
  E5: 'Atık ve Döngüsel Ekonomi (gelecek)',
  S1: 'Çalışan Metrikleri (gelecek)',
  S2: 'Tedarik Zinciri Denetimi (gelecek)',
  S3: 'Topluluk Etki Değerlendirmesi (gelecek)',
  S4: 'Tüketici Şikayet Mekanizması (gelecek)',
  G1: 'Yönetişim Raporlaması (gelecek)',
};

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            'w-8 h-8 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed',
            value >= n
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 disabled:hover:bg-slate-100',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function MaterialityMatrix({ merged }: { merged: MergedTopic[] }) {
  const pad = { l: 40, r: 20, t: 20, b: 40 };
  const w = 300 - pad.l - pad.r;
  const h = 260 - pad.t - pad.b;
  const x = (v: number) => pad.l + ((v - 1) / 4) * w;
  const y = (v: number) => pad.t + h - ((v - 1) / 4) * h;

  return (
    <svg viewBox="0 0 300 260" width="100%" className="max-w-sm">
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={pad.t} x2={x(v)} y2={pad.t + h} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={pad.l} y1={y(v)} x2={pad.l + w} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={x(v)} y={pad.t + h + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {v}
          </text>
          <text x={pad.l - 8} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {v}
          </text>
        </g>
      ))}
      <text x={pad.l + w / 2} y={260 - 4} textAnchor="middle" fontSize="9" fill="#64748b">
        Finansal Etki →
      </text>
      <text
        x={10}
        y={pad.t + h / 2}
        textAnchor="middle"
        fontSize="9"
        fill="#64748b"
        transform={`rotate(-90,10,${pad.t + h / 2})`}
      >
        Etki Şiddeti →
      </text>
      <rect
        x={x(3.5)}
        y={pad.t}
        width={x(5) - x(3.5)}
        height={y(1) - y(3.5)}
        fill="#fef3c7"
        opacity="0.4"
      />
      {merged.map((t) => (
        <g key={t.esrsId} transform={`translate(${x(t.financialImpact)},${y(t.impactSeverity)})`}>
          <circle r="10" fill={t.isMaterial ? '#f97316' : '#cbd5e1'} opacity="0.85" />
          <text textAnchor="middle" dy="4" fontSize="8" fontWeight="600" fill="white">
            {t.esrsId}
          </text>
        </g>
      ))}
    </svg>
  );
}

type StandardTab = 'gri' | 'esrs' | 'issb';

export default function DMAPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const role = profile?.role || '';
  const canApprove = APPROVE_ROLES.includes(role);

  const queryCustomerId = String(searchParams.get('customerId') || '').trim();
  const queryYearRaw = Number(searchParams.get('year'));
  const queryYear =
    Number.isFinite(queryYearRaw) && queryYearRaw >= 2000 && queryYearRaw <= 2100
      ? queryYearRaw
      : null;

  const [activeTab, setActiveTab] = useState<StandardTab>('gri');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState(queryCustomerId);
  const [year, setYear] = useState(queryYear ?? CURRENT_YEAR);
  const [merged, setMerged] = useState<MergedTopic[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const isLocked = assessment?.status === 'APPROVED';

  useEffect(() => {
    if (queryCustomerId) setCustomerId(queryCustomerId);
    if (queryYear != null) setYear(queryYear);
  }, [queryCustomerId, queryYear]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiRequest<CustomerOption[]>('/api/db/customers?limit=500');
        if (cancelled) return;
        const sorted = (list || [])
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        setCustomers(sorted);
        setCustomerId((prev) => {
          if (prev && sorted.some((c) => c.id === prev)) return prev;
          if (queryCustomerId && sorted.some((c) => c.id === queryCustomerId)) {
            return queryCustomerId;
          }
          return sorted[0]?.id || '';
        });
      } catch (err: any) {
        if (!cancelled) setMessage({ ok: false, text: err?.message || 'Firmalar yüklenemedi.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryCustomerId]);

  const loadData = useCallback(async () => {
    if (!customerId) {
      setMerged([]);
      setAssessment(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<MaterialityResponse>(
        `/api/materiality?customerId=${encodeURIComponent(customerId)}&year=${year}`,
      );
      setMerged(data.merged || []);
      setAssessment(data.assessment || null);
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [customerId, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const saveScore = useCallback(
    async (topic: MergedTopic, patch: Partial<Pick<MergedTopic, 'financialImpact' | 'impactSeverity' | 'probability' | 'stakeholderConcern' | 'notes'>>) => {
      if (isLocked) return;
      const next: MergedTopic = { ...topic, ...patch };
      // Optimistic local update.
      setMerged((prev) => prev.map((m) => (m.esrsId === topic.esrsId ? next : m)));
      setSaving(topic.esrsId);
      setMessage(null);
      try {
        const result = await apiRequest<{ topic: { isMaterial: boolean }; assessment: Assessment }>(
          '/api/materiality/score',
          {
            method: 'PUT',
            body: JSON.stringify({
              customerId,
              year,
              esrsId: topic.esrsId,
              financialImpact: next.financialImpact,
              impactSeverity: next.impactSeverity,
              probability: next.probability,
              stakeholderConcern: next.stakeholderConcern,
              notes: next.notes || undefined,
            }),
          },
        );
        // Sync the computed materiality flag from the server.
        setMerged((prev) =>
          prev.map((m) =>
            m.esrsId === topic.esrsId
              ? { ...next, isMaterial: result.topic.isMaterial, hasScore: true }
              : m,
          ),
        );
        setAssessment(result.assessment);
        setMessage({ ok: true, text: 'Kaydedildi' });
      } catch (err: any) {
        setMessage({ ok: false, text: err?.message || 'Kaydedilemedi.' });
        void loadData();
      } finally {
        setSaving(null);
      }
    },
    [customerId, year, isLocked, loadData],
  );

  const approve = useCallback(async () => {
    if (!customerId) return;
    setApproving(true);
    setMessage(null);
    try {
      await apiRequest('/api/materiality/approve', {
        method: 'POST',
        body: JSON.stringify({ customerId, year }),
      });
      await loadData();
      setMessage({ ok: true, text: 'Değerlendirme onaylandı' });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Onaylanamadı.' });
    } finally {
      setApproving(false);
    }
  }, [customerId, year, loadData]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, MergedTopic[]> = { E: [], S: [], G: [] };
    for (const topic of merged) {
      if (groups[topic.category]) groups[topic.category].push(topic);
    }
    return groups;
  }, [merged]);

  const materialList = useMemo(() => merged.filter((m) => m.isMaterial), [merged]);

  const formatDate = (ts?: number) =>
    ts
      ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(ts),
        )
      : '';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Target size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Önemlilik Değerlendirmesi (DMA)</h1>
          <p className="text-sm text-slate-500">
            Farklı çerçevelere göre materyal konuları yönetin
          </p>
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

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0 bg-white rounded-t-xl">
          {[
            { id: 'gri', label: 'GRI', description: 'Global Reporting Initiative' },
            { id: 'esrs', label: 'ESRS / CRDS', description: 'European Sustainability Reporting Standards' },
            { id: 'issb', label: 'ISSB (IFRS S1/S2)', description: 'IFRS Sustainability Standards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StandardTab)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {message && (
          <div
            className={cn(
              'rounded-lg px-4 py-2.5 text-sm',
              message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            )}
          >
            {message.text}
          </div>
        )}

        {loading && <div className="text-sm text-slate-500">Yükleniyor…</div>}

        {activeTab === 'gri' && (
          <div className="space-y-4">
            {customerId ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-blue-900">GRI Önemlilik Değerlendirmesi</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Global Reporting Initiative (GRI) konularını {year} yılı için değerlendirin.
                    Her konuya 1-5 arasında puan vererek materiality matrisini oluşturun.
                  </p>
                </div>
                <GRIScoringTab customerId={customerId} year={year} />
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Lütfen bir firma seçin</p>
            )}
          </div>
        )}

        {activeTab === 'esrs' && (
          <div className="space-y-4">
            {customerId ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-blue-900">ESRS/CRDS Önemlilik Değerlendirmesi</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    European Sustainability Reporting Standards (ESRS/CRDS) konularını {year} yılı için değerlendirin.
                    Her konuya 1-5 arasında puan vererek materiyallik matrisini oluşturun.
                  </p>
                </div>
                <ESRSScoringTab customerId={customerId} year={year} />
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Lütfen bir firma seçin</p>
            )}
          </div>
        )}

        {activeTab === 'issb' && (
          <div className="space-y-4">
            {customerId ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-blue-900">ISSB (IFRS S1/S2) Önemlilik Değerlendirmesi</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    IFRS Sustainability Standards (ISSB) konularını {year} yılı için değerlendirin.
                    Her konuya 1-5 arasında puan vererek tek-lensli finansal materiyallik matrisini oluşturun.
                  </p>
                </div>
                <ISSBScoringTab customerId={customerId} year={year} />
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Lütfen bir firma seçin</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
