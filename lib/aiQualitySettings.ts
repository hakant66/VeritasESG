/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VeritasESG AI Quality & Continuous Improvement (Hermit integration).
 * This is the admin-managed on/off gate for the whole subsystem: when
 * disabled (the default), no evaluation runs can be started, no adapter
 * may be deployed, and prompt construction never consults a deployed
 * adapter. See docs/hermit/architecture-review.md for the full design.
 */

export interface AiQualitySettings {
  /** Master switch. Off by default — platform_admin must opt in. */
  enabled: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export const AI_QUALITY_SETTINGS_KEY = 'aiQuality';

export const DEFAULT_AI_QUALITY_SETTINGS: AiQualitySettings = {
  enabled: false,
};

export function normalizeAiQualitySettings(raw: Record<string, unknown>): AiQualitySettings {
  return {
    enabled: Boolean(raw.enabled),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}
