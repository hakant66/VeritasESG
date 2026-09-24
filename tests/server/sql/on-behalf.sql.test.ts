/**
 * "Submit on behalf of customer" route on `DB_DRIVER=sql`.
 *
 * Ported from the former Mongo-backed `tests/server/api/onBehalf.test.ts`.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import { makeSqlApp } from '../helpers/makeSqlApp.ts';
import {
  clearSqlTables,
  createSqlCustomer,
  createSqlPlatformUser,
  createSqlProject,
  createSqlProjectQuestion,
  createSqlProjectUserAssignment,
  tokenForSqlUser,
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

const ROUTE = (projectId: string, questionId: string) =>
  `/api/projects/${projectId}/questions/${questionId}/on-behalf-response`;

/** Valid body that satisfies the route's name/email/answer validation. */
const validBody = {
  customerName: 'Jane Customer',
  customerEmail: 'jane@customer.example.com',
  answerText: 'This is the answer submitted on behalf of the customer.',
};

let emailCounter = 0;

async function createActor(role: string) {
  emailCounter += 1;
  return createSqlPlatformUser({
    name: `Actor ${emailCounter}`,
    email: `on-behalf-actor-${emailCounter}@example.com`,
    role,
  });
}

async function seedProject() {
  const customer = await createSqlCustomer({ name: 'Acme Corp', sectorIds: ['sector-1'] });
  const project = await createSqlProject({
    name: 'ESG Reporting 2026',
    customerId: customer.id,
  });
  const question = await createSqlProjectQuestion({ projectId: project.id, kod: 'Q1' });
  return { customer, project, question };
}

describeSql('SQL on-behalf response API', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const { project, question } = await seedProject();
    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .send(validBody);
    expect(res.status).toBe(401);
  });

  it('allows a platform_admin regardless of project assignment', async () => {
    const { project, question } = await seedProject();
    const admin = await createActor('platform_admin');

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(admin)}`)
      .send(validBody);
    expect(res.status).toBe(200);
  });

  it('allows a consultant_manager', async () => {
    const { project, question } = await seedProject();
    const manager = await createActor('consultant_manager');

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(manager)}`)
      .send(validBody);
    expect(res.status).toBe(200);
  });

  it('forbids an auditor', async () => {
    const { project, question } = await seedProject();
    const auditor = await createActor('auditor');

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(auditor)}`)
      .send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('on-behalf/forbidden');
  });

  it('allows a consultant with an admin project assignment', async () => {
    const { project, question } = await seedProject();
    const consultant = await createActor('consultant');
    await createSqlProjectUserAssignment({
      projectId: project.id,
      userId: consultant.id,
      role: 'admin',
    });

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(consultant)}`)
      .send(validBody);
    expect(res.status).toBe(200);
  });

  it('allows a consultant with an editor project assignment', async () => {
    const { project, question } = await seedProject();
    const consultant = await createActor('consultant');
    await createSqlProjectUserAssignment({
      projectId: project.id,
      userId: consultant.id,
      role: 'editor',
    });

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(consultant)}`)
      .send(validBody);
    expect(res.status).toBe(200);
  });

  it('forbids a consultant with no project assignment', async () => {
    const { project, question } = await seedProject();
    const consultant = await createActor('consultant');

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(consultant)}`)
      .send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('on-behalf/forbidden');
  });

  it('returns 400 when required body fields are missing', async () => {
    const { project, question } = await seedProject();
    const admin = await createActor('platform_admin');

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(admin)}`)
      .send({ customerName: 'Only A Name' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('on-behalf/validation');
  });

  it('persists the answer, contact, and customer platform user on success', async () => {
    const { project, question } = await seedProject();
    const admin = await createActor('platform_admin');

    const res = await request(makeSqlApp())
      .post(ROUTE(project.id, question.id))
      .set('Authorization', `Bearer ${tokenForSqlUser(admin)}`)
      .send(validBody);
    expect(res.status).toBe(200);

    const contact = await getPrisma().contact.findFirst({
      where: { email: validBody.customerEmail },
    });
    expect(contact).toBeTruthy();

    const customerUser = await getPrisma().platformUser.findUnique({
      where: { email: validBody.customerEmail },
    });
    expect(customerUser?.role).toBe('customer');

    const answer = await getPrisma().answer.findFirst({
      where: { projectId: project.id, questionId: question.id },
    });
    expect(answer?.latestAnswer).toBe(validBody.answerText);
    expect(answer?.workflowStatus).toBe('customer_responded');
    expect(answer?.submittedByUserId).toBe(admin.id);
  });
});
