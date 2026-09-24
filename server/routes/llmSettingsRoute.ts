/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, Request, Response } from 'express';
import {
  mergeLlmSettingsForSave,
  maskLlmSettingsForClient,
  normalizeLlmSettings,
  type LlmSettings,
} from '../../lib/llmSettings.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import {
  getDefaultLlmSettings,
  invalidateLlmSettingsCache,
  loadLlmSettings,
  saveLlmSettings,
} from '../lib/llm/llmConfig.ts';
import { getLlmProviderSummary } from '../lib/llm/llmService.ts';
import { checkOllamaHealth } from '../lib/llm/ollamaHealth.ts';

function sendSuccess(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res: Response, status: number, error: string, code?: string) {
  return res.status(status).json({ success: false, error, code });
}

async function requirePlatformAdmin(req: Request, res: Response, jwtSecret: string) {
  const resolved = await resolvePlatformUserFromRequest(req, jwtSecret);
  if (!resolved.user) {
    sendError(res, 401, 'Unauthorized', 'auth/unauthorized');
    return null;
  }

  const role = normalizePlatformRole(resolved.user.role);
  if (role !== 'platform_admin') {
    sendError(res, 403, 'Platform Admin role required.', 'auth/forbidden');
    return null;
  }

  return resolved.user;
}

export function registerLlmSettingsRoutes(app: Express, options: { jwtSecret: string }) {
  app.get('/api/admin/llm-settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const settings = await loadLlmSettings(true);
      const summary = await getLlmProviderSummary();

      return sendSuccess(res, {
        settings: maskLlmSettingsForClient(settings),
        summary,
      });
    } catch (err: unknown) {
      console.error('[LLM-SETTINGS] GET failed:', err);
      return sendError(res, 500, 'Failed to load LLM settings', 'llm-settings/load-failed');
    }
  });

  app.put('/api/admin/llm-settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const existing = await loadLlmSettings(true);
      const incoming = normalizeLlmSettings(req.body || {});
      const merged = mergeLlmSettingsForSave(existing, incoming);
      const toSave: LlmSettings = {
        ...merged,
        updatedAt: Date.now(),
        updatedBy: typeof user.id === 'string' ? user.id : String(user._id),
      };

      await saveLlmSettings(toSave);
      invalidateLlmSettingsCache();

      const summary = await getLlmProviderSummary();
      return sendSuccess(res, {
        settings: maskLlmSettingsForClient(toSave),
        summary,
      });
    } catch (err: unknown) {
      console.error('[LLM-SETTINGS] PUT failed:', err);
      return sendError(res, 500, 'Failed to save LLM settings', 'llm-settings/save-failed');
    }
  });

  app.get('/api/admin/llm-settings/defaults', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const defaults = getDefaultLlmSettings();
      return sendSuccess(res, {
        settings: maskLlmSettingsForClient(defaults),
      });
    } catch (err: unknown) {
      console.error('[LLM-SETTINGS] defaults failed:', err);
      return sendError(res, 500, 'Failed to load LLM defaults', 'llm-settings/defaults-failed');
    }
  });

  app.post('/api/admin/llm-settings/ollama-health', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
      const settings = await loadLlmSettings(true);
      const baseUrl =
        typeof body.baseUrl === 'string' && body.baseUrl.trim()
          ? body.baseUrl.trim()
          : settings.ollama.baseUrl;

      const health = await checkOllamaHealth(baseUrl);
      return sendSuccess(res, health);
    } catch (err: unknown) {
      console.error('[LLM-SETTINGS] ollama-health failed:', err);
      return sendError(res, 500, 'Failed to check Ollama', 'llm-settings/ollama-health-failed');
    }
  });
}
