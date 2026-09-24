/**
 * POST /api/db/projects/create-from-template on `DB_DRIVER=sql`.
 *
 * Ported from the former Mongo-backed `tests/server/api/projects.create.test.ts`.
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
  countProjectUserAssignments,
  createSqlCustomer,
  findProjectById,
  findProjectUserAssignment,
  seedSqlPlatformUser,
} from '../helpers/sqlTestHarness.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

describeSql('SQL POST /api/db/projects/create-from-template', () => {
  let authToken = '';

  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
    const auth = await seedSqlPlatformUser();
    authToken = auth.token;
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('returns 400 when customerId is missing', async () => {
    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({ name: 'ESG 2026' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('projects/missing-data');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({ customerId: 'cust-1' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('projects/missing-data');
  });

  it('creates a project with defaults and returns its id', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });

    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({ customerId: customer.id, name: 'ESG 2026' });

    expect(res.status).toBe(201);
    expect(typeof res.body.data.id).toBe('string');

    const project = await findProjectById(res.body.data.id);
    expect(project).toBeTruthy();
    expect(project?.name).toBe('ESG 2026');
    expect(project?.category).toBe('Project');
    expect(project?.status).toBe('active');
    expect(project?.allowMultipleAssignments).toBe(false);
  });

  it('respects the Service category', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });

    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({ customerId: customer.id, name: 'Service 2026', category: 'Service' });

    expect(res.status).toBe(201);
    const project = await findProjectById(res.body.data.id);
    expect(project?.category).toBe('Service');
  });

  it('creates a ProjectUserAssignment as admin when creatorId is provided', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });

    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({ customerId: customer.id, name: 'My Project', creatorId: 'user-abc' });

    expect(res.status).toBe(201);
    const assignment = await findProjectUserAssignment({
      projectId: res.body.data.id,
      userId: 'user-abc',
    });
    expect(assignment).toBeTruthy();
    expect(assignment?.role).toBe('admin');
  });

  it('does not create a ProjectUserAssignment when creatorId is absent', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });

    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({ customerId: customer.id, name: 'Solo Project' });

    expect(res.status).toBe(201);
    expect(await countProjectUserAssignments(res.body.data.id)).toBe(0);
  });

  it('respects allowMultipleAssignments when set to true', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });

    const res = await request(makeSqlApp())
      .post('/api/db/projects/create-from-template')
      .set(authHeader(authToken))
      .send({
        customerId: customer.id,
        name: 'Multi-Assign',
        allowMultipleAssignments: true,
      });

    expect(res.status).toBe(201);
    const project = await findProjectById(res.body.data.id);
    expect(project?.allowMultipleAssignments).toBe(true);
  });
});
