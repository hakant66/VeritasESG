/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin page for the Materiality Survey module (Phase 2): pick a customer,
 * create/list surveys, and manage the selected survey's IROs, stakeholders,
 * and settings. Invite/reminder + matrix arrive in later phases.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, Copy } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient.ts';
import { Button } from '../../../shared/ui/button.tsx';
import { Input } from '../../../shared/ui/input.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../shared/ui/dialog.tsx';
import { useSurveys, useSurvey, useSurveyMutations, useMatrix, useTemplates } from '../hooks/useMaterialitySurveys.ts';
import { TopicIroBuilder } from '../components/TopicIroBuilder.tsx';
import { StakeholderManager } from '../components/StakeholderManager.tsx';
import { SurveyMaterialityMatrix } from '../components/SurveyMaterialityMatrix.tsx';
import { MaterialityScoringTable } from '../components/MaterialityScoringTable.tsx';
import type { SurveyStatus } from '../api/surveysApi.ts';

interface CustomerOption {
  id: string;
  name: string;
}

const STATUS_BADGE: Record<SurveyStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  collecting: 'bg-blue-100 text-blue-700',
  scoring: 'bg-amber-100 text-amber-700',
  finalized: 'bg-emerald-100 text-emerald-700',
};

type Tab = 'iros' | 'stakeholders' | 'results' | 'settings';

const TAB_LABEL: Record<Tab, string> = {
  iros: 'IRO’lar',
  stakeholders: 'Paydaşlar',
  results: 'Sonuçlar',
  settings: 'Ayarlar',
};

export default function MaterialitySurveyListPage() {
  const { data: customers = [] } = useQuery({
    queryKey: ['materiality-survey', 'customers'],
    queryFn: () => apiRequest<CustomerOption[]>('/api/db/customers?limit=500'),
    staleTime: 60_000,
  });

  const [customerId, setCustomerId] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('iros');
  const [newTitle, setNewTitle] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');

  const { data: surveys = [], isLoading } = useSurveys(customerId || undefined);
  const { data: templates = [] } = useTemplates();
  const { data: selected } = useSurvey(selectedId);
  const { createSurvey, updateSurvey, removeSurvey, cloneSurvey } = useSurveyMutations(customerId || undefined);

  const create = () => {
    if (!customerId || !newTitle.trim()) return;
    createSurvey.mutate(
      { customerId, title: newTitle.trim() },
      { onSuccess: (s) => { setNewTitle(''); setSelectedId(s.id); } },
    );
  };

  const createFromTemplate = () => {
    if (!customerId || !templateId || !templateTitle.trim()) return;
    cloneSurvey.mutate(
      { id: templateId, customerId, title: templateTitle.trim() },
      { onSuccess: (s) => { setTemplateTitle(''); setTemplateId(''); setSelectedId(s.id); } },
    );
  };

  const duplicateSurvey = (s: { id: string; title: string }) => {
    const title = window.prompt('Kopyanın başlığı:', `${s.title} (kopya)`);
    if (!title?.trim() || !customerId) return;
    cloneSurvey.mutate({ id: s.id, customerId, title: title.trim() });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Önemlilik Anketleri</h1>
          <p className="text-sm text-slate-500">Çifte önemlilik anketleri: IRO tanımlayın, paydaş toplayın, sonuçları matrise dönüştürün.</p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="h-4 w-4" />
          Yardım
        </Button>
      </header>

      <MaterialitySurveyHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Customer picker */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={customerId}
          onChange={(e) => { setCustomerId(e.target.value); setSelectedId(undefined); }}
        >
          <option value="">Firma seçin…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {customerId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Survey list + create */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Yeni Anket</h3>
              <div className="flex gap-2">
                <Input placeholder="Anket başlığı" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <Button disabled={!newTitle.trim() || createSurvey.isPending} onClick={create}>Ekle</Button>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Şablondan Oluştur</h3>
                <div className="space-y-2">
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    <option value="">Şablon seçin…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Yeni anket başlığı"
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!templateId || !templateTitle.trim() || cloneSurvey.isPending}
                      onClick={createFromTemplate}
                    >
                      Oluştur
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <ul className="space-y-2">
              {isLoading && <li className="text-sm text-slate-400">Yükleniyor…</li>}
              {!isLoading && surveys.length === 0 && <li className="text-sm text-slate-400">Henüz anket yok.</li>}
              {surveys.map((s) => (
                <li key={s.id} className="group relative">
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 pr-9 text-left text-sm ${
                      selectedId === s.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="min-w-0 truncate font-medium text-slate-700">
                      {s.title}
                      {s.isTemplate && (
                        <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">Şablon</span>
                      )}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                  </button>
                  <button
                    title="Kopyala"
                    onClick={(e) => { e.stopPropagation(); duplicateSurvey(s); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Detail */}
          <main>
            {!selected ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                Bir anket seçin veya oluşturun.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      {selected.title}
                      {selected.isTemplate && (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Şablon</span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selected.standardRef} · {selected.counts?.iros ?? 0} IRO · {selected.counts?.stakeholders ?? 0} paydaş
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-xs text-slate-500 hover:underline"
                      disabled={updateSurvey.isPending}
                      onClick={() => updateSurvey.mutate({ id: selected.id, patch: { isTemplate: !selected.isTemplate } })}
                    >
                      {selected.isTemplate ? 'Şablondan Çıkar' : 'Şablon Olarak Kaydet'}
                    </button>
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => {
                        if (confirm('Bu anket ve tüm verileri silinecek. Emin misiniz?')) {
                          removeSurvey.mutate(selected.id, { onSuccess: () => setSelectedId(undefined) });
                        }
                      }}
                    >
                      Anketi Sil
                    </button>
                  </div>
                </div>

                <nav className="flex gap-1 border-b border-slate-200 text-sm">
                  {(['iros', 'stakeholders', 'results', 'settings'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`-mb-px border-b-2 px-4 py-2 ${tab === t ? 'border-slate-800 font-semibold text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      {TAB_LABEL[t]}
                    </button>
                  ))}
                </nav>

                {tab === 'iros' && <TopicIroBuilder surveyId={selected.id} />}
                {tab === 'stakeholders' && <StakeholderManager surveyId={selected.id} />}
                {tab === 'results' && <ResultsTab surveyId={selected.id} />}
                {tab === 'settings' && (
                  <SurveySettings
                    key={selected.id}
                    survey={selected}
                    onSave={(patch) => updateSurvey.mutate({ id: selected.id, patch })}
                    saving={updateSurvey.isPending}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function ResultsTab({ surveyId }: { surveyId: string }) {
  const { data, isLoading } = useMatrix(surveyId);
  if (isLoading) return <p className="text-sm text-slate-400">Yükleniyor…</p>;
  if (!data) return <p className="text-sm text-slate-400">Sonuç yok.</p>;
  return (
    <div className="space-y-4">
      <SurveyMaterialityMatrix data={data} />
      <MaterialityScoringTable data={data} />
    </div>
  );
}

function SurveySettings({
  survey,
  onSave,
  saving,
}: {
  survey: { status: SurveyStatus; materialThreshold?: number | null; scaleMax: number; topicRollup: 'max' | 'weighted_avg' };
  onSave: (patch: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState<SurveyStatus>(survey.status);
  const [threshold, setThreshold] = useState(String(survey.materialThreshold ?? ''));
  const [scaleMax, setScaleMax] = useState(String(survey.scaleMax));
  const [rollup, setRollup] = useState(survey.topicRollup);

  return (
    <div className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold text-slate-500">Durum</span>
        <select className="w-full rounded-md border border-slate-300 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as SurveyStatus)}>
          {(['draft', 'collecting', 'scoring', 'finalized'] as SurveyStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold text-slate-500">Önemlilik eşiği</span>
        <Input type="number" step="0.1" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold text-slate-500">Skala üst sınırı</span>
        <Input type="number" value={scaleMax} onChange={(e) => setScaleMax(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold text-slate-500">Konu toplulaştırma</span>
        <select className="w-full rounded-md border border-slate-300 px-3 py-2" value={rollup} onChange={(e) => setRollup(e.target.value as 'max' | 'weighted_avg')}>
          <option value="max">max</option>
          <option value="weighted_avg">weighted_avg</option>
        </select>
      </label>
      <Button
        disabled={saving}
        onClick={() =>
          onSave({
            status,
            materialThreshold: threshold === '' ? null : Number(threshold),
            scaleMax: Number(scaleMax) || survey.scaleMax,
            topicRollup: rollup,
          })
        }
      >
        {saving ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </div>
  );
}

function MaterialitySurveyHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Önemlilik Anketleri — Yardım</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm text-slate-700">
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">IRO nedir?</h3>
            <p>
              <strong>IRO</strong>, <em>Impact, Risk, Opportunity</em> (Etki, Risk, Fırsat)
              kelimelerinin kısaltmasıdır. ESRS'in (Avrupa Sürdürülebilirlik Raporlama
              Standartları) temelindeki <strong>çifte önemlilik (double materiality)</strong>{' '}
              yaklaşımının birimidir. Her sürdürülebilirlik konusu (ör. "su kullanımı",
              "çalışan hakları") altında, şirketin o konuyla ilişkisini somutlaştıran bir
              veya birden fazla IRO tanımlanır:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>iroType</strong>: <code>impact</code> (etki), <code>risk</code> (risk)
                veya <code>opportunity</code> (fırsat)
              </li>
              <li>
                <strong>valueChainPosition</strong>: <code>own_operations</code> (kendi
                faaliyetleri), <code>upstream</code> (tedarik zinciri), <code>downstream</code>{' '}
                (müşteri/kullanım aşaması)
              </li>
              <li>
                <strong>polarity</strong>: <code>positive</code> / <code>negative</code> —
                etkinin olumlu mu olumsuz mu olduğu
              </li>
            </ul>
            <p className="text-slate-500">
              Örnek: <em>Konu: Su Kullanımı → IRO tipi: impact, own_operations, negative,
              Açıklama: "Üretim tesisinde yüksek su tüketimi".</em>
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              Anket nasıl hazırlanır ve çalışır?
            </h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Anket oluşturma</strong> — Müşteri seçilir, başlık girilir, standart
                referansı (ESRS/GRI/SASB) belirlenir.
              </li>
              <li>
                <strong>Konu Listesi İçe Aktarma (CSV)</strong> — <code>id;subject;griMapping;
                disclosures;financialImpact;impactSeverity;probability;stakeholderConcern;
                isMaterial;notes</code> formatındaki CSV, konu longlist'ini (subject, GRI
                eşleştirmesi, disclosure referansları) sisteme yükler. Skor kolonları
                (financialImpact, impactSeverity, probability, stakeholderConcern, isMaterial)
                bu adımda göz ardı edilir — gerçek skorlar paydaş yanıtlarından hesaplanır.
              </li>
              <li>
                <strong>IRO Ekleme</strong> — Her konu için "Konu referansı (topicRef)" ile
                içe aktarılan konuya bağlanan bir veya birden fazla IRO tanımlanır.
              </li>
              <li>
                <strong>Paydaşlar</strong> — Ağırlıklı paydaş grupları oluşturulur (ör.
                "Yönetim", "Yerel halk"), her gruba isim + e-posta ile paydaşlar toplu eklenir.
              </li>
              <li>
                <strong>Davet gönderimi</strong> — Her paydaşa tokenli bir link e-posta ile
                gönderilir; hatırlatmalar otomatik ayarlanan sıklıkta tekrarlanır.
              </li>
              <li>
                <strong>Paydaş yanıtları</strong> — Paydaş, giriş yapmadan linkten girer ve
                her IRO'yu 1–5 skalada dört boyutta puanlar: finansal önemlilik, etki şiddeti,
                etki kapsamı, olasılık.
              </li>
              <li>
                <strong>Ayarlar</strong> — Anket durumu, önemlilik eşiği, skala üst sınırı ve
                konu bazında toplulaştırma yöntemi (<code>max</code> veya{' '}
                <code>weighted_avg</code>) burada yapılandırılır.
              </li>
              <li>
                <strong>Sonuçlar</strong> — Tüm paydaş yanıtları ağırlıklı ortalanır: etki
                ekseni severity × scope × probability'nin geometrik ortalaması, finansal
                eksen ağırlıklı ortalama finansal skordur. Çifte önemlilik matrisi (grafik) ve
                skor tablosu olarak gösterilir; eşiği aşan konular <strong>material</strong>{' '}
                işaretlenir ve CSV olarak dışa aktarılabilir.
              </li>
            </ol>
            <p className="text-slate-500">
              Özetle: CSV yalnızca konu listesini (taksonomiyi) yükler; gerçek önemlilik
              skorları paydaşların canlı anket yanıtlarından hesaplanır.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
