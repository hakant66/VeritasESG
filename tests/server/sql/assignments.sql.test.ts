/**
 * Quick-assignment and merge-assignments on SQL.
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
  countAssignments,
  createSqlAssignment,
  createSqlContact,
  createSqlCustomer,
  createSqlProject,
  createSqlProjectQuestion,
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

describeSql('SQL assignment workflow API', () => {
  let authToken = '';
  let projectId = '';
  let questionId = '';
  let contactId = '';

  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
    const auth = await seedSqlPlatformUser();
    authToken = auth.token;

    const customer = await createSqlCustomer({ name: 'Acme' });
    const project = await createSqlProject({ name: 'P1', customerId: customer.id });
    projectId = project.id;
    const question = await createSqlProjectQuestion({
      projectId,
      id: 'pq-1',
      kod: 'E1.1',
    });
    questionId = question.id;
    const contact = await createSqlContact({
      name: 'Jane',
      email: 'jane@acme.com',
      customerId: customer.id,
    });
    contactId = contact.id;
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  describe('POST /api/projects/:projectId/quick-assignment', () => {
    it('returns 401 without auth', async () => {
      const res = await request(makeSqlApp())
        .post(`/api/projects/${projectId}/quick-assignment`)
        .send({ questionId, recipientId: contactId, recipientType: 'contact' });
      expect(res.status).toBe(401);
    });

    it('creates an open assignment', async () => {
      const res = await request(makeSqlApp())
        .post(`/api/projects/${projectId}/quick-assignment`)
        .set(authHeader(authToken))
        .send({ questionId, recipientId: contactId, recipientType: 'contact' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignmentId).toBeTruthy();
      expect(await countAssignments(projectId)).toBe(1);

      const row = await getPrisma().assignment.findUnique({
        where: { id: res.body.assignmentId },
      });
      expect(row?.sentAt).toBeNull();
      expect(row?.deadline).toBeNull();
      expect(row?.questionIds).toEqual([questionId]);
    });

    it('rejects duplicate open assignment for same recipient/question', async () => {
      const app = makeSqlApp();
      await request(app)
        .post(`/api/projects/${projectId}/quick-assignment`)
        .set(authHeader(authToken))
        .send({ questionId, recipientId: contactId, recipientType: 'contact' });

      const res = await request(app)
        .post(`/api/projects/${projectId}/quick-assignment`)
        .set(authHeader(authToken))
        .send({ questionId, recipientId: contactId, recipientType: 'contact' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('açık bir atama');
    });

    it('rejects invalid question for project', async () => {
      const res = await request(makeSqlApp())
        .post(`/api/projects/${projectId}/quick-assignment`)
        .set(authHeader(authToken))
        .send({ questionId: 'bad-q', recipientId: contactId, recipientType: 'contact' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/projects/:projectId/quick-assignment/:assignmentId', () => {
    it('updates recipient on an open assignment', async () => {
      const customer = await createSqlCustomer({ name: 'Other' });
      const otherContact = await createSqlContact({
        name: 'Bob',
        email: 'bob@other.com',
        customerId: customer.id,
      });

      const created = await createSqlAssignment({
        projectId,
        recipientId: contactId,
        recipientType: 'contact',
        questionIds: [questionId],
      });

      const res = await request(makeSqlApp())
        .patch(`/api/projects/${projectId}/quick-assignment/${created.id}`)
        .set(authHeader(authToken))
        .send({ recipientId: otherContact.id, recipientType: 'contact' });

      expect(res.status).toBe(200);
      const updated = await getPrisma().assignment.findUnique({ where: { id: created.id } });
      expect(updated?.recipientId).toBe(otherContact.id);
    });

    it('rejects patch when assignment has been sent', async () => {
      const created = await createSqlAssignment({
        projectId,
        recipientId: contactId,
        recipientType: 'contact',
        questionIds: [questionId],
        sentAt: new Date(),
      });

      const res = await request(makeSqlApp())
        .patch(`/api/projects/${projectId}/quick-assignment/${created.id}`)
        .set(authHeader(authToken))
        .send({ recipientId: 'other', recipientType: 'contact' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('açık atamalar');
    });
  });

  describe('POST /api/projects/:projectId/merge-assignments', () => {
    it('merges assignments into one and deletes sources', async () => {
      const q2 = await createSqlProjectQuestion({
        projectId,
        id: 'pq-2',
        kod: 'E1.2',
      });

      const a1 = await createSqlAssignment({
        projectId,
        recipientId: contactId,
        recipientType: 'contact',
        questionIds: [questionId],
      });
      const a2 = await createSqlAssignment({
        projectId,
        recipientId: contactId,
        recipientType: 'contact',
        questionIds: [q2.id],
      });

      const res = await request(makeSqlApp())
        .post(`/api/projects/${projectId}/merge-assignments`)
        .set(authHeader(authToken))
        .send({
          assignmentIds: [a1.id, a2.id],
          beginDate: new Date().toISOString(),
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          message: 'Merged test',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignmentId).toBeTruthy();

      expect(await getPrisma().assignment.count({ where: { id: { in: [a1.id, a2.id] } } })).toBe(0);
      expect(await countAssignments(projectId)).toBe(1);

      const merged = await getPrisma().assignment.findUnique({
        where: { id: res.body.assignmentId },
      });
      expect(merged?.questionIds).toEqual(expect.arrayContaining([questionId, q2.id]));
      expect(merged?.sentAt).toBeInstanceOf(Date);
      expect(merged?.deadline).toBeInstanceOf(Date);
    });
  });
});
