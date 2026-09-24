/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manage a survey's stakeholder groups (with weights) and their stakeholders.
 * Invitations/reminders are Phase 4 — this only builds the recipient list.
 */

import { useState } from 'react';
import { Button } from '../../../shared/ui/button.tsx';
import { Input } from '../../../shared/ui/input.tsx';
import {
  useGroups,
  useStakeholders,
  useSurveyChildMutations,
} from '../hooks/useMaterialitySurveys.ts';
import type { StakeholderDraft } from '../api/surveysApi.ts';

const STATUS_COLOR: Record<string, string> = {
  invited: 'bg-slate-100 text-slate-600',
  reminded: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-600',
};

export function StakeholderManager({ surveyId }: { surveyId: string }) {
  const { data: groups = [] } = useGroups(surveyId);
  const { data: stakeholders = [] } = useStakeholders(surveyId);
  const { createGroup, deleteGroup, addStakeholders, sendInvitations } = useSurveyChildMutations(surveyId);

  const pendingCount = stakeholders.filter((s) => s.status === 'invited' && !s.invitedAt).length;

  const [groupName, setGroupName] = useState('');
  const [groupWeight, setGroupWeight] = useState('1');
  const [targetGroup, setTargetGroup] = useState('');
  const [bulk, setBulk] = useState('');

  const addGroup = () => {
    if (!groupName.trim()) return;
    createGroup.mutate(
      { name: groupName.trim(), weight: Number(groupWeight) || 1 },
      { onSuccess: () => { setGroupName(''); setGroupWeight('1'); } },
    );
  };

  const parseBulk = (): StakeholderDraft[] =>
    bulk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, email] = line.split(',').map((s) => s.trim());
        return { groupId: targetGroup, name: name || '', email: email || name };
      })
      .filter((s) => s.email.includes('@'));

  const submitBulk = () => {
    const list = parseBulk();
    if (!targetGroup || list.length === 0) return;
    addStakeholders.mutate(list, { onSuccess: () => setBulk('') });
  };

  const groupName_ = (id: string) => groups.find((g) => g.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      {/* Groups */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Paydaş Grupları</h4>
        <div className="flex flex-wrap items-end gap-2">
          <Input placeholder="Grup adı (örn. Yatırımcılar)" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-56" />
          <Input type="number" step="0.1" placeholder="Ağırlık" value={groupWeight} onChange={(e) => setGroupWeight(e.target.value)} className="w-24" />
          <Button disabled={!groupName.trim() || createGroup.isPending} onClick={addGroup}>Grup Ekle</Button>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
              <span className="font-medium text-slate-700">{g.name}</span>
              <span className="text-slate-400">×{g.weight}</span>
              <button className="text-red-400 hover:text-red-600" disabled={deleteGroup.isPending} onClick={() => deleteGroup.mutate(g.id)}>×</button>
            </li>
          ))}
          {groups.length === 0 && <li className="text-xs text-slate-400">Henüz grup yok.</li>}
        </ul>
      </section>

      {/* Bulk add stakeholders */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Paydaş Ekle</h4>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
            <option value="">Grup seçin…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={4}
          placeholder="Her satıra bir kişi:  Ada Yılmaz, ada@firma.com"
          className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button disabled={!targetGroup || addStakeholders.isPending} onClick={submitBulk}>
            {addStakeholders.isPending ? 'Ekleniyor…' : 'Paydaşları Ekle'}
          </Button>
          {addStakeholders.isSuccess && <span className="text-xs text-emerald-600">{addStakeholders.data?.added} kişi eklendi</span>}
        </div>
      </section>

      {/* Invitations */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Davetler</h4>
            <p className="text-xs text-slate-400">{pendingCount} paydaş henüz davet edilmedi. Hatırlatmalar zamanlanmış görevle otomatik gönderilir.</p>
          </div>
          <div className="flex items-center gap-3">
            {sendInvitations.isSuccess && (
              <span className="text-xs text-emerald-600">{sendInvitations.data?.sent} gönderildi{sendInvitations.data && sendInvitations.data.failed > 0 ? `, ${sendInvitations.data.failed} başarısız` : ''}</span>
            )}
            {sendInvitations.isError && <span className="text-xs text-red-600">Gönderim başarısız</span>}
            <Button
              variant="secondary"
              disabled={sendInvitations.isPending || pendingCount === 0}
              onClick={() => sendInvitations.mutate(true)}
            >
              {sendInvitations.isPending ? 'Gönderiliyor…' : 'Bekleyenlere Davet Gönder'}
            </Button>
            <Button
              disabled={sendInvitations.isPending || stakeholders.length === 0}
              onClick={() => sendInvitations.mutate(false)}
            >
              Tümüne Gönder
            </Button>
          </div>
        </div>
      </section>

      {/* Stakeholder list */}
      <section>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Paydaşlar ({stakeholders.length})</h4>
        {stakeholders.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz paydaş yok.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {stakeholders.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-700">{s.name || s.email}</span>
                  <span className="ml-2 text-slate-400">{s.email}</span>
                  <span className="ml-2 text-[10px] text-slate-400">{groupName_(s.groupId)} · {s.locale}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[s.status] ?? ''}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
