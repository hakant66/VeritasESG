/**
 * App settings routes on SQL (`/api/settings/:key` via mongoApi seam).
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

describeSql('SQL settings API', () => {
  let authToken = '';

  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
    const auth = await seedSqlPlatformUser({ role: 'platform_admin' });
    authToken = auth.token;
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('returns empty object for an unset key', async () => {
    const res = await request(makeSqlApp()).get('/api/settings/feature-flags');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({});
  });

  it('persists settings via PUT and reads them back', async () => {
    const app = makeSqlApp();
    const putRes = await request(app)
      .put('/api/settings/ui-config')
      .set(authHeader(authToken))
      .send({ theme: 'dark', language: 'en' });
    expect(putRes.status).toBe(200);

    const res = await request(app).get('/api/settings/ui-config');
    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe('dark');
    expect(res.body.data.language).toBe('en');
  });

  it('overwrites on second PUT', async () => {
    const app = makeSqlApp();
    await request(app)
      .put('/api/settings/ui-config')
      .set(authHeader(authToken))
      .send({ theme: 'dark' });
    await request(app)
      .put('/api/settings/ui-config')
      .set(authHeader(authToken))
      .send({ theme: 'light', language: 'tr' });

    const res = await request(app).get('/api/settings/ui-config');
    expect(res.body.data).toEqual({ theme: 'light', language: 'tr' });
  });

  it('strips reserved fields (id, _id, __v) from the stored data', async () => {
    const app = makeSqlApp();
    const res = await request(app)
      .put('/api/settings/clean-key')
      .set(authHeader(authToken))
      .send({ id: 'injected', _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', __v: 9, value: 42 });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBeUndefined();
    expect(res.body.data._id).toBeUndefined();
    expect(res.body.data.value).toBe(42);
  });

  it('isolates different keys from each other', async () => {
    const app = makeSqlApp();
    await request(app).put('/api/settings/key-a').set(authHeader(authToken)).send({ x: 1 });
    await request(app).put('/api/settings/key-b').set(authHeader(authToken)).send({ y: 2 });

    const a = await request(app).get('/api/settings/key-a');
    const b = await request(app).get('/api/settings/key-b');

    expect(a.body.data).toEqual({ x: 1 });
    expect(b.body.data).toEqual({ y: 2 });
  });

  it('requires platform_admin for PUT', async () => {
    const res = await request(makeSqlApp())
      .put('/api/settings/ui-config')
      .send({ theme: 'dark' });
    expect(res.status).toBe(401);
  });

  it('stores rows in app_settings table', async () => {
    await request(makeSqlApp())
      .put('/api/settings/persist-key')
      .set(authHeader(authToken))
      .send({ value: 42 });

    const count = await getPrisma().appSetting.count({ where: { key: 'persist-key' } });
    expect(count).toBe(1);
  });
});
