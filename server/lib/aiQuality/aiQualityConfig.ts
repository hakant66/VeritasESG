/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AI_QUALITY_SETTINGS_KEY,
  DEFAULT_AI_QUALITY_SETTINGS,
  normalizeAiQualitySettings,
  type AiQualitySettings,
} from '../../../lib/aiQualitySettings.ts';
import { findAppSettingByKey, upsertAppSetting } from '../../data/appSettingDataAccess.ts';

let cachedSettings: AiQualitySettings | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5_000;

export function invalidateAiQualitySettingsCache() {
  cachedSettings = null;
  cacheLoadedAt = 0;
}

export async function loadAiQualitySettings(force = false): Promise<AiQualitySettings> {
  const now = Date.now();
  if (!force && cachedSettings && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const raw = (await findAppSettingByKey(AI_QUALITY_SETTINGS_KEY)) || {};
  const settings = Object.keys(raw).length > 0
    ? normalizeAiQualitySettings(raw)
    : DEFAULT_AI_QUALITY_SETTINGS;

  cachedSettings = settings;
  cacheLoadedAt = now;
  return settings;
}

export async function saveAiQualitySettings(settings: AiQualitySettings): Promise<AiQualitySettings> {
  await upsertAppSetting(AI_QUALITY_SETTINGS_KEY, settings as unknown as Record<string, unknown>);
  cachedSettings = settings;
  cacheLoadedAt = Date.now();
  return settings;
}

/** The one check every AI Quality / Hermit code path (routes, prompt injection, worker calls) must pass first. */
export async function isAiQualityEnabled(): Promise<boolean> {
  const settings = await loadAiQualitySettings();
  return settings.enabled === true;
}
