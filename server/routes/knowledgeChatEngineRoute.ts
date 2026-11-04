/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin API for the Knowledge Chat engine toggle (default stateless engine
 * vs the LangGraph engine — see server/lib/rag/knowledgeChatGraph.ts).
 * Mirrors customerAutofillEngineRoute.ts.
 */

import type { Express, Request, Response } from 'express';
import {
  normalizeKnowledgeChatEngineSettings,
  type KnowledgeChatEngineSettings,
} from '../../lib/knowledgeChatEngineSettings.ts';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  invalidateKnowledgeChatEngineSettingsCache,
  loadKnowledgeChatEngineSettings,
  saveKnowledgeChatEngineSettings,
} from '../lib/rag/knowledgeChatEngineConfig.ts';

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

export function registerKnowledgeChatEngineRoutes(app: Express, options: { jwtSecret: string }) {
  app.get('/api/admin/knowledge-chat-engine/settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const settings = await loadKnowledgeChatEngineSettings(true);
      return sendSuccess(res, { settings });
    } catch (err: unknown) {
      console.error('[KNOWLEDGE-CHAT-ENGINE] GET settings failed:', err);
      return sendError(res, 500, 'Failed to load settings', 'knowledge-chat-engine/load-failed');
    }
  });

  app.put('/api/admin/knowledge-chat-engine/settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const incoming = normalizeKnowledgeChatEngineSettings(req.body || {});
      const toSave: KnowledgeChatEngineSettings = {
        ...incoming,
        updatedAt: Date.now(),
        updatedBy: typeof user.id === 'string' ? user.id : String(user._id),
      };

      await saveKnowledgeChatEngineSettings(toSave);
      invalidateKnowledgeChatEngineSettingsCache();

      return sendSuccess(res, { settings: toSave });
    } catch (err: unknown) {
      console.error('[KNOWLEDGE-CHAT-ENGINE] PUT settings failed:', err);
      return sendError(res, 500, 'Failed to save settings', 'knowledge-chat-engine/save-failed');
    }
  });
}
