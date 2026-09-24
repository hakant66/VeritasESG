/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Türkçe Organizasyonel Sınır Tanımı onboarding sihirbazı.
 * Mevcut «Yeni firma oluştur» modalına alternatif, ayrı sayfa akışı.
 */

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Factory,
  Globe2,
  Layers,
  Loader2,
  MapPin,
  Network,
  Plus,
  Trash2,
} from 'lucide-react';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import type { Segment } from '../../types';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import {
  buildOperationGeographies,
  buildOrganizationalBoundaryDescription,
  EMPTY_ORG_BOUNDARY_DRAFT,
  newOrgEntityId,
  ORG_SITE_KIND_LABELS,
  type OrganizationalBoundaryDraft,
  type OrgSiteKind,
} from '../../features/organizational-boundary/orgBoundaryTypes';

const STEPS = [
  {
    id: 'intro',
    title: 'Organizasyonel sınır',
    subtitle: 'Kapsamı anlayın',
  },
  {
    id: 'parent',
    title: 'Ana şirket',
    subtitle: 'Holding / ebeveyn şirket',
  },
  {
    id: 'subsidiaries',
    title: 'İştirakler',
    subtitle: 'Uluslararası bağlı ortaklıklar',
  },
  {
    id: 'sites',
    title: 'Sahalar',
    subtitle: 'Operasyonel tesisler',
  },
  {
    id: 'units',
    title: 'İş birimleri',
    subtitle: 'Organizasyonel birimler',
  },
  {
    id: 'review',
    title: 'Gözden geçir',
    subtitle: 'Kaydet ve tamamla',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10';
const labelClass =
  'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400';

export default function OrganizationalBoundaryOnboardingPage() {
  const navigate = useNavigate();
  const { user, canCreateCustomersAndProjects } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OrganizationalBoundaryDraft>(EMPTY_ORG_BOUNDARY_DRAFT);
  const [sectors, setSectors] = useState<Segment[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await DB.segments.list();
        if (cancelled) return;
        const customerSectors = (data || []).filter(
          (s) => s.type === 'Customer Sector' || !s.type,
        );
        setSectors(customerSectors);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Sektör listesi yüklenemedi.');
      } finally {
        if (!cancelled) setLoadingSectors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const progressPct = useMemo(
    () => Math.round(((stepIndex + 1) / STEPS.length) * 100),
    [stepIndex],
  );

  const canGoNext = (): boolean => {
    if (step.id === 'parent') {
      return (
        draft.parent.legalName.trim().length > 0 &&
        draft.parent.brandName.trim().length > 0 &&
        Boolean(draft.parent.sectorId)
      );
    }
    return true;
  };

  const goNext = () => {
    setError(null);
    if (!canGoNext()) {
      setError(
        'Ana şirket için yasal unvan, ticari ad ve en az bir sektör seçimi zorunludur.',
      );
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSave = async () => {
    if (!canCreateCustomersAndProjects) {
      setError('Firma oluşturma yetkiniz yok.');
      return;
    }
    if (!canGoNext()) {
      setError('Eksik zorunlu alanlar var. Ana şirket adımına dönün.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const displayName =
        draft.parent.brandName.trim() || draft.parent.legalName.trim();
      const description = buildOrganizationalBoundaryDescription(draft);
      const operationGeographies = buildOperationGeographies(draft);

      const created = await DB.customers.create({
        name: displayName,
        legalName: draft.parent.legalName.trim(),
        sectorIds: [draft.parent.sectorId],
        address: [
          draft.parent.headquartersAddress,
          draft.parent.headquartersCity,
          draft.parent.headquartersCountry,
        ]
          .map((p) => p.trim())
          .filter(Boolean)
          .join(', '),
        websiteUrl: draft.parent.websiteUrl.trim() || undefined,
        taxNumber: draft.parent.taxNumber.trim() || undefined,
        headquartersCountry: draft.parent.headquartersCountry.trim() || undefined,
        operationGeographies: operationGeographies || undefined,
        brandPortfolio: draft.businessUnits
          .map((u) => u.name.trim())
          .filter(Boolean)
          .join(', ') || undefined,
        description,
      });

      if (!created?.id) {
        throw new Error('Firma kaydı oluşturulamadı.');
      }

      for (const site of draft.sites) {
        const siteName = site.name.trim();
        if (!siteName) continue;
        await DB.branches.create(created.id, {
          name: siteName,
          type: ORG_SITE_KIND_LABELS[site.kind] || site.kind,
          address: [site.address, site.city, site.country]
            .map((p) => p.trim())
            .filter(Boolean)
            .join(', '),
        });
      }

      if (user) {
        await logActivity(
          user,
          'create',
          'customers',
          created.id,
          `Organizasyonel sınır onboarding ile firma oluşturuldu: "${displayName}"`,
        );
      }

      setCreatedCustomerId(created.id);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canCreateCustomersAndProjects) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Building2 className="mx-auto mb-4 text-slate-300" size={40} />
        <h1 className="text-xl font-bold text-slate-900">Yetki gerekli</h1>
        <p className="mt-2 text-sm text-slate-500">
          Bu onboarding akışını kullanmak için firma oluşturma yetkisine sahip
          olmalısınız.
        </p>
        <Link
          to="/customer-directory"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline"
        >
          Firma dizinine dön
        </Link>
      </div>
    );
  }

  if (createdCustomerId) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organizasyonel sınır kaydedildi
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Ana şirket, iştirakler, sahalar ve iş birimleri firma kaydına
          işlendi. Operasyonel sahalar tesis (şube) olarak eklendi.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/customers/${createdCustomerId}`)}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Firma profilini aç
          </button>
          <Link
            to="/customer-directory"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Firma dizinine dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/customer-directory"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-700"
          >
            <ArrowLeft size={14} />
            Firma dizini
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Organizasyonel Sınır Tanımı
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Karmaşık kurumsal yapıları — ana şirket, uluslararası iştirakler,
            operasyonel sahalar ve iş birimleri — adım adım haritalayarak
            raporlama sınırınızı netleştirin.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            İlerleme
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {progressPct}%
          </div>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, idx) => {
          const active = idx === stepIndex;
          const done = idx < stepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (idx <= stepIndex) setStepIndex(idx);
              }}
              className={cn(
                'min-w-[8.5rem] shrink-0 rounded-xl border px-3 py-2.5 text-left transition',
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-400',
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Adım {idx + 1}
              </div>
              <div className="mt-0.5 text-xs font-semibold">{s.title}</div>
            </button>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-start gap-3 border-b border-slate-100 pb-5">
          <StepIcon stepId={step.id} />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{step.subtitle}</p>
          </div>
        </div>

        {step.id === 'intro' && <IntroStep />}
        {step.id === 'parent' && (
          <ParentStep
            draft={draft}
            setDraft={setDraft}
            sectors={sectors}
            loadingSectors={loadingSectors}
          />
        )}
        {step.id === 'subsidiaries' && (
          <SubsidiariesStep draft={draft} setDraft={setDraft} />
        )}
        {step.id === 'sites' && <SitesStep draft={draft} setDraft={setDraft} />}
        {step.id === 'units' && <UnitsStep draft={draft} setDraft={setDraft} />}
        {step.id === 'review' && <ReviewStep draft={draft} sectors={sectors} />}

        {error ? (
          <p className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || saving}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft size={16} />
            Geri
          </button>

          {step.id !== 'review' ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Devam
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Firmayı oluştur
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function StepIcon({ stepId }: { stepId: StepId }) {
  const className =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700';
  switch (stepId) {
    case 'intro':
      return (
        <div className={className}>
          <Network size={20} />
        </div>
      );
    case 'parent':
      return (
        <div className={className}>
          <Building2 size={20} />
        </div>
      );
    case 'subsidiaries':
      return (
        <div className={className}>
          <Globe2 size={20} />
        </div>
      );
    case 'sites':
      return (
        <div className={className}>
          <Factory size={20} />
        </div>
      );
    case 'units':
      return (
        <div className={className}>
          <Layers size={20} />
        </div>
      );
    default:
      return (
        <div className={className}>
          <CheckCircle2 size={20} />
        </div>
      );
  }
}

function IntroStep() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-600">
      <p>
        <strong className="text-slate-900">Organizasyonel sınır tanımı</strong>,
        sürdürülebilirlik ve yönetişim raporlamasında hangi tüzel kişilerin,
        tesislerin ve faaliyet birimlerinin kapsama alınacağını belirler.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            icon: Building2,
            title: 'Ana şirket',
            body: 'Holding veya ebeveyn şirket — yasal unvan, merkez ülke ve sektör.',
          },
          {
            icon: Globe2,
            title: 'Uluslararası iştirakler',
            body: 'Yurt dışı bağlı ortaklıklar ve sahiplik oranları.',
          },
          {
            icon: MapPin,
            title: 'Operasyonel sahalar',
            body: 'Fabrika, ofis, depo ve saha noktaları — raporlama tesisi olarak kaydedilir.',
          },
          {
            icon: Layers,
            title: 'İş birimleri',
            body: 'Ürün hatları, bölge yönetimi veya fonksiyonel birimler.',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
          >
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <card.icon size={16} className="text-slate-500" />
              {card.title}
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{card.body}</p>
          </div>
        ))}
      </div>
      <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Bu akış, klasik «Yeni firma oluştur» formundan bağımsızdır. Mevcut
        form ve dizin sayfası değişmeden kalır; burada yalnızca organizasyonel
        sınır odaklı bir yol izlersiniz.
      </p>
    </div>
  );
}

function ParentStep({
  draft,
  setDraft,
  sectors,
  loadingSectors,
}: {
  draft: OrganizationalBoundaryDraft;
  setDraft: Dispatch<SetStateAction<OrganizationalBoundaryDraft>>;
  sectors: Segment[];
  loadingSectors: boolean;
}) {
  const p = draft.parent;
  const patch = (patch: Partial<typeof p>) =>
    setDraft((d) => ({ ...d, parent: { ...d.parent, ...patch } }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className={labelClass}>Yasal unvan *</label>
        <input
          className={inputClass}
          value={p.legalName}
          onChange={(e) => patch({ legalName: e.target.value })}
          placeholder="örn. Örnek Holding A.Ş."
        />
      </div>
      <div>
        <label className={labelClass}>Ticari / marka adı *</label>
        <input
          className={inputClass}
          value={p.brandName}
          onChange={(e) => patch({ brandName: e.target.value })}
          placeholder="örn. Örnek"
        />
      </div>
      <div>
        <label className={labelClass}>Merkez ülke</label>
        <input
          className={inputClass}
          value={p.headquartersCountry}
          onChange={(e) => patch({ headquartersCountry: e.target.value })}
          placeholder="Türkiye"
        />
      </div>
      <div>
        <label className={labelClass}>Merkez şehir</label>
        <input
          className={inputClass}
          value={p.headquartersCity}
          onChange={(e) => patch({ headquartersCity: e.target.value })}
          placeholder="İstanbul"
        />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Genel merkez adresi</label>
        <textarea
          className={cn(inputClass, 'min-h-[72px] resize-y')}
          value={p.headquartersAddress}
          onChange={(e) => patch({ headquartersAddress: e.target.value })}
          placeholder="Resmî adres"
        />
      </div>
      <div>
        <label className={labelClass}>Web sitesi</label>
        <input
          className={inputClass}
          value={p.websiteUrl}
          onChange={(e) => patch({ websiteUrl: e.target.value })}
          placeholder="https://"
        />
      </div>
      <div>
        <label className={labelClass}>Vergi numarası</label>
        <input
          className={inputClass}
          value={p.taxNumber}
          onChange={(e) => patch({ taxNumber: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Müşteri sektörü *</label>
        {loadingSectors ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Yükleniyor…
          </div>
        ) : (
          <select
            className={inputClass}
            value={p.sectorId}
            onChange={(e) => patch({ sectorId: e.target.value })}
          >
            <option value="">Sektör seçin…</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function SubsidiariesStep({
  draft,
  setDraft,
}: {
  draft: OrganizationalBoundaryDraft;
  setDraft: Dispatch<SetStateAction<OrganizationalBoundaryDraft>>;
}) {
  const add = () =>
    setDraft((d) => ({
      ...d,
      subsidiaries: [
        ...d.subsidiaries,
        {
          id: newOrgEntityId('sub'),
          name: '',
          country: '',
          ownershipPercent: '',
          notes: '',
        },
      ],
    }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Ana şirketin kontrol ettiği veya raporlama sınırına dahil edilecek
        uluslararası bağlı ortaklıkları ekleyin. İsterseniz bu adımı boş
        bırakabilirsiniz.
      </p>
      {draft.subsidiaries.map((row, index) => (
        <div
          key={row.id}
          className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              İştirak {index + 1}
            </span>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  subsidiaries: d.subsidiaries.filter((s) => s.id !== row.id),
                }))
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="İştirakı sil"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Şirket adı</label>
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    subsidiaries: d.subsidiaries.map((s) =>
                      s.id === row.id ? { ...s, name: e.target.value } : s,
                    ),
                  }))
                }
                placeholder="örn. Example GmbH"
              />
            </div>
            <div>
              <label className={labelClass}>Ülke</label>
              <input
                className={inputClass}
                value={row.country}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    subsidiaries: d.subsidiaries.map((s) =>
                      s.id === row.id ? { ...s, country: e.target.value } : s,
                    ),
                  }))
                }
                placeholder="örn. Almanya"
              />
            </div>
            <div>
              <label className={labelClass}>Sahiplik (%)</label>
              <input
                className={inputClass}
                value={row.ownershipPercent}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    subsidiaries: d.subsidiaries.map((s) =>
                      s.id === row.id
                        ? { ...s, ownershipPercent: e.target.value }
                        : s,
                    ),
                  }))
                }
                placeholder="100"
              />
            </div>
            <div>
              <label className={labelClass}>Not</label>
              <input
                className={inputClass}
                value={row.notes}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    subsidiaries: d.subsidiaries.map((s) =>
                      s.id === row.id ? { ...s, notes: e.target.value } : s,
                    ),
                  }))
                }
                placeholder="Kontrol ilişkisi, istisna vb."
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        <Plus size={16} />
        İştirak ekle
      </button>
    </div>
  );
}

function SitesStep({
  draft,
  setDraft,
}: {
  draft: OrganizationalBoundaryDraft;
  setDraft: Dispatch<SetStateAction<OrganizationalBoundaryDraft>>;
}) {
  const add = () =>
    setDraft((d) => ({
      ...d,
      sites: [
        ...d.sites,
        {
          id: newOrgEntityId('site'),
          name: '',
          kind: 'fabrika',
          country: d.parent.headquartersCountry || 'Türkiye',
          city: '',
          address: '',
        },
      ],
    }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Üretim, ofis, depo ve saha noktalarını tanımlayın. Kayıt sırasında bu
        sahalar firma altında tesis olarak oluşturulur.
      </p>
      {draft.sites.map((row, index) => (
        <div
          key={row.id}
          className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Saha {index + 1}
            </span>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  sites: d.sites.filter((s) => s.id !== row.id),
                }))
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Sahayı sil"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Saha adı</label>
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sites: d.sites.map((s) =>
                      s.id === row.id ? { ...s, name: e.target.value } : s,
                    ),
                  }))
                }
                placeholder="örn. Gebze Fabrikası"
              />
            </div>
            <div>
              <label className={labelClass}>Tür</label>
              <select
                className={inputClass}
                value={row.kind}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sites: d.sites.map((s) =>
                      s.id === row.id
                        ? { ...s, kind: e.target.value as OrgSiteKind }
                        : s,
                    ),
                  }))
                }
              >
                {(Object.keys(ORG_SITE_KIND_LABELS) as OrgSiteKind[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {ORG_SITE_KIND_LABELS[k]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ülke</label>
              <input
                className={inputClass}
                value={row.country}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sites: d.sites.map((s) =>
                      s.id === row.id ? { ...s, country: e.target.value } : s,
                    ),
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Şehir</label>
              <input
                className={inputClass}
                value={row.city}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sites: d.sites.map((s) =>
                      s.id === row.id ? { ...s, city: e.target.value } : s,
                    ),
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Adres</label>
              <input
                className={inputClass}
                value={row.address}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sites: d.sites.map((s) =>
                      s.id === row.id ? { ...s, address: e.target.value } : s,
                    ),
                  }))
                }
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        <Plus size={16} />
        Saha ekle
      </button>
    </div>
  );
}

function UnitsStep({
  draft,
  setDraft,
}: {
  draft: OrganizationalBoundaryDraft;
  setDraft: Dispatch<SetStateAction<OrganizationalBoundaryDraft>>;
}) {
  const add = () =>
    setDraft((d) => ({
      ...d,
      businessUnits: [
        ...d.businessUnits,
        { id: newOrgEntityId('bu'), name: '', description: '' },
      ],
    }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Raporlama veya yönetişim açısından anlamlı iş birimlerini tanımlayın
        (ör. Kimyasallar, Enerji, Perakende).
      </p>
      {draft.businessUnits.map((row, index) => (
        <div
          key={row.id}
          className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Birim {index + 1}
            </span>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  businessUnits: d.businessUnits.filter((u) => u.id !== row.id),
                }))
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Birimi sil"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Birim adı</label>
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    businessUnits: d.businessUnits.map((u) =>
                      u.id === row.id ? { ...u, name: e.target.value } : u,
                    ),
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Açıklama</label>
              <input
                className={inputClass}
                value={row.description}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    businessUnits: d.businessUnits.map((u) =>
                      u.id === row.id
                        ? { ...u, description: e.target.value }
                        : u,
                    ),
                  }))
                }
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        <Plus size={16} />
        İş birimi ekle
      </button>

      <div className="pt-2">
        <label className={labelClass}>Konsolidasyon / sınır notları</label>
        <textarea
          className={cn(inputClass, 'min-h-[96px] resize-y')}
          value={draft.consolidationNotes}
          onChange={(e) =>
            setDraft((d) => ({ ...d, consolidationNotes: e.target.value }))
          }
          placeholder="Örn. Ortak girişimler hariç tutuldu; kiralama operasyonları dahil…"
        />
      </div>
    </div>
  );
}

function ReviewStep({
  draft,
  sectors,
}: {
  draft: OrganizationalBoundaryDraft;
  sectors: Segment[];
}) {
  const sectorName =
    sectors.find((s) => s.id === draft.parent.sectorId)?.name || '—';

  return (
    <div className="space-y-5 text-sm">
      <p className="text-slate-500">
        Aşağıdaki özeti kontrol edin. Onayladığınızda firma kaydı oluşturulur;
        sahalar tesis olarak eklenir.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryCard title="Ana şirket">
          <p className="font-semibold text-slate-900">
            {draft.parent.brandName || draft.parent.legalName || '—'}
          </p>
          <p className="text-xs text-slate-500">{draft.parent.legalName}</p>
          <p className="mt-2 text-xs text-slate-500">
            {[draft.parent.headquartersCity, draft.parent.headquartersCountry]
              .filter(Boolean)
              .join(', ') || 'Merkez belirtilmedi'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sektör: {sectorName}</p>
        </SummaryCard>
        <SummaryCard title="İştirakler">
          <p className="font-semibold tabular-nums text-slate-900">
            {draft.subsidiaries.length}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {draft.subsidiaries.slice(0, 4).map((s) => (
              <li key={s.id}>
                {s.name || 'Adsız'} — {s.country || '—'}
              </li>
            ))}
            {draft.subsidiaries.length === 0 ? <li>Yok</li> : null}
          </ul>
        </SummaryCard>
        <SummaryCard title="Operasyonel sahalar">
          <p className="font-semibold tabular-nums text-slate-900">
            {draft.sites.length}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {draft.sites.slice(0, 4).map((s) => (
              <li key={s.id}>
                {s.name || 'Adsız'} ({ORG_SITE_KIND_LABELS[s.kind]})
              </li>
            ))}
            {draft.sites.length === 0 ? <li>Yok</li> : null}
          </ul>
        </SummaryCard>
        <SummaryCard title="İş birimleri">
          <p className="font-semibold tabular-nums text-slate-900">
            {draft.businessUnits.length}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {draft.businessUnits.slice(0, 4).map((u) => (
              <li key={u.id}>{u.name || 'Adsız'}</li>
            ))}
            {draft.businessUnits.length === 0 ? <li>Yok</li> : null}
          </ul>
        </SummaryCard>
      </div>
      {draft.consolidationNotes.trim() ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="mb-1 font-bold uppercase tracking-widest text-slate-400">
            Notlar
          </div>
          {draft.consolidationNotes}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}
