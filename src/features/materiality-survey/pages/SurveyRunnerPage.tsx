/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public, tokenized, mobile-first survey runner (Phase 3). No login: the
 * :token in the URL is the stakeholder's invite token. Localized (TR/EN) by
 * the stakeholder's locale. Idempotent per (iro, stakeholder) on the server.
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getPublicSurvey,
  submitResponses,
  type PublicSurveyContext,
  type ResponseDraft,
} from '../api/surveyPublicApi.ts';

const STRINGS = {
  tr: {
    loading: 'Yükleniyor…',
    invalidTitle: 'Geçersiz bağlantı',
    invalidBody: 'Bu anket bağlantısı geçersiz veya süresi dolmuş.',
    closedTitle: 'Anket kapandı',
    thanksTitle: 'Teşekkürler!',
    closedBody: 'Bu anket artık yanıt kabul etmiyor.',
    thanksBody: 'Yanıtlarınız kaydedildi. Katkınız için teşekkür ederiz.',
    intro: (max: number) => `Her konu için finansal önemlilik ve etki boyutlarını 1–${max} arası puanlayın.`,
    noTopics: 'Bu ankette henüz değerlendirilecek konu yok.',
    financial: 'Finansal önemlilik (şirkete etkisi)',
    severity: 'Etki şiddeti',
    scope: 'Etki kapsamı',
    probability: 'Olasılık',
    comment: 'Yorum (isteğe bağlı)',
    progress: (n: number, t: number) => `${n}/${t} tamamlandı`,
    saving: 'Kaydediliyor…',
    save: 'Kaydet',
    submit: 'Gönder',
    saveError: 'Kaydetme başarısız, tekrar deneyin.',
  },
  en: {
    loading: 'Loading…',
    invalidTitle: 'Invalid link',
    invalidBody: 'This survey link is invalid or has expired.',
    closedTitle: 'Survey closed',
    thanksTitle: 'Thank you!',
    closedBody: 'This survey is no longer accepting responses.',
    thanksBody: 'Your responses have been saved. Thank you for your input.',
    intro: (max: number) => `Score each topic on financial materiality and the impact dimensions from 1 to ${max}.`,
    noTopics: 'This survey has no topics to assess yet.',
    financial: 'Financial materiality (effect on the company)',
    severity: 'Impact severity',
    scope: 'Impact scope',
    probability: 'Probability',
    comment: 'Comment (optional)',
    progress: (n: number, t: number) => `${n}/${t} completed`,
    saving: 'Saving…',
    save: 'Save',
    submit: 'Submit',
    saveError: 'Saving failed, please try again.',
  },
};
type Strings = typeof STRINGS.tr;

interface Answer {
  financialMaterialityScore: number;
  impactSeverityScore: number;
  impactScopeScore: number;
  impactProbabilityScore: number;
  freeTextComment: string;
}

const EMPTY: Answer = {
  financialMaterialityScore: 0,
  impactSeverityScore: 0,
  impactScopeScore: 0,
  impactProbabilityScore: 0,
  freeTextComment: '',
};

function ScaleRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${
              value === n ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildInitial(ctx: PublicSurveyContext): Record<string, Answer> {
  const map: Record<string, Answer> = {};
  for (const iro of ctx.iros) map[iro.id] = { ...EMPTY };
  for (const r of ctx.responses) {
    map[r.iroId] = {
      financialMaterialityScore: r.financialMaterialityScore,
      impactSeverityScore: r.impactSeverityScore,
      impactScopeScore: r.impactScopeScore,
      impactProbabilityScore: r.impactProbabilityScore,
      freeTextComment: r.freeTextComment ?? '',
    };
  }
  return map;
}

const answered = (a: Answer) =>
  a.financialMaterialityScore > 0 && a.impactSeverityScore > 0 && a.impactScopeScore > 0 && a.impactProbabilityScore > 0;

export default function SurveyRunnerPage() {
  const { token = '' } = useParams();
  const query = useQuery({
    queryKey: ['materiality-survey', 'public', token],
    queryFn: () => getPublicSurvey(token),
    enabled: Boolean(token),
    retry: false,
  });

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [initialized, setInitialized] = useState(false);
  const [done, setDone] = useState(false);

  const ctx = query.data;
  if (ctx && !initialized) {
    setAnswers(buildInitial(ctx));
    setInitialized(true);
    if (ctx.stakeholder.status === 'completed') setDone(true);
  }

  const L: Strings = STRINGS[ctx?.stakeholder.locale === 'en' ? 'en' : 'tr'];

  const drafts = useMemo<ResponseDraft[]>(
    () =>
      Object.entries(answers)
        .filter(([, a]) => answered(a))
        .map(([iroId, a]) => ({ iroId, ...a })),
    [answers],
  );

  const total = ctx?.iros.length ?? 0;
  const completedCount = drafts.length;

  const save = useMutation({
    mutationFn: (complete: boolean) => submitResponses(token, drafts, complete),
    onSuccess: (res) => { if (res.completed) setDone(true); },
  });

  const set = (iroId: string, patch: Partial<Answer>) =>
    setAnswers((prev) => ({ ...prev, [iroId]: { ...(prev[iroId] ?? EMPTY), ...patch } }));

  if (query.isLoading) return <Centered><p className="text-slate-500">{L.loading}</p></Centered>;
  if (query.isError || !ctx) {
    return (
      <Centered>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-800">{L.invalidTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{L.invalidBody}</p>
        </div>
      </Centered>
    );
  }

  const closed = ctx.survey.status === 'finalized';
  const max = ctx.survey.scaleMax || 5;

  if (done || closed) {
    return (
      <Centered>
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-lg font-semibold text-slate-800">{closed ? L.closedTitle : L.thanksTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{closed ? L.closedBody : L.thanksBody}</p>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-base font-bold text-slate-800">{ctx.survey.title}</h1>
          <p className="text-xs text-slate-500">{ctx.group.name} · {ctx.stakeholder.name}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        <p className="mb-4 text-sm text-slate-600">{L.intro(max)}</p>
        {ctx.iros.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">{L.noTopics}</p>
        )}
        {ctx.iros.map((iro, idx) => {
          const a = answers[iro.id] ?? EMPTY;
          return (
            <section key={iro.id} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{iro.iroType}</span>
                <span className="text-sm font-semibold text-slate-800">{idx + 1}. {iro.topicRef}</span>
                {iro.description && <p className="mt-1 text-sm text-slate-500">{iro.description}</p>}
              </div>
              <ScaleRow label={L.financial} value={a.financialMaterialityScore} max={max} onChange={(v) => set(iro.id, { financialMaterialityScore: v })} />
              <ScaleRow label={L.severity} value={a.impactSeverityScore} max={max} onChange={(v) => set(iro.id, { impactSeverityScore: v })} />
              <ScaleRow label={L.scope} value={a.impactScopeScore} max={max} onChange={(v) => set(iro.id, { impactScopeScore: v })} />
              <ScaleRow label={L.probability} value={a.impactProbabilityScore} max={max} onChange={(v) => set(iro.id, { impactProbabilityScore: v })} />
              <textarea
                value={a.freeTextComment}
                onChange={(e) => set(iro.id, { freeTextComment: e.target.value })}
                rows={2}
                placeholder={L.comment}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
              />
            </section>
          );
        })}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{L.progress(completedCount, total)}</span>
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate(false)}
              disabled={save.isPending || drafts.length === 0}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              {save.isPending ? L.saving : L.save}
            </button>
            <button
              onClick={() => save.mutate(true)}
              disabled={save.isPending || completedCount < total || total === 0}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {L.submit}
            </button>
          </div>
        </div>
        {save.isError && <p className="mx-auto mt-1 max-w-2xl text-xs text-red-600">{L.saveError}</p>}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">{children}</div>;
}
