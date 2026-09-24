import type { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { cloneTemplateQuestionsToProject } from '../lib/cloneTemplateQuestionsToProject.ts';
import { expandStaleBranchQuestionsInProject } from '../lib/expandStaleBranchQuestionsInProject.ts';
import { repairBranchQuestionTextInProject } from '../lib/repairBranchQuestionTextInProject.ts';
import { deleteProjectQuestionnaireData, resolveProjectIdKeys } from '../lib/assignmentQuestionSync.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';
import { getSqlResourceRepository } from '../data/index.ts';
import { getPrisma } from '../data/prismaClient.ts';
import { createProjectUserAssignment } from '../data/workflowDataAccess.ts';
import { withExternalIds } from '../data/entityLookup.ts';
import * as sqlApi from '../data/genericApiSql.ts';

const KNOWN_RESOURCES = new Set([
  'aiDrafts',
  'answers',
  'answerVersions',
  'assignments',
  'auditLogs',
  'branches',
  'commentMessages',
  'contacts',
  'customers',
  'domains',
  'emissionEntries',
  'emissionFactors',
  'kbDocuments',
  'knowledgeBases',
  'metricDefinitions',
  'metricEntries',
  'materialityTopics',
  'materialityAssessments',
  'platformUsers',
  'projects',
  'projectPages',
  'projectQuestions',
  'projectUserAssignments',
  'questions',
  'sectorCategories',
  'sasbMacroSectors',
  'sasbSubSectors',
  'naceCodeMappings',
  'segments',
  'templates',
  'templatePages',
  'translations',
]);

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'api/error') {
  return res.status(status).json({ success: false, error, code });
}

function getRequesterId(req: Request, jwtSecret: string) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;

  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), jwtSecret) as any;
    return decoded.uid || decoded.sub;
  } catch {
    return undefined;
  }
}

export function registerMongoApiRoutes(
  app: Express,
  options: { jwtSecret: string; requireAuth?: boolean },
) {
  app.use('/api/db', async (req, res, next) => {
    if (options.requireAuth) {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        return failure(res, 401, 'Authentication required', 'auth/missing-token');
      }
      try {
        jwt.verify(header.slice('Bearer '.length), options.jwtSecret);
      } catch {
        return failure(res, 401, 'Invalid or expired token', 'auth/invalid-token');
      }
    }

    next();
  });

  app.get('/api/db/:resource', async (req, res) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth?.user || auth.reason) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }

    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }

    const listRepo = getSqlResourceRepository();
    return sqlApi.list(req, res, listRepo, req.params.resource);
  });

  app.get('/api/db/:resource/:id', async (req, res) => {
    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }

    const repo = getSqlResourceRepository();
    return sqlApi.getById(req, res, repo, req.params.resource);
  });

  app.post('/api/db/:resource', async (req, res) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth?.user || auth.reason) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }

    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }

    const createRepo = getSqlResourceRepository();
    return sqlApi.create(req, res, createRepo, req.params.resource, getRequesterId(req, options.jwtSecret));
  });

  app.post('/api/db/:resource/bulk', async (req, res) => {
    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }
    if (!Array.isArray(req.body.items)) return failure(res, 400, 'items array required', 'db/invalid-bulk');

    const bulkRepo = getSqlResourceRepository();
    return sqlApi.bulkCreate(req, res, bulkRepo, req.params.resource, getRequesterId(req, options.jwtSecret));
  });

  app.get('/api/settings/:key', async (req, res) => {
    return sqlApi.getSetting(req, res);
  });

  app.put('/api/settings/:key', async (req, res) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth?.user || auth.reason) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }
    if (auth.user.role !== 'platform_admin') {
      return failure(res, 403, 'Admin access required', 'auth/forbidden');
    }

    return sqlApi.putSetting(req, res);
  });

  /** Görevler / formlar: yanıtı projectId + questionId + contactId ile upsert. */
  app.put('/api/db/answers/upsert', async (req, res) => {
    return sqlApi.upsertAnswer(req, res, options.jwtSecret);
  });

  /** Görevlerim: append assignee note on an answer. */
  app.post('/api/db/answers/:answerId/assignee-notes', async (req, res) => {
    return sqlApi.appendAssigneeNote(req, res);
  });

  /** Forms tab: append PM / consultant manager review comment on an answer. */
  app.post('/api/db/answers/:answerId/review-comments', async (req, res) => {
    return sqlApi.appendReviewComment(req, res);
  });

  app.patch('/api/db/:resource/:id', async (req, res) => {
    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }

    const patchRepo = getSqlResourceRepository();
    return sqlApi.patch(req, res, patchRepo, req.params.resource);
  });

  app.put('/api/db/:resource/:id', async (req, res) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth?.user || auth.reason) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }

    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }

    const putRepo = getSqlResourceRepository();
    return sqlApi.put(req, res, putRepo, req.params.resource);
  });

  app.delete('/api/db/:resource/:id', async (req, res) => {
    const auth = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!auth?.user || auth.reason) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }

    if (!KNOWN_RESOURCES.has(req.params.resource)) {
      return failure(res, 404, 'Unknown resource', 'db/unknown-resource');
    }

    const deleteRepo = getSqlResourceRepository();
    return sqlApi.remove(req, res, deleteRepo, req.params.resource);
  });

  app.post('/api/db/projects/create-from-template', async (req, res) => {
    const {
      customerId,
      templateId,
      name,
      creatorId,
      category = 'Project',
      allowMultipleAssignments = false,
    } = req.body;
    if (!customerId || !name) {
      return failure(res, 400, 'customerId and name required', 'projects/missing-data');
    }

    const tid =
      typeof templateId === 'string' && templateId.trim() ? templateId.trim() : '';
    const startDate = new Date().toISOString().split('T')[0];

    {
      const prisma = getPrisma();
      const project = await prisma.project.create({
        data: {
          customerId: String(customerId),
          templateId: tid || null,
          name: String(name),
          category: String(category || 'Project'),
          allowMultipleAssignments: Boolean(allowMultipleAssignments),
          status: 'active',
          startDate,
        },
      });
      const projectId = project.id;

      if (creatorId) {
        await createProjectUserAssignment({
          projectId,
          userId: String(creatorId),
          role: 'admin',
          assignedAt: new Date(),
        });
      }

      if (tid) {
        const templatePages = withExternalIds(
          (await prisma.templatePage.findMany({
            where: {
              OR: [{ templateId: tid }, { legacyFirebaseId: tid }, { id: tid }],
            },
            orderBy: { order: 'asc' },
          })) as Record<string, unknown>[],
        );
        if (templatePages.length > 0) {
          await prisma.projectPage.createMany({
            data: templatePages.map((page) => ({
              projectId,
              sourceTemplatePageId: String(page.id),
              pageKind: String(page.pageKind || 'customer_question_set'),
              title: String(page.title || ''),
              order: typeof page.order === 'number' ? page.order : 0,
              briefText: String(page.briefText || ''),
              briefFileUrl: page.briefFileUrl ? String(page.briefFileUrl) : null,
              draftContent: '',
              draftStatus: 'pending',
              answerUpdatedFlag: false,
            })),
          });
        }
        await cloneTemplateQuestionsToProject(projectId, tid, {
          deleteExisting: true,
          customerId: String(customerId),
        });
      }

      return success(res, { id: projectId }, 201);
    }
  });

  app.post('/api/db/projects/:id/rebuild-from-template', async (req, res) => {
    const projectId = req.params.id;
    const { templateId } = req.body || {};
    if (!templateId || typeof templateId !== 'string') {
      return failure(res, 400, 'templateId required', 'projects/missing-template');
    }

    const prisma = getPrisma();
    const project = await prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { legacyFirebaseId: projectId }] },
    });
    if (!project) return failure(res, 404, 'Project not found', 'projects/not-found');
    const resolvedProjectId = project.id;

    await prisma.project.update({ where: { id: resolvedProjectId }, data: { templateId } });
    await deleteProjectQuestionnaireData(resolvedProjectId);

    const templatePages = withExternalIds(
      (await prisma.templatePage.findMany({
        where: { OR: [{ templateId }, { legacyFirebaseId: templateId }, { id: templateId }] },
        orderBy: { order: 'asc' },
      })) as Record<string, unknown>[],
    );
    if (templatePages.length > 0) {
      await prisma.projectPage.createMany({
        data: templatePages.map((page) => ({
          projectId: resolvedProjectId,
          sourceTemplatePageId: String(page.id),
          pageKind: String(page.pageKind || 'customer_question_set'),
          title: String(page.title || ''),
          order: typeof page.order === 'number' ? page.order : 0,
          briefText: String(page.briefText || ''),
          briefFileUrl: page.briefFileUrl ? String(page.briefFileUrl) : null,
          draftContent: '',
          draftStatus: 'pending',
          answerUpdatedFlag: false,
        })),
      });
    }

    const projectCustomerId = String(project.customerId || '').trim();
    const { count } = await cloneTemplateQuestionsToProject(resolvedProjectId, templateId, {
      deleteExisting: true,
      customerId: projectCustomerId || undefined,
    });
    await expandStaleBranchQuestionsInProject(resolvedProjectId, {
      customerId: projectCustomerId || undefined,
    });
    await repairBranchQuestionTextInProject(resolvedProjectId);

    const finalCount = await prisma.projectQuestion.count({ where: { projectId: resolvedProjectId } });
    return success(res, { ok: true, questionCount: finalCount || count });
  });

  app.post('/api/db/projects/:id/clear-data', async (req, res) => {
    const projectId = req.params.id;
    const includeUsers = Boolean(req.body.includeUsers);
    const projectKeys = await resolveProjectIdKeys(projectId);

    await deleteProjectQuestionnaireData(projectId);

    const prisma = getPrisma();
    const keys = projectKeys.length > 0 ? projectKeys : [projectId];

    if (includeUsers) {
      const projectUserAssignments = await prisma.projectUserAssignment.findMany({
        where: { projectId: { in: keys } },
      });
      const userIds = projectUserAssignments.map((assignment) => assignment.userId);
      await prisma.platformUser.deleteMany({
        where: {
          id: { in: userIds },
          role: { notIn: ['platform_admin', 'consultant_manager'] },
          OR: [{ isConfirmed: false }, { contactId: { not: null } }],
        },
      });
    }

    await prisma.projectUserAssignment.deleteMany({ where: { projectId: { in: keys } } });
    return success(res, { ok: true });
  });
}
