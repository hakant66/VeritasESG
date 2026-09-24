/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_LLM_SETTINGS,
  LLM_SETTINGS_KEY,
  applyEnvLlmProviderDefaults,
  mergeLlmSettingsFromEnv,
  normalizeLlmSettings,
  type LlmEmbeddingProviderId,
  type LlmProviderConfig,
  type LlmProviderId,
  type LlmSettings,
} from '../../../lib/llmSettings.ts';
import {
  findAppSettingByKey,
  upsertAppSetting,
} from '../../data/appSettingDataAccess.ts';

export interface LlmRuntimeConfig {
  textProvider: LlmProviderId;
  embeddingProvider: LlmEmbeddingProviderId;
  text: LlmProviderConfig;
  embedding: LlmProviderConfig;
  settings: LlmSettings;
}

let cachedSettings: LlmSettings | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5_000;

export function invalidateLlmSettingsCache() {
  cachedSettings = null;
  cacheLoadedAt = 0;
}

export async function loadLlmSettings(force = false): Promise<LlmSettings> {
  const now = Date.now();
  if (!force && cachedSettings && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const raw = (await findAppSettingByKey(LLM_SETTINGS_KEY)) || {};
  const fromDb = normalizeLlmSettings(raw);
  const hasPersistedSettings = typeof raw.updatedAt === 'number';
  const merged = hasPersistedSettings
    ? mergeLlmSettingsFromEnv(fromDb)
    : applyEnvLlmProviderDefaults(mergeLlmSettingsFromEnv(fromDb));

  cachedSettings = merged;
  cacheLoadedAt = now;
  return merged;
}

export async function saveLlmSettings(settings: LlmSettings): Promise<LlmSettings> {
  await upsertAppSetting(LLM_SETTINGS_KEY, settings as unknown as Record<string, unknown>);
  cachedSettings = settings;
  cacheLoadedAt = Date.now();
  return settings;
}

export async function resolveLlmRuntimeConfig(): Promise<LlmRuntimeConfig> {
  const settings = await loadLlmSettings();
  const textProvider = settings.activeProvider;
  const embeddingProvider = settings.embeddingProvider;

  return {
    textProvider,
    embeddingProvider,
    text: settings[textProvider],
    embedding: settings[embeddingProvider],
    settings,
  };
}

export function isTextProviderConfigured(
  provider: LlmProviderId,
  config: LlmProviderConfig,
): boolean {
  if (provider === 'ollama') {
    return Boolean(config.baseUrl.trim() && config.textModel.trim());
  }
  return Boolean(config.apiKey.trim() && config.textModel.trim());
}

export function isEmbeddingProviderConfigured(
  provider: LlmEmbeddingProviderId,
  config: LlmProviderConfig,
): boolean {
  if (provider === 'ollama') {
    return Boolean(config.baseUrl.trim() && config.embeddingModel.trim());
  }
  return Boolean(config.apiKey.trim() && config.embeddingModel.trim());
}

export async function isLlmTextConfigured(): Promise<boolean> {
  const runtime = await resolveLlmRuntimeConfig();
  return isTextProviderConfigured(runtime.textProvider, runtime.text);
}

export async function isLlmEmbeddingConfigured(): Promise<boolean> {
  const runtime = await resolveLlmRuntimeConfig();
  return isEmbeddingProviderConfigured(runtime.embeddingProvider, runtime.embedding);
}

export function getDefaultLlmSettings(): LlmSettings {
  return applyEnvLlmProviderDefaults(mergeLlmSettingsFromEnv(DEFAULT_LLM_SETTINGS));
}
