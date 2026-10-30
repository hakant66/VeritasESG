/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AlertCircle, Check, FlaskConical, Loader2 } from 'lucide-react';
import { DEFAULT_AI_QUALITY_SETTINGS, type AiQualitySettings } from '../../../lib/aiQualitySettings.ts';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { useAiQualitySettings, useSaveAiQualitySettings } from '../../shared/hooks/useAiQualitySettings.ts';

export default function AiQualityPanel() {
  const { t } = useTranslation();
  const { data, isLoading } = useAiQualitySettings();
  const saveMutation = useSaveAiQualitySettings();
  const [settings, setSettings] = useState<AiQualitySettings>(DEFAULT_AI_QUALITY_SETTINGS);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  const handleToggle = () => {
    const next = { ...settings, enabled: !settings.enabled };
    setSettings(next);
    setStatus('idle');
    saveMutation.mutate(next, {
      onSuccess: (response) => {
        setSettings(response.settings);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      },
      onError: (error) => {
        console.error('Failed to save AI Quality settings', error);
        setSettings((prev) => ({ ...prev, enabled: !next.enabled }));
        setStatus('error');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="w-11 h-11 shrink-0 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <FlaskConical size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{t.settingsPage.aiQualityTitle}</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t.settingsPage.aiQualityDescription}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={handleToggle}
          disabled={saveMutation.isPending}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
            settings.enabled ? 'bg-indigo-600' : 'bg-slate-200',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
              settings.enabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
          <Check size={14} /> {t.settingsPage.aiQualitySaved}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
          <AlertCircle size={14} /> {t.settingsPage.aiQualitySaveFailed}
        </div>
      )}

      <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {t.settingsPage.aiQualityOverviewTitle}
        </h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400">{t.settingsPage.aiQualityStatusLabel}</dt>
            <dd className={cn('font-bold', settings.enabled ? 'text-indigo-600' : 'text-slate-500')}>
              {settings.enabled ? t.settingsPage.aiQualityStatusEnabled : t.settingsPage.aiQualityStatusDisabled}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t.settingsPage.aiQualityActiveAdapterLabel}</dt>
            <dd className="font-bold text-slate-400">{t.settingsPage.aiQualityNoAdapterYet}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t.settingsPage.aiQualityLatestEvaluationLabel}</dt>
            <dd className="font-bold text-slate-400">{t.settingsPage.aiQualityNoEvaluationYet}</dd>
          </div>
        </dl>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{t.settingsPage.aiQualityRoadmapNote}</p>
    </div>
  );
}
