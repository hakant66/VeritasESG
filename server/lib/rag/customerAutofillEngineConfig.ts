/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CUSTOMER_AUTOFILL_ENGINE_SETTINGS_KEY,
  DEFAULT_CUSTOMER_AUTOFILL_ENGINE_SETTINGS,
  normalizeCustomerAutofillEngineSettings,
  type CustomerAutofillEngineSettings,
} from '../../../lib/customerAutofillEngineSettings.ts';
import { findAppSettingByKey, upsertAppSetting } from '../../data/appSettingDataAccess.ts';

let cachedSettings: CustomerAutofillEngineSettings | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5_000;

export function invalidateCustomerAutofillEngineSettingsCache() {
  cachedSettings = null;
  cacheLoadedAt = 0;
}

export async function loadCustomerAutofillEngineSettings(
  force = false,
): Promise<CustomerAutofillEngineSettings> {
  const now = Date.now();
  if (!force && cachedSettings && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const raw = (await findAppSettingByKey(CUSTOMER_AUTOFILL_ENGINE_SETTINGS_KEY)) || {};
  const settings = Object.keys(raw).length > 0
    ? normalizeCustomerAutofillEngineSettings(raw)
    : DEFAULT_CUSTOMER_AUTOFILL_ENGINE_SETTINGS;

  cachedSettings = settings;
  cacheLoadedAt = now;
  return settings;
}

export async function saveCustomerAutofillEngineSettings(
  settings: CustomerAutofillEngineSettings,
): Promise<CustomerAutofillEngineSettings> {
  await upsertAppSetting(CUSTOMER_AUTOFILL_ENGINE_SETTINGS_KEY, settings as unknown as Record<string, unknown>);
  cachedSettings = settings;
  cacheLoadedAt = Date.now();
  return settings;
}

/**
 * The one check kbRagRoute.ts uses to pick an engine. CUSTOMER_AUTOFILL_ENGINE=graph
 * env var remains a hard override for ops/debugging; absent that, the
 * platform_admin-managed DB setting decides.
 */
export async function isGraphAutofillEngineEnabled(): Promise<boolean> {
  if (process.env.CUSTOMER_AUTOFILL_ENGINE === 'graph') return true;
  if (process.env.CUSTOMER_AUTOFILL_ENGINE === 'default') return false;
  const settings = await loadCustomerAutofillEngineSettings();
  return settings.useGraphEngine === true;
}
