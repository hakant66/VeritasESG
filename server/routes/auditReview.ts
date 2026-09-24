/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, Request } from 'express';
import jwt from 'jsonwebtoken';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  findProjectByParam,
  findProjectUserAssignment,
} from '../data/workflowDataAccess.ts';
import { documentPublicId } from '../lib/questionIds.ts';
import {
  submitAuditReviewDecision,
  type AuditReviewDecision,
} from '../lib/auditReviewService.ts';

function publicId(doc: { _id?: unknown; legacyFirebaseId?: string; id?: string }) {
  return documentPublicId(doc) || String(doc.id || doc._id || '');
}

function getJwtUidFromRequest(req: Request, jwtSecret: string): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), jwtSecret) as {
      uid?: string;
      sub?: string;
    };
    return decoded.uid || decoded.sub || undefined;
  } catch {
    return undefined;
  }
}

async function canSubmitAuditReview(
  actor: { role?: string; legacyFirebaseId?: string; _id?: unknown; id?: string },
  projectPublicId: string,
  jwtUid?: string,
): Promise<boolean> {
  const platformRole = String(actor.role || '');
  if (platformRole === 'auditor' || platformRole === 'platform_admin') return true;
  const actorUserId = publicId(actor);
  const ids = [...new Set([actorUserId, jwtUid].filter((id): id is string => !!id))];
  const assignment = await findProjectUserAssignment(projectPublicId, ids);
  if (!assignment) return false;
  return assignment.role === 'auditor' || assignment.role === 'admin';
}

function parseDecision(value: unknown): AuditReviewDecision | null {
  if (value === 'accept' || value === 'reject' || value === 'explanation') {
    return value;
  }
  return null;
}

export function registerAuditReviewRoutes(
  app: Express,
  options: { jwtSecret: string },
) {
  app.post(
    '/api/projects/:projectId/answers/:answerId/audit-review',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        const actor = auth.user;
        if (!actor) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId: projectParam, answerId } = req.params;
        const decision = parseDecision(req.body?.decision);
        if (!decision) {
          return res.status(400).json({
            success: false,
            error: 'Geçersiz denetim kararı',
          });
        }

        const project = await findProjectByParam(projectParam);
        if (!project) {
          return res.status(404).json({ success: false, error: 'Proje bulunamadı' });
        }

        const projectPublicId = publicId(project) || projectParam;
        const jwtUid = getJwtUidFromRequest(req, options.jwtSecret);
        const allowed = await canSubmitAuditReview(actor, projectPublicId, jwtUid);
        if (!allowed) {
          return res.status(403).json({
            success: false,
            error: 'Bu projede denetim kararı verme yetkiniz yok',
          });
        }

        const note =
          typeof req.body?.note === 'string' ? req.body.note.trim() : undefined;
        const logText =
          typeof req.body?.logText === 'string' ? req.body.logText.trim() : '';
        const questionLabel =
          typeof req.body?.questionLabel === 'string'
            ? req.body.questionLabel.trim()
            : undefined;
        const clientOrigin =
          typeof req.body?.clientOrigin === 'string' ? req.body.clientOrigin : undefined;

        if (!logText) {
          return res.status(400).json({
            success: false,
            error: 'Denetim günlük metni gerekli',
          });
        }

        const result = await submitAuditReviewDecision(
          projectPublicId,
          answerId,
          actor as { _id?: unknown; legacyFirebaseId?: string; name?: string; email?: string },
          {
            decision,
            note,
            logText,
            questionLabel,
            clientOrigin,
          },
        );

        return res.json({ success: true, ...result });
      } catch (error: unknown) {
        console.error('[AUDIT REVIEW]', error);
        return res.status(400).json({
          success: false,
          error:
            error instanceof Error ? error.message : 'Denetim kararı kaydedilemedi',
        });
      }
    },
  );
}
