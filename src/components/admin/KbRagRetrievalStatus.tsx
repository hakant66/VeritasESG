/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useKbRagHealth } from '../../shared/hooks/useKbRagHealth.ts';
import { Button } from '../../shared/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../shared/ui/dialog.tsx';
import { cn } from '../../lib/utils';

export function KbRagRetrievalStatus() {
  const { t, lang } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useKbRagHealth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-xs text-red-600">
        {lang === 'tr' ? 'KB RAG durumu alınamadı' : 'Could not load KB RAG status'}
      </p>
    );
  }

  const hybrid = data.retrieval.hybridSearchEnabled;
  const rerank = data.retrieval.rerank;
  const qdrantOk = data.qdrant != null && !data.qdrantError;

  const summary =
    lang === 'tr'
      ? `${hybrid ? 'Hibrit arama' : 'Vektör arama'} · ${rerank.enabled ? `Rerank (${rerank.provider})` : 'Rerank kapalı'} · Qdrant ${qdrantOk ? 'OK' : 'hata'}`
      : `${hybrid ? 'Hybrid search' : 'Vector search'} · ${rerank.enabled ? `Rerank (${rerank.provider})` : 'Rerank off'} · Qdrant ${qdrantOk ? 'OK' : 'error'}`;

  return (
    <Dialog>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest',
            hybrid ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600',
          )}
        >
          {hybrid
            ? lang === 'tr'
              ? 'Hibrit KB'
              : 'Hybrid KB'
            : lang === 'tr'
              ? 'Vektör KB'
              : 'Vector KB'}
        </span>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-widest">
            {lang === 'tr' ? 'RAG detayı' : 'RAG details'}
          </Button>
        </DialogTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] uppercase tracking-widest"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? <Loader2 className="animate-spin" /> : lang === 'tr' ? 'Yenile' : 'Refresh'}
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{summary}</p>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lang === 'tr' ? 'Bilgi bankası RAG' : 'Knowledge base RAG'}
          </DialogTitle>
          <DialogDescription>
            {lang === 'tr'
              ? 'Retrieval, embedding ve vektör indeks durumu.'
              : 'Retrieval, embedding, and vector index status.'}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {lang === 'tr' ? 'Hibrit arama' : 'Hybrid search'}
            </dt>
            <dd className="text-slate-800">{hybrid ? 'enabled' : 'disabled'}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Rerank</dt>
            <dd className="text-slate-800">
              {rerank.enabled ? `${rerank.provider} (${rerank.model})` : 'none'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Qdrant</dt>
            <dd className="text-slate-800">
              {qdrantOk
                ? data.qdrant?.collection ?? 'connected'
                : data.qdrantError ?? 'unreachable'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {lang === 'tr' ? 'Embedding' : 'Embedding'}
            </dt>
            <dd className="text-slate-800">
              {data.llm.embeddingProvider} —{' '}
              {data.llmEmbedding && data.llm.embeddingConfigured ? 'configured' : 'not configured'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {lang === 'tr' ? 'Kuyruk' : 'Queue'}
            </dt>
            <dd className="text-slate-800">{data.redisQueue ? 'Redis' : 'inline'}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
