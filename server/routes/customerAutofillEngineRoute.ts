/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin API for the customer-profile-autofill engine toggle (default
 * single-shot engine vs the LangGraph engine — see
 * server/lib/rag/customerAutofillGraph.ts). Mirrors aiQualityRoute.ts.
 */

import type { Express, Request, Response } from 'express';
import {
  normalizeCustomerAutofillEngineSettings,
  type CustomerAutofillEngineSettings,
} from '../../lib/customerAutofillEngineSettings.ts';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  invalidateCustomerAutofillEngineSettingsCache,
  loadCustomerAutofillEngineSettings,
  saveCustomerAutofillEngineSettings,
} from '../lib/rag/customerAutofillEngineConfig.ts';

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

export function registerCustomerAutofillEngineRoutes(app: Express, options: { jwtSecret: string }) {
  app.get('/api/admin/customer-autofill-engine/settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const settings = await loadCustomerAutofillEngineSettings(true);
      return sendSuccess(res, { settings });
    } catch (err: unknown) {
      console.error('[CUSTOMER-AUTOFILL-ENGINE] GET settings failed:', err);
      return sendError(res, 500, 'Failed to load settings', 'customer-autofill-engine/load-failed');
    }
  });

  app.put('/api/admin/customer-autofill-engine/settings', async (req, res) => {
    try {
      const user = await requirePlatformAdmin(req, res, options.jwtSecret);
      if (!user) return;

      const incoming = normalizeCustomerAutofillEngineSettings(req.body || {});
      const toSave: CustomerAutofillEngineSettings = {
        ...incoming,
        updatedAt: Date.now(),
        updatedBy: typeof user.id === 'string' ? user.id : String(user._id),
      };

      await saveCustomerAutofillEngineSettings(toSave);
      invalidateCustomerAutofillEngineSettingsCache();

      return sendSuccess(res, { settings: toSave });
    } catch (err: unknown) {
      console.error('[CUSTOMER-AUTOFILL-ENGINE] PUT settings failed:', err);
      return sendError(res, 500, 'Failed to save settings', 'customer-autofill-engine/save-failed');
    }
  });
}
