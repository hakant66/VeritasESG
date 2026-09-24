/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manage a survey's IROs (Impacts / Risks / Opportunities) and import a topic
 * longlist CSV (existing id;subject;griMapping;disclosures;... format).
 */

import { useState } from 'react';
import { Button } from '../../../shared/ui/button.tsx';
import { Input } from '../../../shared/ui/input.tsx';
import { useIros, useSurveyChildMutations } from '../hooks/useMaterialitySurveys.ts';
import type { IroType, Polarity, ValueChainPosition } from '../api/surveysApi.ts';

const IRO_TYPES: IroType[] = ['impact', 'risk', 'opportunity'];
const POSITIONS: ValueChainPosition[] = ['own_operations', 'upstream', 'downstream'];
const POLARITIES: Polarity[] = ['negative', 'positive'];

export function TopicIroBuilder({ surveyId }: { surveyId: string }) {
  const { data: iros = [], isLoading } = useIros(surveyId);
  const { createIro, deleteIro, importTopics } = useSurveyChildMutations(surveyId);

  const [topicRef, setTopicRef] = useState('');
  const [description, setDescription] = useState('');
  const [iroType, setIroType] = useState<IroType>('impact');
  const [position, setPosition] = useState<ValueChainPosition>('own_operations');
  const [polarity, setPolarity] = useState<Polarity>('negative');
  const [csv, setCsv] = useState('');

  const canAdd = topicRef.trim().length > 0 && !createIro.isPending;

  const submitIro = () => {
    if (!canAdd) return;
    createIro.mutate(
      {
        topicRef: topicRef.trim(),
        description: description.trim(),
        iroType,
        valueChainPosition: position,
        polarity,
      },
      {
        onSuccess: () => {
          setTopicRef('');
          setDescription('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* CSV topic import */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Konu Listesi İçe Aktar (CSV)</h4>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={4}
          placeholder="id;subject;griMapping;disclosures;financialImpact;impactSeverity;probability;stakeholderConcern;isMaterial;notes"
          className="w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={!csv.trim() || importTopics.isPending}
            onClick={() => importTopics.mutate(csv, { onSuccess: () => setCsv('') })}
          >
            {importTopics.isPending ? 'İçe aktarılıyor…' : 'İçe Aktar'}
          </Button>
          {importTopics.isSuccess && <span className="text-xs text-emerald-600">{importTopics.data?.imported} konu eklendi</span>}
          {importTopics.isError && <span className="text-xs text-red-600">İçe aktarma başarısız</span>}
        </div>
      </section>

      {/* Add IRO */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">IRO Ekle</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="Konu referansı (topicRef)" value={topicRef} onChange={(e) => setTopicRef(e.target.value)} />
          <Input placeholder="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={iroType} onChange={(e) => setIroType(e.target.value as IroType)}>
            {IRO_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={position} onChange={(e) => setPosition(e.target.value as ValueChainPosition)}>
            {POSITIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={polarity} onChange={(e) => setPolarity(e.target.value as Polarity)}>
            {POLARITIES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <Button disabled={!canAdd} onClick={submitIro}>{createIro.isPending ? 'Ekleniyor…' : 'IRO Ekle'}</Button>
        </div>
      </section>

      {/* IRO list */}
      <section>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">IRO’lar ({iros.length})</h4>
        {isLoading ? (
          <p className="text-sm text-slate-400">Yükleniyor…</p>
        ) : iros.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz IRO yok.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {iros.map((iro) => (
              <li key={iro.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{iro.iroType}</span>
                  <span className="font-medium text-slate-700">{iro.topicRef}</span>
                  {iro.description && <span className="ml-2 text-slate-500">— {iro.description}</span>}
                  <span className="ml-2 text-[10px] text-slate-400">{iro.valueChainPosition} · {iro.polarity}</span>
                </div>
                <button
                  className="shrink-0 text-xs text-red-500 hover:underline disabled:opacity-50"
                  disabled={deleteIro.isPending}
                  onClick={() => deleteIro.mutate(iro.id)}
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
