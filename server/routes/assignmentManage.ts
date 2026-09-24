/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express } from 'express';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import {
  canManageProjectAssignment,
  findAssignmentForProject,
  findRecipientExists,
  readDateMs,
  resolveRecipientLabel,
} from '../lib/assignmentManageAccess.ts';
import { resolveProjectIdKeys } from '../lib/assignmentQuestionSync.ts';
import { documentPublicId } from '../lib/questionIds.ts';
import { sendAssignmentNotificationEmail, sendAssignmentApprovalRequestEmail } from '../lib/assignmentNotificationEmail.ts';
import { notifyProjectManagersForAssignment } from '../lib/assignmentAssigneeNotice.ts';
import {
  createAuditLog,
  deleteAnswersForAssignment,
  deleteAssignment,
  updateAssignment,
} from '../data/workflowDataAccess.ts';

function assignmentPublicId(assignment: {
  legacyFirebaseId?: string;
  _id?: unknown;
  id?: string;
}): string {
  return documentPublicId(assignment);
}

async function deleteAssignmentAnswers(
  projectId: string,
  assignment: { legacyFirebaseId?: string; _id?: unknown; id?: string },
) {
  const assignmentId = assignmentPublicId(assignment);
  const projectKeys = await resolveProjectIdKeys(projectId);
  const legacy = (assignment as { legacyFirebaseId?: string }).legacyFirebaseId;

  const assignmentIdClauses = [
    assignmentId,
    String(assignment._id || assignment.id || ''),
  ].filter(Boolean);
  if (legacy && legacy !== assignmentId) {
    assignmentIdClauses.push(legacy);
  }

  return deleteAnswersForAssignment(
    projectKeys.length > 0 ? projectKeys : [projectId],
    assignmentIdClauses,
  );
}

function computeAssignmentStatus(
  existingStatus: string | undefined,
  deadlineMs: number | undefined,
): 'pending' | 'completed' | 'overdue' | 'awaiting_approval' {
  if (existingStatus === 'completed') return 'completed';
  if (existingStatus === 'awaiting_approval') return 'awaiting_approval';
  if (typeof deadlineMs === 'number' && deadlineMs < Date.now()) return 'overdue';
  return 'pending';
}

export function registerAssignmentManageRoutes(
  app: Express,
  options: { jwtSecret: string },
) {
  app.patch(
    '/api/projects/:projectId/assignments/:assignmentId',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        if (!auth.user) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId, assignmentId } = req.params;
        const assignment = await findAssignmentForProject(projectId, assignmentId);
        if (!assignment) {
          return res.status(404).json({ success: false, error: 'Atama bulunamadı' });
        }

        const allowed = await canManageProjectAssignment(auth.user, assignment);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Bu atamayı düzenleme yetkiniz yok' });
        }

        const {
          recipientId,
          recipientType,
          beginDate,
          deadline,
          urgency,
          approverId,
          approverType,
          reassignNote,
          reassignQuestionLabel,
        } = req.body ?? {};

        const updates: Record<string, unknown> = {};
        const unsetFields: Record<string, 1> = {};
        let recipientChanged = false;
        let oldRecipientLabel: string | undefined;
        let newRecipientLabel: string | undefined;

        if (urgency != null) {
          const raw = String(urgency).trim().toLowerCase();
          updates.urgency = raw === 'urgent' || raw === 'acil' ? 'urgent' : 'normal';
        }

        if (approverId != null || approverType != null) {
          const nextApproverId = String(
            approverId ?? (assignment as { approverId?: string }).approverId ?? '',
          ).trim();
          const nextApproverType = String(
            approverType ?? (assignment as { approverType?: string }).approverType ?? 'user',
          );
          if (!nextApproverId) {
            return res.status(400).json({
              success: false,
              error: 'approverId gereklidir',
            });
          }
          if (nextApproverType !== 'contact' && nextApproverType !== 'user') {
            return res.status(400).json({
              success: false,
              error: 'Geçersiz approverType',
            });
          }
          const approverExists = await findRecipientExists(
            nextApproverId,
            nextApproverType as 'contact' | 'user',
          );
          if (!approverExists) {
            return res.status(400).json({
              success: false,
              error: 'Onaylayıcı bulunamadı',
            });
          }
          updates.approverId = nextApproverId;
          updates.approverType = nextApproverType;
        }

        if (recipientId != null || recipientType != null) {
          const nextRecipientId = String(recipientId ?? assignment.recipientId).trim();
          const nextRecipientType = (recipientType ??
            assignment.recipientType) as 'contact' | 'user';

          if (!nextRecipientId) {
            return res.status(400).json({ success: false, error: 'recipientId gereklidir' });
          }
          if (nextRecipientType !== 'contact' && nextRecipientType !== 'user') {
            return res.status(400).json({ success: false, error: 'Geçersiz recipientType' });
          }

          const recipientExists = await findRecipientExists(
            nextRecipientId,
            nextRecipientType,
          );
          if (!recipientExists) {
            return res.status(400).json({ success: false, error: 'Alıcı bulunamadı' });
          }

          const prevRecipientId = String(assignment.recipientId || '').trim();
          const prevRecipientType = assignment.recipientType as 'contact' | 'user';
          if (
            nextRecipientId !== prevRecipientId ||
            nextRecipientType !== prevRecipientType
          ) {
            recipientChanged = true;
            oldRecipientLabel = await resolveRecipientLabel(
              prevRecipientId,
              prevRecipientType,
            );
            newRecipientLabel = await resolveRecipientLabel(
              nextRecipientId,
              nextRecipientType,
            );
            if (nextRecipientType === 'user' || prevRecipientType === 'contact') {
              unsetFields.token = 1;
              unsetFields.tokenExpiry = 1;
            }
          }

          updates.recipientId = nextRecipientId;
          updates.recipientType = nextRecipientType;
        }

        let beginMs = readDateMs(assignment.beginDate);
        let deadlineMs = readDateMs(assignment.deadline);

        if (beginDate != null) {
          beginMs = new Date(beginDate).getTime();
          if (Number.isNaN(beginMs)) {
            return res.status(400).json({ success: false, error: 'Geçersiz beginDate' });
          }
          updates.beginDate = new Date(beginMs);
        }

        if (deadline != null) {
          deadlineMs = new Date(deadline).getTime();
          if (Number.isNaN(deadlineMs)) {
            return res.status(400).json({ success: false, error: 'Geçersiz deadline' });
          }
          updates.deadline = new Date(deadlineMs);
        }

        if (
          beginMs != null &&
          deadlineMs != null &&
          beginMs > deadlineMs
        ) {
          return res.status(400).json({
            success: false,
            error: 'Başlangıç tarihi bitiş tarihinden sonra olamaz',
          });
        }

        updates.status = computeAssignmentStatus(
          String(assignment.status || 'pending'),
          deadlineMs,
        );

        const prevBegin = readDateMs(assignment.beginDate);
        const prevDeadline = readDateMs(assignment.deadline);
        const datesChanged =
          (beginDate != null && prevBegin !== beginMs) ||
          (deadline != null && prevDeadline !== deadlineMs);

        await updateAssignment(
          String(assignment._id || assignment.id),
          updates,
          Object.keys(unsetFields).length > 0 ? unsetFields : undefined,
        );

        if (datesChanged) {
          const { resetAssignmentRemindersForDateChange } = await import(
            '../lib/assignmentReminderService.ts'
          );
          await resetAssignmentRemindersForDateChange(assignmentPublicId(assignment));
        }

        if (recipientChanged && oldRecipientLabel && newRecipientLabel) {
          const assignmentRecordId = assignmentPublicId(assignment);
          const questionCount = Array.isArray(assignment.questionIds)
            ? assignment.questionIds.length
            : 0;
          const noteText =
            typeof reassignNote === 'string' ? reassignNote.trim() : '';
          const questionLabel =
            typeof reassignQuestionLabel === 'string'
              ? reassignQuestionLabel.trim()
              : '';
          let details = questionLabel
            ? `Atama alıcısı değiştirildi — ${questionLabel}: ${oldRecipientLabel} → ${newRecipientLabel}. Önceki alıcının görevi kaldırıldı.`
            : `Atama alıcısı değiştirildi (${questionCount} soru): ${oldRecipientLabel} → ${newRecipientLabel}. Önceki alıcının görevi kaldırıldı.`;
          if (noteText) {
            details += ` Not: ${noteText}`;
          }
          await createAuditLog({
            userId: documentPublicId(
              auth.user as { _id?: unknown; legacyFirebaseId?: string },
            ),
            userName: String(auth.user.name || 'User'),
            userEmail: String(auth.user.email || ''),
            action: 'update',
            collection: 'assignments',
            recordId: assignmentRecordId,
            projectId,
            details,
            timestamp: Date.now(),
          });
        }

        return res.json({ success: true });
      } catch (error: unknown) {
        console.error('[ASSIGNMENT PATCH ERROR]', error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Atama güncellenemedi',
        });
      }
    },
  );

  app.delete(
    '/api/projects/:projectId/assignments/:assignmentId',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        if (!auth.user) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId, assignmentId } = req.params;
        const assignment = await findAssignmentForProject(projectId, assignmentId);
        if (!assignment) {
          return res.status(404).json({ success: false, error: 'Atama bulunamadı' });
        }

        const allowed = await canManageProjectAssignment(auth.user, assignment);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Bu atamayı silme yetkiniz yok' });
        }

        const answersDeleted = await deleteAssignmentAnswers(projectId, assignment);
        const assignmentDeleted = await deleteAssignment(
          String(assignment._id || assignment.id),
        );

        return res.json({
          success: true,
          answersDeleted,
          assignmentDeleted,
        });
      } catch (error: unknown) {
        console.error('[ASSIGNMENT DELETE ERROR]', error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Atama silinemedi',
        });
      }
    },
  );

  app.post(
    '/api/projects/:projectId/assignments/:assignmentId/submit-for-approval',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        if (!auth.user) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId, assignmentId } = req.params;
        const assignment = await findAssignmentForProject(projectId, assignmentId);
        if (!assignment) {
          return res.status(404).json({ success: false, error: 'Atama bulunamadı' });
        }

        const actorId = documentPublicId(
          auth.user as { _id?: unknown; legacyFirebaseId?: string; id?: string },
        );
        const recipientId = String(assignment.recipientId || '').trim();
        const canManage = await canManageProjectAssignment(auth.user, assignment);
        if (actorId !== recipientId && !canManage) {
          return res.status(403).json({
            success: false,
            error: 'Bu görevi onaya gönderme yetkiniz yok',
          });
        }

        const approverId = String(
          (assignment as { approverId?: string }).approverId || '',
        ).trim();
        if (!approverId) {
          return res.status(400).json({
            success: false,
            error: 'Bu görev için onaylayıcı tanımlanmamış',
          });
        }

        const now = new Date();
        await updateAssignment(String(assignment._id || assignment.id), {
          status: 'awaiting_approval',
          submittedForApprovalAt: now,
        });

        const clientOrigin =
          typeof req.body?.clientOrigin === 'string' ? req.body.clientOrigin : undefined;

        let approverEmail: string | undefined;
        try {
          const notified = await sendAssignmentApprovalRequestEmail(
            projectId,
            assignmentId,
            {
              clientOrigin,
              triggeredBy: {
                userId: actorId,
                userName: String(auth.user.name || 'User'),
                userEmail: String(auth.user.email || ''),
              },
            },
          );
          approverEmail = notified.recipientEmail;
        } catch (emailErr) {
          console.error('[ASSIGNMENT SUBMIT APPROVAL EMAIL]', emailErr);
        }

        return res.json({
          success: true,
          status: 'awaiting_approval',
          approverEmail,
        });
      } catch (error: unknown) {
        console.error('[ASSIGNMENT SUBMIT APPROVAL ERROR]', error);
        return res.status(500).json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Görev onaya gönderilemedi',
        });
      }
    },
  );

  app.post(
    '/api/projects/:projectId/assignments/:assignmentId/approve',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        if (!auth.user) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId, assignmentId } = req.params;
        const assignment = await findAssignmentForProject(projectId, assignmentId);
        if (!assignment) {
          return res.status(404).json({ success: false, error: 'Atama bulunamadı' });
        }

        if (String(assignment.status || '') !== 'awaiting_approval') {
          return res.status(400).json({
            success: false,
            error: 'Görev onay bekleyen durumda değil',
          });
        }

        const actorId = documentPublicId(
          auth.user as { _id?: unknown; legacyFirebaseId?: string; id?: string },
        );
        const approverId = String(
          (assignment as { approverId?: string }).approverId || '',
        ).trim();
        const canManage = await canManageProjectAssignment(auth.user, assignment);
        if (approverId && actorId !== approverId && !canManage) {
          return res.status(403).json({
            success: false,
            error: 'Bu görevi onaylama yetkiniz yok',
          });
        }
        if (!approverId && !canManage) {
          return res.status(403).json({
            success: false,
            error: 'Bu görevi onaylama yetkiniz yok',
          });
        }

        const now = new Date();
        await updateAssignment(String(assignment._id || assignment.id), {
          status: 'completed',
          completedAt: now,
          approvedAt: now,
          approvedBy: actorId,
        });

        return res.json({ success: true, status: 'completed' });
      } catch (error: unknown) {
        console.error('[ASSIGNMENT APPROVE ERROR]', error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Görev onaylanamadı',
        });
      }
    },
  );

  app.post(
    '/api/projects/:projectId/assignments/:assignmentId/notify-project-manager',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        if (!auth.user) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId, assignmentId } = req.params;
        const clientOrigin =
          typeof req.body?.clientOrigin === 'string' ? req.body.clientOrigin : undefined;

        const result = await notifyProjectManagersForAssignment(
          projectId,
          assignmentId,
          auth.user as { _id?: unknown; legacyFirebaseId?: string; name?: string; email?: string },
          { clientOrigin },
        );

        return res.json({
          success: true,
          managersNotified: result.managersNotified,
          assignmentId: result.assignmentId,
        });
      } catch (error: unknown) {
        console.error('[ASSIGNMENT NOTIFY PM ERROR]', error);
        return res.status(400).json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Proje yöneticisine bildirim gönderilemedi',
        });
      }
    },
  );

  app.post(
    '/api/projects/:projectId/assignments/:assignmentId/resend-email',
    async (req, res) => {
      try {
        const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
        if (!auth.user) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId, assignmentId } = req.params;
        const assignment = await findAssignmentForProject(projectId, assignmentId);
        if (!assignment) {
          return res.status(404).json({ success: false, error: 'Atama bulunamadı' });
        }

        const allowed = await canManageProjectAssignment(auth.user, assignment);
        if (!allowed) {
          return res.status(403).json({ success: false, error: 'Bu atamayı yönetme yetkiniz yok' });
        }

        const clientOrigin =
          typeof req.body?.clientOrigin === 'string'
            ? req.body.clientOrigin
            : undefined;

        const result = await sendAssignmentNotificationEmail(
          projectId,
          assignmentId,
          {
            clientOrigin,
            emailType: 'assignment_resend',
            triggeredBy: {
              userId: documentPublicId(auth.user as { _id?: unknown; legacyFirebaseId?: string }),
              userName: String(auth.user.name || 'User'),
              userEmail: String(auth.user.email || ''),
            },
          },
        );
        return res.json({
          success: true,
          message: 'E-posta gönderildi',
          recipientEmail: result.recipientEmail,
        });
      } catch (error: unknown) {
        console.error('[ASSIGNMENT RESEND EMAIL ERROR]', error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'E-posta gönderilemedi',
        });
      }
    },
  );
}
