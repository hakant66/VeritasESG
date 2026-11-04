/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_KNOWLEDGE_CHAT_ENGINE_SETTINGS,
  KNOWLEDGE_CHAT_ENGINE_SETTINGS_KEY,
  normalizeKnowledgeChatEngineSettings,
  type KnowledgeChatEngineSettings,
} from '../../../lib/knowledgeChatEngineSettings.ts';
import { findAppSettingByKey, upsertAppSetting } from '../../data/appSettingDataAccess.ts';

let cachedSettings: KnowledgeChatEngineSettings | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5_000;

export function invalidateKnowledgeChatEngineSettingsCache() {
  cachedSettings = null;
  cacheLoadedAt = 0;
}

export async function loadKnowledgeChatEngineSettings(
  force = false,
): Promise<KnowledgeChatEngineSettings> {
  const now = Date.now();
  if (!force && cachedSettings && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const raw = (await findAppSettingByKey(KNOWLEDGE_CHAT_ENGINE_SETTINGS_KEY)) || {};
  const settings = Object.keys(raw).length > 0
    ? normalizeKnowledgeChatEngineSettings(raw)
    : DEFAULT_KNOWLEDGE_CHAT_ENGINE_SETTINGS;

  cachedSettings = settings;
  cacheLoadedAt = now;
  return settings;
}

export async function saveKnowledgeChatEngineSettings(
  settings: KnowledgeChatEngineSettings,
): Promise<KnowledgeChatEngineSettings> {
  await upsertAppSetting(KNOWLEDGE_CHAT_ENGINE_SETTINGS_KEY, settings as unknown as Record<string, unknown>);
  cachedSettings = settings;
  cacheLoadedAt = Date.now();
  return settings;
}

/**
 * The one check kbRagRoute.ts uses to pick an engine. KNOWLEDGE_CHAT_ENGINE=graph
 * env var remains a hard override for ops/debugging; absent that, the
 * platform_admin-managed DB setting decides.
 */
export async function isGraphChatEngineEnabled(): Promise<boolean> {
  if (process.env.KNOWLEDGE_CHAT_ENGINE === 'graph') return true;
  if (process.env.KNOWLEDGE_CHAT_ENGINE === 'default') return false;
  const settings = await loadKnowledgeChatEngineSettings();
  return settings.useGraphEngine === true;
}
