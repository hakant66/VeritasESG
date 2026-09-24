/**
 * Generic `/api/db/*` contract tests against `DB_DRIVER=sql` (Testcontainers Postgres).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import { makeSqlApp } from '../helpers/makeSqlApp.ts';
import {
  authHeader,
  clearSqlTables,
  countAnswers,
  countCustomers,
  createSqlAnswer,
  createSqlAuditLogs,
  createSqlContact,
  createSqlCustomer,
  createSqlPlatformUser,
  createSqlProject,
  findCustomerById,
  findCustomerByLegacyId,
  seedSqlPlatformUser,
  SQL_TEST_USER_ID,
  sqlTestsSkipReason,
} from '../helpers/sqlTestHarness.ts';
import { signTestToken } from '../helpers/testJwt.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean; reason?: string })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

describeSql('SQL generic API (/api/db)', () => {
  let authToken = '';

  beforeAll(() => {
    if (sqlState.skipped) {
      console.warn('[sql-tests] Skipped:', sqlState.reason ?? sqlTestsSkipReason());
    }
  });

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

  // ---------------------------------------------------------------------------
  // GET list
  // ---------------------------------------------------------------------------
  describe('GET /api/db/:resource', () => {
    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp())
        .get('/api/db/not-a-resource')
        .set(authHeader(authToken));
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('returns an empty array when the table is empty', async () => {
      const res = await request(makeSqlApp())
        .get('/api/db/customers')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('serializes documents with id (not _id) and strips passwordHash', async () => {
      await createSqlCustomer({ name: 'Acme', sectorIds: ['s1'] });
      await createSqlPlatformUser({
        name: 'Admin',
        email: 'admin@example.com',
        role: 'platform_admin',
        passwordHash: 'hashed',
      });

      const customers = await request(makeSqlApp())
        .get('/api/db/customers')
        .set(authHeader(authToken));
      expect(customers.status).toBe(200);
      expect(customers.body.data[0].id).toBeTruthy();
      expect(customers.body.data[0]._id).toBeUndefined();

      const users = await request(makeSqlApp())
        .get('/api/db/platformUsers')
        .set(authHeader(authToken));
      expect(users.status).toBe(200);
      expect(users.body.data[0].passwordHash).toBeUndefined();
    });

    it('returns items and total when countTotal=true', async () => {
      await createSqlCustomer({ name: 'A' });
      await createSqlCustomer({ name: 'B' });

      const res = await request(makeSqlApp())
        .get('/api/db/customers?countTotal=true')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });

    it('respects limit and ids filters', async () => {
      const a = await createSqlCustomer({ name: 'A' });
      const b = await createSqlCustomer({ name: 'B' });
      await createSqlCustomer({ name: 'C' });

      const limited = await request(makeSqlApp())
        .get('/api/db/customers?limit=2')
        .set(authHeader(authToken));
      expect(limited.status).toBe(200);
      expect(limited.body.data).toHaveLength(2);

      const filtered = await request(makeSqlApp())
        .get(`/api/db/customers?ids=${a.id},${b.id}`)
        .set(authHeader(authToken));
      expect(filtered.status).toBe(200);
      expect(filtered.body.data).toHaveLength(2);
      const names = filtered.body.data.map((d: { name: string }) => d.name).sort();
      expect(names).toEqual(['A', 'B']);
    });

    it('returns 401 without a bearer token', async () => {
      const res = await request(makeSqlApp()).get('/api/db/customers');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/missing-token');
    });

    it('respects the skip query parameter for pagination', async () => {
      for (let i = 1; i <= 3; i += 1) {
        await createSqlCustomer({ name: `Customer ${i}` });
      }

      const res = await request(makeSqlApp())
        .get('/api/db/customers?skip=1&limit=10')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // requireAuth gate (`/api/db` middleware)
  // ---------------------------------------------------------------------------
  describe('requireAuth middleware', () => {
    it('returns 401 auth/missing-token when no token is provided', async () => {
      const res = await request(makeSqlApp({ requireAuth: true })).get('/api/db/customers');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/missing-token');
    });

    it('returns 401 auth/invalid-token for a malformed token', async () => {
      const res = await request(makeSqlApp({ requireAuth: true }))
        .get('/api/db/customers')
        .set('Authorization', 'Bearer not.a.valid.token');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/invalid-token');
    });

    it('allows GET with a valid session token', async () => {
      const res = await request(makeSqlApp({ requireAuth: true }))
        .get('/api/db/customers')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
    });

    it('returns 401 for POST without a token', async () => {
      const res = await request(makeSqlApp({ requireAuth: true }))
        .post('/api/db/customers')
        .send({ name: 'Test', sectorIds: ['s1'] });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth/missing-token');
    });

    it('allows POST with a valid session token', async () => {
      const res = await request(makeSqlApp({ requireAuth: true }))
        .post('/api/db/customers')
        .set(authHeader(authToken))
        .send({ name: 'Auth Customer', sectorIds: ['s1'] });
      expect([200, 201]).toContain(res.status);
      expect(res.body.data.name).toBe('Auth Customer');
    });
  });

  // ---------------------------------------------------------------------------
  // GET by id
  // ---------------------------------------------------------------------------
  describe('GET /api/db/:resource/:id', () => {
    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp()).get('/api/db/not-a-resource/someid');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('strips passwordHash from platformUsers', async () => {
      const user = await createSqlPlatformUser({
        name: 'Admin',
        email: 'strip-hash@example.com',
        role: 'platform_admin',
        passwordHash: 'hashed',
      });

      const res = await request(makeSqlApp()).get(`/api/db/platformUsers/${user.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.email).toBe('strip-hash@example.com');
    });

    it('returns 404 when the document does not exist', async () => {
      const res = await request(makeSqlApp()).get('/api/db/customers/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/not-found');
    });

    it('returns the document by id', async () => {
      const doc = await createSqlCustomer({ name: 'Acme' });
      const res = await request(makeSqlApp()).get(`/api/db/customers/${doc.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(doc.id);
      expect(res.body.data.name).toBe('Acme');
    });

    it('resolves by legacyFirebaseId', async () => {
      const doc = await createSqlCustomer({
        name: 'Legacy Corp',
        legacyFirebaseId: 'firebase-id-abc',
      });
      const res = await request(makeSqlApp()).get('/api/db/customers/firebase-id-abc');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(doc.id);
    });
  });

  // ---------------------------------------------------------------------------
  // POST create
  // ---------------------------------------------------------------------------
  describe('POST /api/db/:resource', () => {
    it('creates a document and returns id (not _id)', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers')
        .set(authHeader(authToken))
        .send({ name: 'New Customer', sectorIds: ['s1'] });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.id).toBeTruthy();
      expect(res.body.data._id).toBeUndefined();
      expect(res.body.data.name).toBe('New Customer');
    });

    it('sets createdBy from JWT uid', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers')
        .set(authHeader(authToken))
        .send({ name: 'Owned', sectorIds: ['s1'] });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.createdBy).toBe(SQL_TEST_USER_ID);
    });

    it('returns 400 for invalid platform role', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/platformUsers')
        .set(authHeader(authToken))
        .send({
          name: 'Bad Role',
          email: 'badrole@example.com',
          role: 'not-a-real-role',
          department: 'Management',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/validation-error');
    });

    it('returns 400 when required customer name is missing', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers')
        .set(authHeader(authToken))
        .send({ sectorIds: ['s1'] });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/validation-error');
    });

    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/not-a-resource')
        .set(authHeader(authToken))
        .send({ name: 'X' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('strips reserved fields (id, _id, __v) from the request body', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers')
        .set(authHeader(authToken))
        .send({
          id: 'should-be-ignored',
          _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          __v: 99,
          name: 'Clean Customer',
          sectorIds: ['s1'],
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.id).not.toBe('should-be-ignored');
      expect(res.body.data._id).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH / DELETE / PUT
  // ---------------------------------------------------------------------------
  describe('PATCH /api/db/:resource/:id', () => {
    it('partially updates an existing document', async () => {
      const doc = await createSqlCustomer({ name: 'Old Name' });
      const res = await request(makeSqlApp())
        .patch(`/api/db/customers/${doc.id}`)
        .set(authHeader(authToken))
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.id).toBe(doc.id);
    });

    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp())
        .patch('/api/db/not-a-resource/someid')
        .set(authHeader(authToken))
        .send({ name: 'X' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('returns 404 when the document does not exist', async () => {
      const res = await request(makeSqlApp())
        .patch('/api/db/customers/does-not-exist')
        .set(authHeader(authToken))
        .send({ name: 'Ghost' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/not-found');
    });

    it('returns 400 for an invalid platform role', async () => {
      const user = await createSqlPlatformUser({
        name: 'User',
        email: 'patch-role@example.com',
        role: 'consultant',
      });

      const res = await request(makeSqlApp())
        .patch(`/api/db/platformUsers/${user.id}`)
        .set(authHeader(authToken))
        .send({ role: 'not-a-real-role' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/validation-error');
    });

    it('updates a platform role when a valid role is provided', async () => {
      const user = await createSqlPlatformUser({
        name: 'User',
        email: 'patch-role-ok@example.com',
        role: 'consultant',
      });

      const res = await request(makeSqlApp())
        .patch(`/api/db/platformUsers/${user.id}`)
        .set(authHeader(authToken))
        .send({ role: 'platform_admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('platform_admin');
    });
  });

  describe('DELETE /api/db/:resource/:id', () => {
    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp())
        .delete('/api/db/not-a-resource/someid')
        .set(authHeader(authToken));
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('returns 404 when the document does not exist', async () => {
      const res = await request(makeSqlApp())
        .delete('/api/db/customers/does-not-exist')
        .set(authHeader(authToken));
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/not-found');
    });

    it('deletes a document and returns its id', async () => {
      const doc = await createSqlCustomer({ name: 'To Delete' });
      const res = await request(makeSqlApp())
        .delete(`/api/db/customers/${doc.id}`)
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(doc.id);
      expect(await findCustomerById(doc.id)).toBeNull();
    });

    it('deletes by legacyFirebaseId', async () => {
      const doc = await createSqlCustomer({
        name: 'Legacy',
        legacyFirebaseId: 'fb-del-1',
      });
      const res = await request(makeSqlApp())
        .delete('/api/db/customers/fb-del-1')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(await findCustomerById(doc.id)).toBeNull();
    });
  });

  describe('PUT /api/db/:resource/:id (legacy upsert)', () => {
    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp())
        .put('/api/db/not-a-resource/fb-id-1')
        .set(authHeader(authToken))
        .send({ name: 'X', sectorIds: ['s1'] });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('creates when legacyFirebaseId is new', async () => {
      const res = await request(makeSqlApp())
        .put('/api/db/customers/fb-new-1')
        .set(authHeader(authToken))
        .send({ name: 'Upserted', sectorIds: ['s1'] });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Upserted');
      expect(await findCustomerByLegacyId('fb-new-1')).toBeTruthy();
    });

    it('updates when legacyFirebaseId exists', async () => {
      await createSqlCustomer({
        name: 'Original',
        legacyFirebaseId: 'fb-existing-1',
      });

      const res = await request(makeSqlApp())
        .put('/api/db/customers/fb-existing-1')
        .set(authHeader(authToken))
        .send({ name: 'Updated', sectorIds: ['s1'] });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated');
      const rows = await findCustomerByLegacyId('fb-existing-1');
      expect(rows?.name).toBe('Updated');
    });
  });

  // ---------------------------------------------------------------------------
  // Bulk + filters
  // ---------------------------------------------------------------------------
  describe('POST /api/db/:resource/bulk', () => {
    it('inserts multiple documents', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers/bulk')
        .set(authHeader(authToken))
        .send({
          items: [
            { name: 'Alpha', sectorIds: ['s1'] },
            { name: 'Beta', sectorIds: ['s2'] },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(2);
      expect(await countCustomers()).toBe(2);
    });

    it('returns 404 for an unknown resource', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/not-a-resource/bulk')
        .set(authHeader(authToken))
        .send({ items: [{ name: 'X' }] });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/unknown-resource');
    });

    it('returns 400 when items is not an array', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers/bulk')
        .set(authHeader(authToken))
        .send({ items: 'not-an-array' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/invalid-bulk');
    });

    it('returns 400 when the items key is absent', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers/bulk')
        .set(authHeader(authToken))
        .send({ name: 'Oops' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/invalid-bulk');
    });

    it('serializes inserted documents with id (not _id)', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/customers/bulk')
        .set(authHeader(authToken))
        .send({ items: [{ name: 'X', sectorIds: ['s1'] }] });

      expect(res.status).toBe(201);
      expect(res.body.data[0].id).toBeTruthy();
      expect(res.body.data[0]._id).toBeUndefined();
    });

    it('sets createdBy from the Bearer JWT uid', async () => {
      const token = signTestToken({ uid: 'bulk-creator', sub: 'bulk-creator' });

      const res = await request(makeSqlApp())
        .post('/api/db/customers/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ name: 'Attributed', sectorIds: ['s1'] }] });

      expect(res.status).toBe(201);
      expect(res.body.data[0].createdBy).toBe('bulk-creator');
    });

    it('returns 400 for a validation error inside bulk items', async () => {
      // `name` is required on customers; omitting it must not surface as a 500.
      const res = await request(makeSqlApp())
        .post('/api/db/customers/bulk')
        .set(authHeader(authToken))
        .send({ items: [{ sectorIds: ['s1'] }] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/db/:resource — query filters', () => {
    it('filters projects by customerId', async () => {
      await createSqlProject({ name: 'P1', customerId: 'c1' });
      await createSqlProject({ name: 'P2', customerId: 'c2' });

      const res = await request(makeSqlApp())
        .get('/api/db/projects?customerId=c1')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('P1');
    });

    it('filters auditLogs by timestampGte', async () => {
      const base = {
        userId: 'u1',
        userName: 'Tester',
        userEmail: 'tester@example.com',
        action: 'update',
        collection: 'customers',
        recordId: 'rec-1',
        details: 'test audit entry',
      };
      const past = new Date(Date.now() - 60_000);
      const future = new Date(Date.now() + 60_000);
      await createSqlAuditLogs([
        { ...base, timestamp: past },
        { ...base, timestamp: future },
      ]);

      const sinceMs = Date.now().toString();
      const res = await request(makeSqlApp())
        .get(`/api/db/auditLogs?timestampGte=${sinceMs}`)
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(typeof res.body.data[0].timestamp).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Contact email conflict
  // ---------------------------------------------------------------------------
  describe('contacts email conflict', () => {
    it('POST returns db/email-conflict when email is used by platform user', async () => {
      const customer = await createSqlCustomer({ name: 'Acme' });
      await createSqlPlatformUser({
        name: 'Existing',
        email: 'conflict@example.com',
        role: 'customer',
        customerId: customer.id,
      });

      const res = await request(makeSqlApp())
        .post('/api/db/contacts')
        .set(authHeader(authToken))
        .send({
          name: 'New Contact',
          email: 'conflict@example.com',
          customerId: customer.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/email-conflict');
    });

    it('PATCH returns db/email-conflict when email is taken', async () => {
      const customer = await createSqlCustomer({ name: 'Acme' });
      const contact = await createSqlContact({
        name: 'Jane',
        email: 'jane@example.com',
        customerId: customer.id,
      });
      await createSqlPlatformUser({
        name: 'Conflict User',
        email: 'taken@example.com',
        role: 'customer',
        customerId: customer.id,
      });

      const res = await request(makeSqlApp())
        .patch(`/api/db/contacts/${contact.id}`)
        .set(authHeader(authToken))
        .send({ email: 'taken@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/email-conflict');
    });
  });

  // ---------------------------------------------------------------------------
  // Answers upsert
  // ---------------------------------------------------------------------------
  describe('PUT /api/db/answers/upsert', () => {
    const BASE_UPSERT = {
      projectId: 'proj-1',
      questionId: 'q-1',
      contactId: 'contact-1',
      assignmentId: 'assign-1',
      latestAnswer: 'Our scope-1 emissions are 100t CO2.',
    };

    it('returns 400 when required fields are missing', async () => {
      const res = await request(makeSqlApp())
        .put('/api/db/answers/upsert')
        .send({ projectId: 'proj-1' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/validation-error');
    });

    it('creates an answer when none exists', async () => {
      const res = await request(makeSqlApp())
        .put('/api/db/answers/upsert')
        .send(BASE_UPSERT);

      expect(res.status).toBe(200);
      expect(res.body.data.projectId).toBe('proj-1');
      expect(
        await countAnswers({
          projectId: 'proj-1',
          questionId: 'q-1',
          contactId: 'contact-1',
        }),
      ).toBe(1);
    });

    it('updates without creating a duplicate', async () => {
      await request(makeSqlApp()).put('/api/db/answers/upsert').send(BASE_UPSERT);

      const res = await request(makeSqlApp())
        .put('/api/db/answers/upsert')
        .send({ ...BASE_UPSERT, latestAnswer: 'Updated answer text.' });

      expect(res.status).toBe(200);
      expect(res.body.data.latestAnswer).toBe('Updated answer text.');
      expect(
        await countAnswers({
          projectId: 'proj-1',
          questionId: 'q-1',
          contactId: 'contact-1',
        }),
      ).toBe(1);
    });

    it('serializes id as legacyFirebaseId when present', async () => {
      await createSqlAnswer({
        ...BASE_UPSERT,
        legacyFirebaseId: 'contact-1_q-1',
      });

      const res = await request(makeSqlApp())
        .put('/api/db/answers/upsert')
        .send({ ...BASE_UPSERT, latestAnswer: 'Patched via upsert' });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('contact-1_q-1');
    });
  });

  // ---------------------------------------------------------------------------
  // Date serialization
  // ---------------------------------------------------------------------------
  describe('date serialization', () => {
    it('serializes Date fields as millisecond timestamps', async () => {
      await request(makeSqlApp())
        .post('/api/db/customers')
        .set(authHeader(authToken))
        .send({ name: 'TS Corp', sectorIds: ['s1'] });

      const res = await request(makeSqlApp())
        .get('/api/db/customers')
        .set(authHeader(authToken));
      expect(res.status).toBe(200);
      expect(typeof res.body.data[0].createdAt).toBe('number');
      expect(typeof res.body.data[0].updatedAt).toBe('number');
    });
  });
});
