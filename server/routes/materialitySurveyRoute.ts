/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin CRUD for the Materiality Assessment Survey module (Phase 2).
 * SQL-only; persistence via server/data/materialitySurveyDataAccess.ts.
 * Reads require auth; mutations require an elevated (firma-admin) role.
 * Invite/reminder (Phase 4), public survey (Phase 3), matrix/export (Phase 5)
 * are added in later phases.
 */

import type { Express, Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import * as survey from '../data/materialitySurveyDataAccess.ts';
import { getPrisma } from '../data/prismaClient.ts';
import { parseMaterialityScoresCsv } from '../../src/lib/materialityScoringCsv.ts';
import { sendResendEmail } from '../lib/resendEmail.ts';
import { resolveAppPublicOrigin } from '../lib/appPublicUrl.ts';
import { createAuditLog } from '../data/workflowDataAccess.ts';
import { surveyEmailContent, runSurveyReminderSweep } from '../lib/materialitySurveyReminderService.ts';

const ADMIN_ROLES = new Set(['platform_admin', 'consultant_manager']);

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'materiality-survey/error') {
  return res.status(status).json({ success: false, error, code });
}

export function registerMaterialitySurveyRoutes(app: Express, options: { jwtSecret: string }) {
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }
    try {
      const decoded = jwt.verify(header.slice('Bearer '.length), options.jwtSecret) as {
        uid?: string;
        sub?: string;
        role?: string;
      };
      (req as any).userId = decoded.uid || decoded.sub || '';
      (req as any).userRole = decoded.role || '';
      return next();
    } catch {
      return failure(res, 401, 'Invalid or expired token', 'auth/invalid-token');
    }
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!ADMIN_ROLES.has(String((req as any).userRole || ''))) {
      return failure(res, 403, 'Insufficient permissions', 'auth/forbidden');
    }
    return next();
  };

  /** Cron/automation guard: platform API key (x-api-key) or an admin JWT. */
  const requireCron = (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-api-key'];
    const expected = process.env.PLATFORM_API_KEY || 'fallback-platform-key-dev-only';
    if (key && key === expected) return next();
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const d = jwt.verify(header.slice('Bearer '.length), options.jwtSecret) as { role?: string };
        if (ADMIN_ROLES.has(String(d.role || ''))) return next();
      } catch {
        /* fall through */
      }
    }
    return failure(res, 401, 'Cron authorization required', 'auth/forbidden');
  };

  /** Wrap an async handler: thrown errors become a 500. */
  const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => {
    return (req: Request, res: Response) => {
      void fn(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Materiality survey operation failed';
        failure(res, 500, message, 'materiality-survey/server-error');
      });
    };
  };

  const actor = (req: Request) => String((req as any).userId || '') || null;

  // --- Surveys -------------------------------------------------------------

  app.get('/api/materiality/surveys', requireAuth, handle(async (req, res) => {
    if (String(req.query.templates ?? '') === 'true') {
      return success(res, await survey.listTemplateSurveys());
    }
    const customerId = String(req.query.customerId ?? '').trim();
    if (!customerId) return failure(res, 400, 'customerId is required', 'materiality-survey/missing-customer');
    success(res, await survey.listSurveys(customerId));
  }));

  app.post('/api/materiality/surveys', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    if (!b.customerId || !b.title) {
      return failure(res, 400, 'customerId and title are required', 'materiality-survey/invalid');
    }
    const created = await survey.createSurvey({
      customerId: String(b.customerId),
      subeId: b.subeId ?? null,
      title: String(b.title),
      standardRef: b.standardRef ? String(b.standardRef) : undefined,
      year: b.year ?? null,
      deadline: b.deadline ? new Date(b.deadline) : null,
      scaleMax: b.scaleMax,
      topicRollup: b.topicRollup,
      materialThreshold: b.materialThreshold ?? null,
      reminderCadence: b.reminderCadence,
      reminderCutoffDays: b.reminderCutoffDays,
      maxReminders: b.maxReminders,
      createdBy: actor(req),
      ownerId: actor(req),
    });
    success(res, created, 201);
  }));

  app.get('/api/materiality/surveys/:id', requireAuth, handle(async (req, res) => {
    const row = await survey.getSurveyById(String(req.params.id));
    if (!row) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    const [iros, groups, stakeholders] = await Promise.all([
      survey.listIros(row.id as string),
      survey.listGroups(row.id as string),
      survey.listStakeholders(row.id as string),
    ]);
    success(res, {
      ...row,
      counts: { iros: iros.length, groups: groups.length, stakeholders: stakeholders.length },
    });
  }));

  app.patch('/api/materiality/surveys/:id', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'standardRef', 'status', 'year', 'scaleMax', 'topicRollup',
      'materialThreshold', 'reminderCadence', 'reminderCutoffDays', 'maxReminders', 'subeId',
      'isTemplate']) {
      if (k in b) data[k] = b[k];
    }
    if ('deadline' in b) data.deadline = b.deadline ? new Date(b.deadline) : null;
    const existing = await survey.getSurveyById(String(req.params.id));
    if (!existing) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    const updated = await survey.updateSurvey(String(req.params.id), data);
    if (!updated) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');

    // Audit materiality-defining changes (threshold, status) — who/when/why.
    const audited = (['materialThreshold', 'status'] as const).filter(
      (k) => k in data && data[k] !== (existing as Record<string, unknown>)[k],
    );
    if (audited.length > 0) {
      const changes = audited.map((k) => `${k}: ${(existing as Record<string, unknown>)[k]} -> ${data[k]}`);
      await createAuditLog({
        userId: actor(req),
        action: 'update',
        collection: 'materialitysurveys',
        recordId: String(req.params.id),
        details: `${changes.join('; ')}${b.auditNote ? ` — ${String(b.auditNote)}` : ''}`,
        timestamp: new Date(),
      });
    }
    success(res, updated);
  }));

  app.delete('/api/materiality/surveys/:id', requireAuth, requireAdmin, handle(async (req, res) => {
    const existing = await survey.getSurveyById(String(req.params.id));
    if (!existing) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    await survey.deleteSurvey(String(req.params.id));
    success(res, { id: req.params.id, deleted: true });
  }));

  // --- Clone (from a template, or duplicate any existing survey) -----------

  app.post('/api/materiality/surveys/:id/clone', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    if (!b.customerId || !b.title) {
      return failure(res, 400, 'customerId and title are required', 'materiality-survey/invalid');
    }
    const existing = await survey.getSurveyById(String(req.params.id));
    if (!existing) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    const cloned = await survey.cloneSurvey(String(req.params.id), {
      customerId: String(b.customerId),
      title: String(b.title),
      createdBy: actor(req),
      ownerId: actor(req),
    });
    if (!cloned) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    success(res, cloned, 201);
  }));

  // --- Topic longlist import (reuse GRIMaterialityMatrixRow + CSV parser) ---

  app.post('/api/materiality/surveys/:id/topics/import', requireAuth, requireAdmin, handle(async (req, res) => {
    const surveyRow = await survey.getSurveyById(String(req.params.id));
    if (!surveyRow) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    const csv = String(req.body?.csv ?? '');
    if (!csv.trim()) return failure(res, 400, 'csv body is required', 'materiality-survey/invalid');

    const parsed = parseMaterialityScoresCsv(csv);
    if (parsed.length === 0) return failure(res, 400, 'No rows parsed from CSV', 'materiality-survey/empty-csv');

    const customerId = String(surveyRow.customerId);
    const prisma = getPrisma();
    let order = 0;
    const created = await prisma.$transaction(
      parsed.map((row) =>
        prisma.gRIMaterialityMatrixRow.create({
          data: {
            customerId,
            order: order++,
            subject: row.subject ?? '',
            griMapping: row.griMapping ?? '',
            disclosures: row.disclosures ?? '',
            notes: row.notes ?? '',
            isUniversalDisclosure: false, // flagged in the TopicIroBuilder UI, not via CSV
            createdBy: actor(req),
            ownerId: actor(req),
          },
        }),
      ),
    );
    success(res, { imported: created.length }, 201);
  }));

  // --- IROs ----------------------------------------------------------------

  app.get('/api/materiality/surveys/:id/iros', requireAuth, handle(async (req, res) => {
    success(res, await survey.listIros(String(req.params.id)));
  }));

  app.post('/api/materiality/surveys/:id/iros', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    if (!b.topicRef) return failure(res, 400, 'topicRef is required', 'materiality-survey/invalid');
    const created = await survey.createIro({
      surveyId: String(req.params.id),
      topicRef: String(b.topicRef),
      description: b.description ? String(b.description) : undefined,
      iroType: b.iroType,
      valueChainPosition: b.valueChainPosition,
      polarity: b.polarity,
      sasbRef: b.sasbRef ?? null,
      esrsRef: b.esrsRef ?? null,
      sortOrder: b.sortOrder,
      createdBy: actor(req),
      ownerId: actor(req),
    });
    success(res, created, 201);
  }));

  app.patch('/api/materiality/surveys/:id/iros/:iroId', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    const data: Record<string, unknown> = {};
    for (const k of ['topicRef', 'description', 'iroType', 'valueChainPosition', 'polarity',
      'sasbRef', 'esrsRef', 'sortOrder']) {
      if (k in b) data[k] = b[k];
    }
    const updated = await survey.updateIro(String(req.params.iroId), data);
    if (!updated) return failure(res, 404, 'IRO not found', 'materiality-survey/not-found');
    success(res, updated);
  }));

  app.delete('/api/materiality/surveys/:id/iros/:iroId', requireAuth, requireAdmin, handle(async (req, res) => {
    await survey.deleteIro(String(req.params.iroId));
    success(res, { id: req.params.iroId, deleted: true });
  }));

  // --- Stakeholder groups --------------------------------------------------

  app.get('/api/materiality/surveys/:id/stakeholder-groups', requireAuth, handle(async (req, res) => {
    success(res, await survey.listGroups(String(req.params.id)));
  }));

  app.post('/api/materiality/surveys/:id/stakeholder-groups', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    if (!b.name) return failure(res, 400, 'name is required', 'materiality-survey/invalid');
    const created = await survey.createGroup({
      surveyId: String(req.params.id),
      name: String(b.name),
      weight: b.weight,
      sortOrder: b.sortOrder,
      createdBy: actor(req),
      ownerId: actor(req),
    });
    success(res, created, 201);
  }));

  app.patch('/api/materiality/surveys/:id/stakeholder-groups/:groupId', requireAuth, requireAdmin, handle(async (req, res) => {
    const b = req.body ?? {};
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'weight', 'sortOrder']) if (k in b) data[k] = b[k];
    const updated = await survey.updateGroup(String(req.params.groupId), data);
    if (!updated) return failure(res, 404, 'Group not found', 'materiality-survey/not-found');
    success(res, updated);
  }));

  app.delete('/api/materiality/surveys/:id/stakeholder-groups/:groupId', requireAuth, requireAdmin, handle(async (req, res) => {
    await survey.deleteGroup(String(req.params.groupId));
    success(res, { id: req.params.groupId, deleted: true });
  }));

  // --- Stakeholders (bulk add; tokens issued here, emailed in Phase 4) -----

  app.get('/api/materiality/surveys/:id/stakeholders', requireAuth, handle(async (req, res) => {
    success(res, await survey.listStakeholders(String(req.params.id)));
  }));

  app.post('/api/materiality/surveys/:id/stakeholders', requireAuth, requireAdmin, handle(async (req, res) => {
    const list = Array.isArray(req.body?.stakeholders) ? req.body.stakeholders : [];
    if (list.length === 0) return failure(res, 400, 'stakeholders array is required', 'materiality-survey/invalid');
    const inputs = list
      .filter((s: { groupId?: string; email?: string }) => s.groupId && s.email)
      .map((s: { groupId: string; name?: string; email: string; phone?: string; locale?: string }) => ({
        groupId: String(s.groupId),
        name: s.name ? String(s.name) : '',
        email: String(s.email),
        phone: s.phone ?? null,
        locale: s.locale === 'en' ? 'en' : 'tr',
        inviteToken: randomBytes(24).toString('hex'),
        createdBy: actor(req),
        ownerId: actor(req),
      }));
    if (inputs.length === 0) return failure(res, 400, 'each stakeholder needs groupId and email', 'materiality-survey/invalid');
    const count = await survey.createStakeholders(inputs);
    success(res, { added: count }, 201);
  }));

  // --- Matrix (on-demand weighted aggregation) -----------------------------

  app.get('/api/materiality/surveys/:id/matrix', requireAuth, handle(async (req, res) => {
    const s = await survey.getSurveyById(String(req.params.id));
    if (!s) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    const scaleMax = Number(s.scaleMax) || 5;
    const rollup = String(s.topicRollup || 'max');
    const threshold = s.materialThreshold == null ? null : Number(s.materialThreshold);

    const iroScores = await survey.getSurveyIroScores(String(s.id));
    // Impact on the 1..scaleMax axis = geometric mean of severity × scope × probability.
    const geo = (a: number, b: number, c: number) => (a > 0 && b > 0 && c > 0 ? Math.cbrt(a * b * c) : 0);
    const iros = iroScores.map((r) => ({
      iroId: r.iroId,
      topicRef: r.topicRef,
      responseCount: r.responseCount,
      financial: r.financial,
      impact: geo(r.severity, r.scope, r.probability),
      severity: r.severity,
      scope: r.scope,
      probability: r.probability,
    }));

    const byTopic = new Map<string, typeof iros>();
    for (const iro of iros) {
      const list = byTopic.get(iro.topicRef) ?? [];
      list.push(iro);
      byTopic.set(iro.topicRef, list);
    }
    const meta = await survey.getTopicMeta([...byTopic.keys()]);

    const topics = [...byTopic.entries()].map(([topicRef, list]) => {
      const rcSum = list.reduce((a, i) => a + i.responseCount, 0);
      const wavg = (sel: (i: (typeof list)[number]) => number) =>
        rcSum > 0
          ? list.reduce((a, i) => a + sel(i) * i.responseCount, 0) / rcSum
          : list.reduce((a, i) => a + sel(i), 0) / (list.length || 1);
      const financial = rollup === 'max' ? Math.max(...list.map((i) => i.financial)) : wavg((i) => i.financial);
      const impact = rollup === 'max' ? Math.max(...list.map((i) => i.impact)) : wavg((i) => i.impact);
      const m = meta[topicRef];
      return {
        topicRef,
        subject: m?.subject || topicRef,
        griMapping: m?.griMapping || '',
        disclosures: m?.disclosures || '',
        financial,
        impact,
        responseCount: rcSum,
        isMaterial: threshold != null && (financial >= threshold || impact >= threshold),
        financialAvg: wavg((i) => i.financial),
        severityAvg: wavg((i) => i.severity),
        scopeAvg: wavg((i) => i.scope),
        probabilityAvg: wavg((i) => i.probability),
      };
    });

    success(res, {
      survey: { id: s.id, title: s.title, scaleMax, topicRollup: rollup, materialThreshold: threshold },
      topics,
      iros: iros.map((i) => ({
        iroId: i.iroId,
        topicRef: i.topicRef,
        responseCount: i.responseCount,
        financial: i.financial,
        impact: i.impact,
      })),
    });
  }));

  // --- Invitations ---------------------------------------------------------

  app.post('/api/materiality/surveys/:id/invite', requireAuth, requireAdmin, handle(async (req, res) => {
    const s = await survey.getSurveyById(String(req.params.id));
    if (!s) return failure(res, 404, 'Survey not found', 'materiality-survey/not-found');
    const onlyPending = req.body?.onlyPending === true;
    const origin = resolveAppPublicOrigin((req.headers.origin as string | undefined) ?? null);
    const surveyTitle = String(s.title);

    const targets = (await survey.listStakeholders(String(s.id)))
      .map((st) => st as Record<string, unknown>)
      .filter((st) => !st.completedAt && !(onlyPending && st.invitedAt));

    let sent = 0;
    let failed = 0;
    for (const st of targets) {
      const link = `${origin}/#/materiality-survey/${String(st.inviteToken)}`;
      const mail = surveyEmailContent({
        locale: String(st.locale ?? 'tr'),
        name: String(st.name ?? ''),
        surveyTitle,
        link,
        reminder: false,
      });
      try {
        await sendResendEmail({ to: String(st.email), name: String(st.name ?? ''), ...mail });
        await survey.updateStakeholder(String(st.id), { invitedAt: new Date(), status: 'invited' });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    // Inviting moves a draft survey into collection.
    if (sent > 0 && s.status === 'draft') await survey.updateSurvey(String(s.id), { status: 'collecting' });
    success(res, { sent, failed, total: targets.length });
  }));

  // --- Reminder sweep (idempotent; scheduled) ------------------------------

  app.post('/api/materiality/surveys/cron/reminders', requireCron, handle(async (_req, res) => {
    success(res, await runSurveyReminderSweep());
  }));

  // --- Public (tokenized) survey runner — no auth --------------------------

  app.get('/api/materiality/survey/:token', handle(async (req, res) => {
    const ctx = await survey.getSurveyContextForToken(String(req.params.token));
    if (!ctx) return failure(res, 404, 'Invalid or expired survey link', 'materiality-survey/invalid-token');
    const s = ctx.survey as Record<string, unknown>;
    const st = ctx.stakeholder as Record<string, unknown>;
    const responses = await survey.listStakeholderResponses(String(st.id));
    success(res, {
      survey: {
        id: s.id, title: s.title, standardRef: s.standardRef,
        scaleMax: s.scaleMax, status: s.status, deadline: s.deadline,
      },
      group: { name: (ctx.group as Record<string, unknown>).name },
      stakeholder: { id: st.id, name: st.name, locale: st.locale, status: st.status, completedAt: st.completedAt },
      iros: ctx.iros.map((i) => {
        const iro = i as Record<string, unknown>;
        return {
          id: iro.id, topicRef: iro.topicRef, description: iro.description,
          iroType: iro.iroType, polarity: iro.polarity,
        };
      }),
      responses,
    });
  }));

  app.post('/api/materiality/survey/:token/responses', handle(async (req, res) => {
    const ctx = await survey.getSurveyContextForToken(String(req.params.token));
    if (!ctx) return failure(res, 404, 'Invalid or expired survey link', 'materiality-survey/invalid-token');
    const s = ctx.survey as Record<string, unknown>;
    if (s.status === 'finalized') return failure(res, 409, 'Survey is closed', 'materiality-survey/closed');

    const stakeholderId = String((ctx.stakeholder as Record<string, unknown>).id);
    const validIros = new Set(ctx.iros.map((i) => String((i as Record<string, unknown>).id)));
    const scaleMax = Number(s.scaleMax) || 5;
    const clamp = (n: unknown) => Math.max(0, Math.min(scaleMax, Math.round(Number(n) || 0)));

    const items: Array<Record<string, unknown>> = Array.isArray(req.body?.responses) ? req.body.responses : [];
    let saved = 0;
    for (const item of items) {
      const iroId = String(item?.iroId ?? '');
      if (!validIros.has(iroId)) continue;
      await survey.upsertResponse({
        iroId,
        stakeholderId,
        financialMaterialityScore: clamp(item.financialMaterialityScore),
        impactSeverityScore: clamp(item.impactSeverityScore),
        impactScopeScore: clamp(item.impactScopeScore),
        impactProbabilityScore: clamp(item.impactProbabilityScore),
        irremediabilityScore: item.irremediabilityScore == null ? null : clamp(item.irremediabilityScore),
        freeTextComment: typeof item.freeTextComment === 'string' ? item.freeTextComment.slice(0, 2000) : '',
      });
      saved += 1;
    }

    let completed = false;
    if (req.body?.complete === true) {
      await survey.updateStakeholder(stakeholderId, { status: 'completed', completedAt: new Date() });
      completed = true;
    }
    success(res, { saved, completed });
  }));
}
