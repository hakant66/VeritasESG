/**
 * Customer-facing API on SQL (`/api/v1/customer/*`).
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
  createSqlAnswer,
  createSqlCustomer,
  createSqlProject,
  SQL_TEST_API_KEY,
} from '../helpers/sqlTestHarness.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

function apiKeyHeader() {
  return { 'x-api-key': SQL_TEST_API_KEY };
}

describeSql('SQL customer API', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('rejects requests without x-api-key', async () => {
    const res = await request(makeSqlApp()).get('/api/v1/customer/customers');
    expect(res.status).toBe(401);
  });

  it('lists customers', async () => {
    await createSqlCustomer({ name: 'Acme Corp', sectorIds: ['s1'] });
    await createSqlCustomer({ name: 'Beta Ltd' });

    const res = await request(makeSqlApp())
      .get('/api/v1/customer/customers')
      .set(apiKeyHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.customers[0]).toMatchObject({
      name: expect.any(String),
      id: expect.any(String),
      sectorIds: expect.any(Array),
    });
  });

  it('lists projects for a customer', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });
    await createSqlProject({ name: 'Project Alpha', customerId: customer.id });

    const res = await request(makeSqlApp())
      .get(`/api/v1/customer/projects?customerId=${customer.id}`)
      .set(apiKeyHeader());

    expect(res.status).toBe(200);
    expect(res.body.projectCount).toBe(1);
    expect(res.body.projects[0].name).toBe('Project Alpha');
    expect(res.body.customer.id).toBe(customer.id);
  });

  it('returns 404 for unknown customer', async () => {
    const res = await request(makeSqlApp())
      .get('/api/v1/customer/projects?customerId=missing-id')
      .set(apiKeyHeader());
    expect(res.status).toBe(404);
  });

  it('returns project submissions by name', async () => {
    const customer = await createSqlCustomer({ name: 'Acme' });
    const project = await createSqlProject({ name: 'ESG Report 2025', customerId: customer.id });
    await createSqlAnswer({
      projectId: project.id,
      questionId: 'q-1',
      contactId: 'c-1',
      assignmentId: 'a-1',
      latestAnswer: 'Yes, we track emissions.',
    });

    const res = await request(makeSqlApp())
      .get('/api/v1/customer/project-data?projectName=ESG%20Report%202025')
      .set(apiKeyHeader());

    expect(res.status).toBe(200);
    expect(res.body.dataCount).toBe(1);
    expect(res.body.submissions[0].latestAnswer).toBe('Yes, we track emissions.');
    expect(res.body.project.name).toBe('ESG Report 2025');
  });
});
