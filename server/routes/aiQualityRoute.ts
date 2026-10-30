/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VeritasESG AI Quality & Continuous Improvement (Hermit integration) admin API.
 * Phase 1 of this subsystem: the platform_admin-managed enable/disable gate.
 * Evaluation-run and adapter-management endpoints land in a later phase, once
 * the evaluation engine (hermit/ worker) exists — see docs/hermit/architecture-review.md.
 */

import type { Express, Request, Response } from 'express';
import { normalizeAiQualitySettings, type AiQualitySettings } from '../../lib/aiQualitySettings.ts';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  invalidateAiQualitySettingsCache,
  loadAiQualitySettings,
  saveAiQualitySettings,
} from '../lib/aiQuality/aiQualityConfig.ts';

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

export function registerAiQualityRoutes(app: Express, options: { jwtSecret: string }) {
  app.get('/api/admin/ai-quality/settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const settings = await loadAiQualitySettings(true);
      return sendSuccess(res, { settings });
    } catch (err: unknown) {
      console.error('[AI-QUALITY] GET settings failed:', err);
      return sendError(res, 500, 'Failed to load AI Quality settings', 'ai-quality/load-failed');
    }
  });

  app.put('/api/admin/ai-quality/settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const incoming = normalizeAiQualitySettings(req.body || {});
      const toSave: AiQualitySettings = {
        ...incoming,
        updatedAt: Date.now(),
        updatedBy: typeof user.id === 'string' ? user.id : String(user._id),
      };

      await saveAiQualitySettings(toSave);
      invalidateAiQualitySettingsCache();

      return sendSuccess(res, { settings: toSave });
    } catch (err: unknown) {
      console.error('[AI-QUALITY] PUT settings failed:', err);
      return sendError(res, 500, 'Failed to save AI Quality settings', 'ai-quality/save-failed');
    }
  });
}
