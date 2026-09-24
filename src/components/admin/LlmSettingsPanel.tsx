/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AlertCircle, Check, Key, Loader2, Save, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import {
  DEFAULT_LLM_SETTINGS,
  LLM_EMBEDDING_PROVIDER_IDS,
  LLM_PROVIDER_IDS,
  type LlmEmbeddingProviderId,
  type LlmProviderConfig,
  type LlmProviderId,
  type LlmSettings,
} from '../../../lib/llmSettings.ts';
import {
  DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_EN,
  DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_TR,
} from '../../../lib/taskGeneralAutofillPrompt.ts';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { KbRagRetrievalStatus } from './KbRagRetrievalStatus.tsx';
import {
  useLlmSettings,
  useOllamaHealthCheck,
  useSaveLlmSettings,
} from '../../shared/hooks/useLlmSettings.ts';
import { Button } from '../../shared/ui/button.tsx';

interface LlmSettingsResponse {
  settings: LlmSettings;
  summary?: {
    textProvider: LlmProviderId;
    embeddingProvider: LlmEmbeddingProviderId;
    textConfigured: boolean;
    embeddingConfigured: boolean;
  };
}

function providerLabel(provider: LlmProviderId, lang: 'en' | 'tr') {
  switch (provider) {
    case 'gemini':
      return 'Google Gemini';
    case 'openai':
      return 'OpenAI';
    case 'claude':
      return lang === 'tr' ? 'Anthropic Claude' : 'Anthropic Claude';
    case 'ollama':
      return lang === 'tr' ? 'Ollama (yerel)' : 'Ollama (local)';
    default:
      return provider;
  }
}

function updateProviderConfig(
  settings: LlmSettings,
  provider: LlmProviderId,
  patch: Partial<LlmProviderConfig>,
): LlmSettings {
  return {
    ...settings,
    [provider]: {
      ...settings[provider],
      ...patch,
    },
  };
}

export default function LlmSettingsPanel() {
  const { t, lang } = useTranslation();
  const { data, isLoading, isError } = useLlmSettings();
  const saveMutation = useSaveLlmSettings();
  const ollamaMutation = useOllamaHealthCheck();
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_LLM_SETTINGS);
  const [summary, setSummary] = useState<LlmSettingsResponse['summary']>();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedProvider, setExpandedProvider] = useState<LlmProviderId>('gemini');

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
      setSummary(data.summary);
      if (data.settings.activeProvider) {
        setExpandedProvider(data.settings.activeProvider);
      }
    }
  }, [data]);

  const handleSave = () => {
    setStatus('idle');
    saveMutation.mutate(settings, {
      onSuccess: (response) => {
        setSettings({ ...DEFAULT_LLM_SETTINGS, ...response.settings });
        setSummary(response.summary);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      },
      onError: (error) => {
        console.error('Failed to save LLM settings', error);
        setStatus('error');
      },
    });
  };

  const handleTestOllama = () => {
    ollamaMutation.mutate(settings.ollama.baseUrl);
  };

  const renderProviderFields = (provider: LlmProviderId) => {
    const config = settings[provider];
    const isOllama = provider === 'ollama';
    const isClaude = provider === 'claude';
    const showEmbeddingFields = !isClaude;

    return (
      <div className="space-y-4">
        {!isOllama && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {t.settingsPage.llmApiKeyLabel}
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) =>
                  setSettings(updateProviderConfig(settings, provider, { apiKey: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-mono"
                placeholder={t.settingsPage.llmApiKeyPlaceholder}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {(isOllama || provider === 'openai' || isClaude) && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {t.settingsPage.llmBaseUrlLabel}
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) =>
                setSettings(updateProviderConfig(settings, provider, { baseUrl: e.target.value }))
              }
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-mono"
              placeholder={
                isOllama ? 'http://127.0.0.1:11434' : t.settingsPage.llmBaseUrlOptionalPlaceholder
              }
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {t.settingsPage.llmTextModelLabel}
            </label>
            <input
              type="text"
              value={config.textModel}
              onChange={(e) =>
                setSettings(updateProviderConfig(settings, provider, { textModel: e.target.value }))
              }
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-mono"
            />
          </div>

          {showEmbeddingFields && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {t.settingsPage.llmEmbeddingModelLabel}
              </label>
              <input
                type="text"
                value={config.embeddingModel}
                onChange={(e) =>
                  setSettings(
                    updateProviderConfig(settings, provider, { embeddingModel: e.target.value }),
                  )
                }
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-mono"
              />
            </div>
          )}
        </div>

        {showEmbeddingFields && (
          <div className="space-y-1.5 max-w-xs">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              {t.settingsPage.llmEmbeddingDimensionsLabel}
            </label>
            <input
              type="number"
              min={128}
              max={3072}
              value={config.embeddingDimensions}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSettings(
                  updateProviderConfig(settings, provider, {
                    embeddingDimensions: Number.isFinite(n) && n > 0 ? Math.floor(n) : 768,
                  }),
                );
              }}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-mono"
            />
          </div>
        )}

        {isClaude && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 leading-relaxed">
            {t.settingsPage.llmClaudeEmbeddingNote}
          </p>
        )}

        {isOllama && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 leading-relaxed">
              {t.settingsPage.llmOllamaGpuHostNote}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[10px] uppercase tracking-widest"
              disabled={ollamaMutation.isPending || !config.baseUrl.trim()}
              onClick={() => void handleTestOllama()}
            >
              {ollamaMutation.isPending ? t.common.loading : t.settingsPage.llmOllamaTestConnection}
            </Button>
            {ollamaMutation.data && (
              <div
                className={cn(
                  'text-[11px] rounded-xl px-4 py-3 border leading-relaxed space-y-1',
                  ollamaMutation.data.ok
                    ? 'bg-green-50 border-green-100 text-green-800'
                    : 'bg-red-50 border-red-100 text-red-700',
                )}
              >
                <p className="font-semibold">
                  {ollamaMutation.data.ok
                    ? t.settingsPage.llmOllamaTestOk
                    : t.settingsPage.llmOllamaTestFailed}
                </p>
                {ollamaMutation.data.error && <p>{ollamaMutation.data.error}</p>}
                {ollamaMutation.data.models && ollamaMutation.data.models.length > 0 && (
                  <p>
                    {t.settingsPage.llmOllamaTestModels}: {ollamaMutation.data.models.slice(0, 8).join(', ')}
                    {ollamaMutation.data.models.length > 8 ? '…' : ''}
                  </p>
                )}
                {ollamaMutation.data.runningModels && ollamaMutation.data.runningModels.length > 0 ? (
                  <p>
                    {t.settingsPage.llmOllamaTestRunning}:{' '}
                    {ollamaMutation.data.runningModels
                      .map((m) => `${m.name} (${m.processor ?? 'cpu'})`)
                      .join(', ')}
                  </p>
                ) : ollamaMutation.data.ok ? (
                  <p>{t.settingsPage.llmOllamaTestNoneRunning}</p>
                ) : null}
              </div>
            )}
            {ollamaMutation.isError && (
              <div className="text-[11px] rounded-xl px-4 py-3 border bg-red-50 border-red-100 text-red-700">
                {ollamaMutation.error instanceof Error
                  ? ollamaMutation.error.message
                  : 'Request failed'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
        {t.settingsPage.llmSaveFailed}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg border border-slate-200">
            <Sparkles size={18} className="text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t.settingsPage.llmPageTitle}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {t.settingsPage.llmPageSubtitle}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          size="sm"
          className="shrink-0 rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200/20"
        >
          {saveMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : status === 'success' ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Save size={14} />
          )}
          {saveMutation.isPending
            ? t.common.saving
            : status === 'success'
              ? t.common.saved
              : t.common.saveChanges}
        </Button>
      </div>

      <div className="p-8 space-y-8">
        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{t.settingsPage.llmSaveFailed}</span>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t.settingsPage.llmActiveTextProvider}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {providerLabel(summary.textProvider, lang)}
              </p>
              <p
                className={cn(
                  'mt-1 text-xs font-medium',
                  summary.textConfigured ? 'text-green-600' : 'text-amber-600',
                )}
              >
                {summary.textConfigured
                  ? t.settingsPage.llmStatusConfigured
                  : t.settingsPage.llmStatusMissing}
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t.settingsPage.llmActiveEmbeddingProvider}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {providerLabel(summary.embeddingProvider, lang)}
              </p>
              <p
                className={cn(
                  'mt-1 text-xs font-medium',
                  summary.embeddingConfigured ? 'text-green-600' : 'text-amber-600',
                )}
              >
                {summary.embeddingConfigured
                  ? t.settingsPage.llmStatusConfigured
                  : t.settingsPage.llmStatusMissing}
              </p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            {lang === 'tr' ? 'KB RAG retrieval' : 'KB RAG retrieval'}
          </p>
          <KbRagRetrievalStatus />
        </div>

        <p className="text-sm text-slate-600 leading-relaxed border-l-4 border-violet-500 pl-4 py-1">
          {t.settingsPage.llmIntro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {t.settingsPage.llmActiveProviderLabel}
            </label>
            <select
              value={settings.activeProvider}
              onChange={(e) => {
                const next = e.target.value as LlmProviderId;
                setSettings({ ...settings, activeProvider: next });
                setExpandedProvider(next);
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-medium"
            >
              {LLM_PROVIDER_IDS.map((id) => (
                <option key={id} value={id}>
                  {providerLabel(id, lang)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">{t.settingsPage.llmActiveProviderHelp}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {t.settingsPage.llmEmbeddingProviderLabel}
            </label>
            <select
              value={settings.embeddingProvider}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  embeddingProvider: e.target.value as LlmEmbeddingProviderId,
                })
              }
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-medium"
            >
              {LLM_EMBEDDING_PROVIDER_IDS.map((id) => (
                <option key={id} value={id}>
                  {providerLabel(id, lang)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t.settingsPage.llmEmbeddingProviderHelp}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            {t.settingsPage.llmProviderConfigsTitle}
          </h3>
          <div className="space-y-3">
            {LLM_PROVIDER_IDS.map((provider) => {
              const isOpen = expandedProvider === provider;
              const isActive = settings.activeProvider === provider;
              const isEmbedding = settings.embeddingProvider === provider;
              return (
                <div
                  key={provider}
                  className={cn(
                    'rounded-2xl border overflow-hidden',
                    isActive || isEmbedding ? 'border-violet-200' : 'border-slate-100',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedProvider(isOpen ? settings.activeProvider : provider)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{providerLabel(provider, lang)}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {isActive && isEmbedding
                          ? t.settingsPage.llmBadgeTextAndEmbedding
                          : isActive
                            ? t.settingsPage.llmBadgeText
                            : isEmbedding
                              ? t.settingsPage.llmBadgeEmbedding
                              : t.settingsPage.llmBadgeInactive}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && <div className="px-5 py-5 border-t border-slate-100">{renderProviderFields(provider)}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-violet-100 bg-violet-50/30 p-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              {t.settingsPage.llmTaskGeneralPromptTitle}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {t.settingsPage.llmTaskGeneralPromptHelp}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {t.settingsPage.llmTaskGeneralPromptEnLabel}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      taskGeneralAutofillPrompt: {
                        ...settings.taskGeneralAutofillPrompt,
                        en: DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_EN,
                      },
                    })
                  }
                  className="text-[10px] font-bold uppercase tracking-widest text-violet-700 hover:text-violet-900"
                >
                  {t.settingsPage.llmTaskGeneralPromptResetEn}
                </button>
              </div>
              <textarea
                rows={14}
                value={settings.taskGeneralAutofillPrompt.en}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    taskGeneralAutofillPrompt: {
                      ...settings.taskGeneralAutofillPrompt,
                      en: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-xs font-mono leading-relaxed resize-y min-h-[200px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {t.settingsPage.llmTaskGeneralPromptTrLabel}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      taskGeneralAutofillPrompt: {
                        ...settings.taskGeneralAutofillPrompt,
                        tr: DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_TR,
                      },
                    })
                  }
                  className="text-[10px] font-bold uppercase tracking-widest text-violet-700 hover:text-violet-900"
                >
                  {t.settingsPage.llmTaskGeneralPromptResetTr}
                </button>
              </div>
              <textarea
                rows={14}
                value={settings.taskGeneralAutofillPrompt.tr}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    taskGeneralAutofillPrompt: {
                      ...settings.taskGeneralAutofillPrompt,
                      tr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 text-xs font-mono leading-relaxed resize-y min-h-[200px]"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
            {t.settingsPage.llmTaskGeneralPromptPlaceholders}
          </p>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">{t.settingsPage.llmReindexNote}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{t.settingsPage.llmBrowserNote}</p>
      </div>
    </motion.div>
  );
}
