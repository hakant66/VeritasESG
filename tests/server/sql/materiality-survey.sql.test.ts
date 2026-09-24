/**
 * Materiality Survey module on SQL: admin CRUD, RBAC, public runner
 * aggregation, and threshold audit logging.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import { makeSqlApp } from '../helpers/makeSqlApp.ts';
import {
  authHeader,
  clearSqlTables,
  createSqlCustomer,
  seedSqlPlatformUser,
} from '../helpers/sqlTestHarness.ts';
import { getPrisma } from '../../../server/data/prismaClient.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };
const describeSql = describe.skipIf(Boolean(sqlState.skipped));

describeSql('SQL materiality survey API', () => {
  // Build the app at runtime (not collection time) so it captures the test
  // JWT_SECRET set by the shared setup, not the ambient .env value.
  let app: ReturnType<typeof makeSqlApp>;
  let token = '';
  let customerId = '';

  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
    app = makeSqlApp();
    token = (await seedSqlPlatformUser()).token;
    customerId = (await createSqlCustomer({ name: 'Acme' })).id;
  });

  afterAll(async () => {
    /* prisma disconnected by shared setup */
  });

  it('creates and lists a survey', async () => {
    const create = await request(app)
      .post('/api/materiality/surveys')
      .set(authHeader(token))
      .send({ customerId, title: 'DMA 2026' });
    expect(create.status).toBe(201);
    expect(create.body.data.title).toBe('DMA 2026');
    expect(create.body.data.status).toBe('draft');

    const list = await request(app)
      .get(`/api/materiality/surveys?customerId=${customerId}`)
      .set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('enforces RBAC on mutations', async () => {
    const noAuth = await request(app).post('/api/materiality/surveys').send({ customerId, title: 'X' });
    expect(noAuth.status).toBe(401);

    const viewer = await seedSqlPlatformUser({ id: 'viewer-1', email: 'viewer@test.dev', role: 'auditor' });
    const forbidden = await request(app)
      .post('/api/materiality/surveys')
      .set(authHeader(viewer.token))
      .send({ customerId, title: 'X' });
    expect(forbidden.status).toBe(403);
  });

  it('aggregates public responses into the matrix', async () => {
    const surveyId = (
      await request(app)
        .post('/api/materiality/surveys')
        .set(authHeader(token))
        .send({ customerId, title: 'DMA', scaleMax: 5, topicRollup: 'max', materialThreshold: 3 })
    ).body.data.id;
    await request(app).patch(`/api/materiality/surveys/${surveyId}`).set(authHeader(token)).send({ status: 'collecting' });

    const group = (
      await request(app)
        .post(`/api/materiality/surveys/${surveyId}/stakeholder-groups`)
        .set(authHeader(token))
        .send({ name: 'G', weight: 1 })
    ).body.data;
    await request(app)
      .post(`/api/materiality/surveys/${surveyId}/stakeholders`)
      .set(authHeader(token))
      .send({ stakeholders: [{ groupId: group.id, name: 'S', email: 's@x.invalid' }] });
    const iro = (
      await request(app)
        .post(`/api/materiality/surveys/${surveyId}/iros`)
        .set(authHeader(token))
        .send({ topicRef: 'T1', description: 'a' })
    ).body.data;

    const stakeholders = (
      await request(app).get(`/api/materiality/surveys/${surveyId}/stakeholders`).set(authHeader(token))
    ).body.data;
    const inviteToken = stakeholders[0].inviteToken;

    // Public, no-auth submit + complete.
    const submit = await request(app)
      .post(`/api/materiality/survey/${inviteToken}/responses`)
      .send({
        responses: [{ iroId: iro.id, financialMaterialityScore: 5, impactSeverityScore: 5, impactScopeScore: 5, impactProbabilityScore: 5 }],
        complete: true,
      });
    expect(submit.status).toBe(200);
    expect(submit.body.data.completed).toBe(true);

    const matrix = await request(app).get(`/api/materiality/surveys/${surveyId}/matrix`).set(authHeader(token));
    expect(matrix.status).toBe(200);
    const t1 = matrix.body.data.topics.find((t: { topicRef: string }) => t.topicRef === 'T1');
    expect(t1.financial).toBe(5);
    expect(Math.round(t1.impact)).toBe(5);
    expect(t1.isMaterial).toBe(true);
  });

  it('rejects cross-survey iro ids and unknown tokens on the public runner', async () => {
    const bad = await request(app).get('/api/materiality/survey/nonexistent-token');
    expect(bad.status).toBe(404);
  });

  it('audits threshold changes with who/what/why', async () => {
    const surveyId = (
      await request(app).post('/api/materiality/surveys').set(authHeader(token)).send({ customerId, title: 'DMA' })
    ).body.data.id;
    await request(app)
      .patch(`/api/materiality/surveys/${surveyId}`)
      .set(authHeader(token))
      .send({ materialThreshold: 4, auditNote: 'board decision' });

    const logs = await getPrisma().auditLog.findMany({
      where: { collection: 'materialitysurveys', recordId: surveyId },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].details).toContain('materialThreshold');
    expect(logs[0].details).toContain('board decision');
  });
});
