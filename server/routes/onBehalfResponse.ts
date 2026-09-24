/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { getS3Config, isS3UploadConfigured, putObjectBuffer } from '../lib/s3Storage.ts';
import { findQuestionForProject, questionKodLabel } from '../lib/findProjectQuestion.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import { documentPublicId } from '../lib/questionIds.ts';
import {
  createAssignment,
  createAuditLog,
  createContact,
  createPlatformUser,
  createProjectUserAssignment,
  findAnswerByLookup,
  findAssignmentByRecipientAndQuestion,
  findContactByCustomerAndEmail,
  findCustomerByParam,
  findPlatformUserByEmail,
  findProjectByParam,
  findProjectUserAssignment,
  patchPlatformUser,
  updateContactName,
  upsertAnswerByLegacyId,
} from '../data/workflowDataAccess.ts';

const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_BYTES },
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getJwtUidFromRequest(req: Request, jwtSecret: string): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), jwtSecret) as {
      uid?: string;
    };
    return decoded?.uid;
  } catch {
    return undefined;
  }
}

function publicId(doc: { legacyFirebaseId?: string; _id?: unknown; id?: string } | null) {
  if (!doc) return '';
  return documentPublicId(doc as { legacyFirebaseId?: string; _id?: unknown }) || String(doc.id || doc._id || '');
}

function sendSuccess(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res: Response, status: number, error: string, code = 'api/error') {
  return res.status(status).json({ success: false, error, code });
}

async function findActorProjectAssignment(
  actor: { legacyFirebaseId?: string; id?: string; _id?: unknown },
  projectPublicId: string,
  jwtUid?: string,
) {
  const actorUserId = publicId(actor);
  const ids = [...new Set([actorUserId, jwtUid].filter((id): id is string => !!id))];
  if (ids.length === 0) return null;
  return findProjectUserAssignment(projectPublicId, ids);
}

async function canSubmitOnBehalf(
  actor: { role?: string; legacyFirebaseId?: string; id?: string; _id?: unknown },
  projectPublicId: string,
  jwtUid?: string,
): Promise<boolean> {
  const role = actor.role || '';
  if (role === 'platform_admin' || role === 'consultant_manager') {
    return true;
  }
  if (role === 'auditor') {
    return false;
  }

  const assignment = await findActorProjectAssignment(actor, projectPublicId, jwtUid);
  if (!assignment) return false;
  return assignment.role === 'admin' || assignment.role === 'editor';
}

async function canSubmitAuditorResponse(
  actor: { role?: string; legacyFirebaseId?: string; id?: string; _id?: unknown },
  projectPublicId: string,
  jwtUid?: string,
): Promise<boolean> {
  const assignment = await findActorProjectAssignment(actor, projectPublicId, jwtUid);
  return assignment?.role === 'auditor';
}

async function storeEvidenceFile(
  projectId: string,
  file: Express.Multer.File,
): Promise<{ url: string; name: string }> {
  const name = file.originalname || 'evidence';
  if (!ALLOWED_EVIDENCE_TYPES.has(file.mimetype)) {
    throw new Error('Unsupported file type');
  }

  if (!isS3UploadConfigured()) {
    const maxInline = 350 * 1024;
    if (file.size > maxInline) {
      throw new Error('File too large without object storage configured');
    }
    return {
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      name,
    };
  }

  const s3Config = getS3Config()!;
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = `evidence/${projectId}/${Date.now()}-${safeName}`;
  const url = await putObjectBuffer({
    config: s3Config,
    objectKey,
    body: file.buffer,
    contentType: file.mimetype,
  });
  return { url, name };
}

export function registerOnBehalfResponseRoutes(
  app: Express,
  options: { jwtSecret: string },
) {
  app.post(
    '/api/projects/:projectId/questions/:questionId/on-behalf-response',
    (req: Request, res: Response, next: NextFunction) => {
      evidenceUpload.single('file')(req, res, (err: unknown) => {
        if (err) {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : 'Upload failed';
          return sendError(res, 400, message, 'on-behalf/upload');
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        const actor = auth.user;
        if (!actor) {
          const message =
            auth.reason === 'missing-token'
              ? 'Oturum bulunamadı. Lütfen tekrar giriş yapın.'
              : auth.reason === 'invalid-token'
                ? 'Oturum süresi doldu. Lütfen tekrar giriş yapın.'
                : 'Oturum doğrulanamadı. Lütfen tekrar giriş yapın.';
          return sendError(res, 401, message, 'auth/unauthorized');
        }

        const { projectId: projectParam, questionId } = req.params;
        const customerName = String(req.body?.customerName || '').trim();
        const customerEmail = normalizeEmail(String(req.body?.customerEmail || ''));
        const answerText = String(req.body?.answerText || '').trim();

        if (!customerName || !customerEmail || !answerText) {
          return sendError(
            res,
            400,
            'Name, email, and answer are required',
            'on-behalf/validation',
          );
        }

        const project = await findProjectByParam(projectParam);
        if (!project) {
          return sendError(res, 404, 'Project not found', 'on-behalf/project-not-found');
        }

        const projectPublicId = publicId(project) || projectParam;
        const jwtUid = getJwtUidFromRequest(req, options.jwtSecret);

        const allowed = await canSubmitOnBehalf(actor, projectPublicId, jwtUid);
        if (!allowed) {
          return sendError(
            res,
            403,
            'Not allowed to submit on behalf of customer',
            'on-behalf/forbidden',
          );
        }

        const rawCustomerId = project.customerId as string;
        if (!rawCustomerId) {
          return sendError(res, 400, 'Project has no customer', 'on-behalf/no-customer');
        }

        const customer = await findCustomerByParam(rawCustomerId);
        const customerPublicId = publicId(customer) || rawCustomerId;

        let contact = await findContactByCustomerAndEmail(
          [customerPublicId, rawCustomerId],
          customerEmail,
        );

        if (!contact) {
          contact = await createContact({
            customerId: customerPublicId,
            name: customerName,
            email: customerEmail,
            role: 'Customer',
            department: 'Customer',
          });
        } else if (contact.name !== customerName) {
          await updateContactName(String(contact.id || contact._id), customerName);
          contact = { ...contact, name: customerName };
        }

        const contactPublicId = publicId(contact);

        let platformUser = await findPlatformUserByEmail(customerEmail);
        if (!platformUser) {
          platformUser = await createPlatformUser({
            name: customerName,
            email: customerEmail,
            role: 'customer',
            department: 'Customer',
            isConfirmed: false,
            contactId: contactPublicId,
            language: 'tr',
          });
        } else {
          const updates: Record<string, string> = {};
          if (platformUser.name !== customerName) updates.name = customerName;
          if (!platformUser.contactId) updates.contactId = contactPublicId;
          if (Object.keys(updates).length > 0) {
            await patchPlatformUser(String(platformUser.id || platformUser._id), updates);
          }
        }

        const customerUserId = publicId(platformUser);

        const existingPu = await findProjectUserAssignment(projectPublicId, [customerUserId]);
        if (!existingPu) {
          await createProjectUserAssignment({
            projectId: projectPublicId,
            userId: customerUserId,
            role: 'contributor',
            assignedAt: new Date(),
          });
        }

        let assignment = await findAssignmentByRecipientAndQuestion(
          projectPublicId,
          customerUserId,
          questionId,
        );

        if (!assignment) {
          assignment = await createAssignment({
            projectId: projectPublicId,
            recipientId: customerUserId,
            recipientType: 'user',
            questionIds: [questionId],
            status: 'completed',
            sentAt: new Date(),
            completedAt: new Date(),
            assignedBy: publicId(actor),
            assignedByName: actor.name || 'Admin',
            message: '',
          });
        }

        const assignmentPublicId = publicId(assignment);

        let latestFileUrl: string | undefined;
        let evidenceName: string | undefined;
        if (req.file) {
          const stored = await storeEvidenceFile(projectPublicId, req.file);
          latestFileUrl = stored.url;
          evidenceName = stored.name;
        }

        const ansLegacyId = `${customerUserId}_${questionId}`;
        const now = new Date();
        const actorId = publicId(actor);
        const actorName = actor.name || 'Admin';
        const workflowLogEntry = {
          id: `wsl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          fromStatus: 'not_sent',
          toStatus: 'customer_responded',
          text: `${actorName} → customer_responded (on behalf)`,
          authorId: actorId,
          authorName: actorName,
          createdAt: now.getTime(),
        };

        const answer = await upsertAnswerByLegacyId(ansLegacyId, {
          legacyFirebaseId: ansLegacyId,
          projectId: projectPublicId,
          assignmentId: assignmentPublicId,
          questionId,
          contactId: customerUserId,
          latestAnswer: answerText,
          latestFileUrl,
          evidenceName,
          submittedAt: now,
          updatedAt: now,
          submittedByUserId: actorId,
          onBehalfOfUserId: customerUserId,
          workflowStatus: 'customer_responded',
          workflowStatusLog: [workflowLogEntry],
        });

        const questionFound = await findQuestionForProject(projectParam, questionId);
        const questionLabel = questionKodLabel(
          (questionFound?.doc as { kod?: string } | null) ?? null,
          questionId,
        );
        const answerRecordId = publicId(answer) || ansLegacyId;

        await createAuditLog({
          userId: actorId,
          userName: actorName,
          userEmail: (actor.email || 'N/A').toLowerCase(),
          action: 'create',
          collection: 'answers',
          recordId: answerRecordId,
          projectId: projectPublicId,
          details: `Submitted form response on behalf of ${customerName} (${customerEmail}) for question ${questionLabel}`,
          timestamp: now,
        });

        return sendSuccess(res, {
          answerId: publicId(answer) || ansLegacyId,
          customerUserId,
          contactId: contactPublicId,
          assignmentId: assignmentPublicId,
          submittedByUserId: actorId,
          onBehalfOfUserId: customerUserId,
        });
      } catch (err: unknown) {
        console.error('[ON-BEHALF RESPONSE]', err);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Failed to save response';
        if (message.includes('E11000')) {
          return sendError(
            res,
            409,
            'A user with this email already exists. Try a different email or contact support.',
            'on-behalf/duplicate',
          );
        }
        return sendError(res, 500, message, 'on-behalf/failed');
      }
    },
  );

  app.post(
    '/api/projects/:projectId/questions/:questionId/auditor-response',
    (req: Request, res: Response, next: NextFunction) => {
      evidenceUpload.single('file')(req, res, (err: unknown) => {
        if (err) {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : 'Upload failed';
          return sendError(res, 400, message, 'auditor-response/upload');
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        const actor = auth.user;
        if (!actor) {
          const message =
            auth.reason === 'missing-token'
              ? 'Oturum bulunamadı. Lütfen tekrar giriş yapın.'
              : auth.reason === 'invalid-token'
                ? 'Oturum süresi doldu. Lütfen tekrar giriş yapın.'
                : 'Oturum doğrulanamadı. Lütfen tekrar giriş yapın.';
          return sendError(res, 401, message, 'auth/unauthorized');
        }

        const { projectId: projectParam, questionId } = req.params;
        const answerText = String(req.body?.answerText || '').trim();

        if (!answerText) {
          return sendError(
            res,
            400,
            'Answer text is required',
            'auditor-response/validation',
          );
        }

        const project = await findProjectByParam(projectParam);
        if (!project) {
          return sendError(res, 404, 'Project not found', 'auditor-response/project-not-found');
        }

        const projectPublicId = publicId(project) || projectParam;
        const jwtUid = getJwtUidFromRequest(req, options.jwtSecret);

        const allowed = await canSubmitAuditorResponse(actor, projectPublicId, jwtUid);
        if (!allowed) {
          return sendError(
            res,
            403,
            'Not allowed to submit audit response for this project',
            'auditor-response/forbidden',
          );
        }

        const actorId = publicId(actor) || jwtUid || '';
        if (!actorId) {
          return sendError(res, 400, 'Invalid user identity', 'auditor-response/actor');
        }

        let assignment = await findAssignmentByRecipientAndQuestion(
          projectPublicId,
          actorId,
          questionId,
        );

        if (!assignment) {
          assignment = await createAssignment({
            projectId: projectPublicId,
            recipientId: actorId,
            recipientType: 'user',
            questionIds: [questionId],
            status: 'completed',
            sentAt: new Date(),
            completedAt: new Date(),
            assignedBy: actorId,
            assignedByName: actor.name || 'Auditor',
            message: '',
          });
        }

        const assignmentPublicId = publicId(assignment);

        let latestFileUrl: string | undefined;
        let evidenceName: string | undefined;
        if (req.file) {
          const stored = await storeEvidenceFile(projectPublicId, req.file);
          latestFileUrl = stored.url;
          evidenceName = stored.name;
        }

        const ansLegacyId = `${actorId}_${questionId}`;
        const now = new Date();
        const actorName = actor.name || 'Auditor';
        const existing = await findAnswerByLookup(ansLegacyId);
        const priorLog = Array.isArray(existing?.workflowStatusLog)
          ? (existing.workflowStatusLog as unknown[])
          : [];
        const workflowLogEntry = {
          id: `wsl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          fromStatus: existing ? String(existing.workflowStatus || 'not_sent') : 'not_sent',
          toStatus: 'customer_responded',
          text: `${actorName} → customer_responded (audit)`,
          authorId: actorId,
          authorName: actorName,
          createdAt: now.getTime(),
        };

        const answer = await upsertAnswerByLegacyId(
          ansLegacyId,
          {
            legacyFirebaseId: ansLegacyId,
            projectId: projectPublicId,
            assignmentId: assignmentPublicId,
            questionId,
            contactId: actorId,
            latestAnswer: answerText,
            latestFileUrl,
            evidenceName,
            submittedAt: now,
            updatedAt: now,
            submittedByUserId: actorId,
            onBehalfOfUserId: actorId,
            workflowStatus: 'customer_responded',
            workflowStatusLog: [workflowLogEntry],
          },
          Boolean(existing),
          priorLog,
        );

        const questionFound = await findQuestionForProject(projectParam, questionId);
        const questionLabel = questionKodLabel(
          (questionFound?.doc as { kod?: string } | null) ?? null,
          questionId,
        );
        const answerRecordId = publicId(answer) || ansLegacyId;

        await createAuditLog({
          userId: actorId,
          userName: actorName,
          userEmail: (actor.email || 'N/A').toLowerCase(),
          action: existing ? 'update' : 'create',
          collection: 'answers',
          recordId: answerRecordId,
          projectId: projectPublicId,
          details: `${existing ? 'Updated' : 'Submitted'} audit response for question ${questionLabel}`,
          timestamp: now,
        });

        return sendSuccess(res, {
          answerId: answerRecordId,
          submittedByUserId: actorId,
          onBehalfOfUserId: actorId,
          assignmentId: assignmentPublicId,
        });
      } catch (err: unknown) {
        console.error('[AUDITOR RESPONSE]', err);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Failed to save audit response';
        return sendError(res, 500, message, 'auditor-response/failed');
      }
    },
  );
}
