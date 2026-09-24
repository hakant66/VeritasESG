/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_EN,
  DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_TR,
} from './taskGeneralAutofillPrompt.ts';

export const LLM_PROVIDER_IDS = ['gemini', 'openai', 'claude', 'ollama'] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

/** Providers that can produce embedding vectors for RAG. */
export const LLM_EMBEDDING_PROVIDER_IDS = ['gemini', 'openai', 'ollama'] as const;
export type LlmEmbeddingProviderId = (typeof LLM_EMBEDDING_PROVIDER_IDS)[number];

export interface LlmProviderConfig {
  apiKey: string;
  baseUrl: string;
  textModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

export interface TaskGeneralAutofillPromptSettings {
  en: string;
  tr: string;
}

export interface LlmSettings {
  activeProvider: LlmProviderId;
  embeddingProvider: LlmEmbeddingProviderId;
  gemini: LlmProviderConfig;
  openai: LlmProviderConfig;
  claude: LlmProviderConfig;
  ollama: LlmProviderConfig;
  /** Görevlerim → Genel AI ile doldur prompt şablonları ({{placeholders}}). */
  taskGeneralAutofillPrompt: TaskGeneralAutofillPromptSettings;
  updatedAt?: number;
  updatedBy?: string;
}

export const LLM_SETTINGS_KEY = 'llm';

export const MASKED_SECRET_PLACEHOLDER = '••••••••••••';

export const LLM_PROVIDER_LABELS: Record<LlmProviderId, { en: string; tr: string }> = {
  gemini: { en: 'Google Gemini', tr: 'Google Gemini' },
  openai: { en: 'OpenAI', tr: 'OpenAI' },
  claude: { en: 'Anthropic Claude', tr: 'Anthropic Claude' },
  ollama: { en: 'Ollama (local)', tr: 'Ollama (yerel)' },
};

const defaultProviderConfig = (
  overrides: Partial<LlmProviderConfig> = {},
): LlmProviderConfig => ({
  apiKey: '',
  baseUrl: '',
  textModel: '',
  embeddingModel: '',
  embeddingDimensions: 768,
  ...overrides,
});

export function normalizeTaskGeneralAutofillPrompt(
  raw: unknown,
  fallback: TaskGeneralAutofillPromptSettings,
): TaskGeneralAutofillPromptSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    en: typeof input.en === 'string' ? input.en : fallback.en,
    tr: typeof input.tr === 'string' ? input.tr : fallback.tr,
  };
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  activeProvider: 'gemini',
  embeddingProvider: 'gemini',
  taskGeneralAutofillPrompt: {
    en: DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_EN,
    tr: DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_TR,
  },
  gemini: defaultProviderConfig({
    textModel: 'gemini-2.5-flash',
    embeddingModel: 'gemini-embedding-001',
    embeddingDimensions: 768,
  }),
  openai: defaultProviderConfig({
    textModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 768,
  }),
  claude: defaultProviderConfig({
    textModel: 'claude-sonnet-4-20250514',
    embeddingModel: '',
    embeddingDimensions: 768,
  }),
  ollama: defaultProviderConfig({
    baseUrl: 'http://127.0.0.1:11434',
    textModel: 'llama3.2',
    embeddingModel: 'nomic-embed-text',
    embeddingDimensions: 768,
  }),
};

export function isLlmProviderId(value: unknown): value is LlmProviderId {
  return typeof value === 'string' && (LLM_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isLlmEmbeddingProviderId(value: unknown): value is LlmEmbeddingProviderId {
  return (
    typeof value === 'string' && (LLM_EMBEDDING_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export function normalizeLlmProviderConfig(raw: unknown, fallback: LlmProviderConfig): LlmProviderConfig {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const dimsRaw = input.embeddingDimensions;
  const dims =
    typeof dimsRaw === 'number' && Number.isFinite(dimsRaw) && dimsRaw > 0
      ? Math.floor(dimsRaw)
      : fallback.embeddingDimensions;

  return {
    apiKey: typeof input.apiKey === 'string' ? input.apiKey.trim() : fallback.apiKey,
    baseUrl: typeof input.baseUrl === 'string' ? input.baseUrl.trim() : fallback.baseUrl,
    textModel:
      typeof input.textModel === 'string' && input.textModel.trim()
        ? input.textModel.trim()
        : fallback.textModel,
    embeddingModel:
      typeof input.embeddingModel === 'string' && input.embeddingModel.trim()
        ? input.embeddingModel.trim()
        : fallback.embeddingModel,
    embeddingDimensions: dims,
  };
}

export function normalizeLlmSettings(raw: unknown): LlmSettings {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const activeProvider = isLlmProviderId(input.activeProvider)
    ? input.activeProvider
    : DEFAULT_LLM_SETTINGS.activeProvider;
  const embeddingProvider = isLlmEmbeddingProviderId(input.embeddingProvider)
    ? input.embeddingProvider
    : DEFAULT_LLM_SETTINGS.embeddingProvider;

  return {
    activeProvider,
    embeddingProvider,
    taskGeneralAutofillPrompt: normalizeTaskGeneralAutofillPrompt(
      input.taskGeneralAutofillPrompt,
      DEFAULT_LLM_SETTINGS.taskGeneralAutofillPrompt,
    ),
    gemini: normalizeLlmProviderConfig(input.gemini, DEFAULT_LLM_SETTINGS.gemini),
    openai: normalizeLlmProviderConfig(input.openai, DEFAULT_LLM_SETTINGS.openai),
    claude: normalizeLlmProviderConfig(input.claude, DEFAULT_LLM_SETTINGS.claude),
    ollama: normalizeLlmProviderConfig(input.ollama, DEFAULT_LLM_SETTINGS.ollama),
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : undefined,
    updatedBy: typeof input.updatedBy === 'string' ? input.updatedBy : undefined,
  };
}

export function mergeLlmSettingsFromEnv(settings: LlmSettings): LlmSettings {
  const merged = normalizeLlmSettings(settings);

  if (!merged.gemini.apiKey && process.env.GEMINI_API_KEY?.trim()) {
    merged.gemini.apiKey = process.env.GEMINI_API_KEY.trim();
  }
  if (!merged.openai.apiKey && process.env.OPENAI_API_KEY?.trim()) {
    merged.openai.apiKey = process.env.OPENAI_API_KEY.trim();
  }
  if (!merged.claude.apiKey && process.env.ANTHROPIC_API_KEY?.trim()) {
    merged.claude.apiKey = process.env.ANTHROPIC_API_KEY.trim();
  }
  if (!merged.gemini.textModel && process.env.GEMINI_MODEL?.trim()) {
    merged.gemini.textModel = process.env.GEMINI_MODEL.trim();
  }
  if (!merged.openai.textModel && process.env.OPENAI_MODEL?.trim()) {
    merged.openai.textModel = process.env.OPENAI_MODEL.trim();
  }
  if (!merged.gemini.embeddingModel && process.env.KB_EMBEDDING_MODEL?.trim()) {
    merged.gemini.embeddingModel = process.env.KB_EMBEDDING_MODEL.trim();
  }
  const envDims = process.env.KB_EMBEDDING_DIMENSIONS?.trim();
  if (envDims) {
    const n = Number(envDims);
    if (Number.isFinite(n) && n > 0) {
      merged.gemini.embeddingDimensions = Math.floor(n);
      merged.openai.embeddingDimensions = Math.floor(n);
      merged.ollama.embeddingDimensions = Math.floor(n);
    }
  }

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim();
  if (ollamaBaseUrl) {
    merged.ollama.baseUrl = ollamaBaseUrl;
  }
  if (process.env.OLLAMA_TEXT_MODEL?.trim()) {
    merged.ollama.textModel = process.env.OLLAMA_TEXT_MODEL.trim();
  }
  if (process.env.OLLAMA_EMBEDDING_MODEL?.trim()) {
    merged.ollama.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL.trim();
  }
  const ollamaDims = process.env.OLLAMA_EMBEDDING_DIMENSIONS?.trim();
  if (ollamaDims) {
    const n = Number(ollamaDims);
    if (Number.isFinite(n) && n > 0) {
      merged.ollama.embeddingDimensions = Math.floor(n);
    }
  }

  return merged;
}

/** Apply env provider defaults for first-time / empty DB bootstrap only. */
export function applyEnvLlmProviderDefaults(settings: LlmSettings): LlmSettings {
  const merged = normalizeLlmSettings(settings);
  const envProvider = process.env.AI_PROVIDER?.trim();
  if (envProvider && isLlmProviderId(envProvider)) {
    merged.activeProvider = envProvider;
  }
  const embeddingProviderEnv = process.env.EMBEDDING_PROVIDER?.trim();
  if (embeddingProviderEnv && isLlmEmbeddingProviderId(embeddingProviderEnv)) {
    merged.embeddingProvider = embeddingProviderEnv;
  }
  return merged;
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4) return MASKED_SECRET_PLACEHOLDER;
  return `${MASKED_SECRET_PLACEHOLDER}${trimmed.slice(-4)}`;
}

export function isMaskedApiKeyValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed.startsWith(MASKED_SECRET_PLACEHOLDER) || /^[*•]+$/.test(trimmed);
}

export function maskLlmSettingsForClient(settings: LlmSettings): LlmSettings {
  const maskProvider = (config: LlmProviderConfig): LlmProviderConfig => ({
    ...config,
    apiKey: config.apiKey ? maskApiKey(config.apiKey) : '',
  });

  return {
    ...settings,
    gemini: maskProvider(settings.gemini),
    openai: maskProvider(settings.openai),
    claude: maskProvider(settings.claude),
    ollama: maskProvider(settings.ollama),
  };
}

export function mergeLlmSettingsForSave(
  existing: LlmSettings,
  incoming: LlmSettings,
): LlmSettings {
  const mergeProvider = (
    prev: LlmProviderConfig,
    next: LlmProviderConfig,
  ): LlmProviderConfig => ({
    ...next,
    apiKey: isMaskedApiKeyValue(next.apiKey) ? prev.apiKey : next.apiKey.trim(),
  });

  return {
    ...incoming,
    gemini: mergeProvider(existing.gemini, incoming.gemini),
    openai: mergeProvider(existing.openai, incoming.openai),
    claude: mergeProvider(existing.claude, incoming.claude),
    ollama: mergeProvider(existing.ollama, incoming.ollama),
  };
}

export function getProviderConfig(
  settings: LlmSettings,
  provider: LlmProviderId,
): LlmProviderConfig {
  return settings[provider];
}
