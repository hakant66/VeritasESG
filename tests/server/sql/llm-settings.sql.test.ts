/**
 * Admin LLM settings on `DB_DRIVER=sql`:
 *   GET /api/admin/llm-settings
 *   PUT /api/admin/llm-settings
 *
 * Ported from the former Mongo-backed `tests/server/api/llmSettings.test.ts`.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import { makeSqlApp } from '../helpers/makeSqlApp.ts';
import {
  clearSqlTables,
  createSqlPlatformUser,
  seedSqlPlatformUser,
  tokenForSqlUser,
} from '../helpers/sqlTestHarness.ts';
import { MASKED_SECRET_PLACEHOLDER } from '../../../lib/llmSettings.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

describeSql('SQL admin LLM settings API', () => {
  let adminToken = '';

  beforeEach(async () => {
    // AI_PROVIDER is an intentional runtime override (see lib/llmSettings.ts);
    // unset it here so these tests see the documented 'gemini' default
    // regardless of the developer's local .env (e.g. AI_PROVIDER=ollama).
    vi.stubEnv('AI_PROVIDER', '');
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
    const admin = await seedSqlPlatformUser({ role: 'platform_admin' });
    adminToken = admin.token;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  describe('GET /api/admin/llm-settings', () => {
    it('requires authentication', async () => {
      const res = await request(makeSqlApp()).get('/api/admin/llm-settings');
      expect(res.status).toBe(401);
    });

    it('requires platform_admin role', async () => {
      const user = await createSqlPlatformUser({
        name: 'Consultant',
        email: 'llm-consultant@test.com',
        role: 'consultant',
      });

      const res = await request(makeSqlApp())
        .get('/api/admin/llm-settings')
        .set('Authorization', `Bearer ${tokenForSqlUser(user)}`);

      expect(res.status).toBe(403);
    });

    it('returns defaults with masked keys for admin', async () => {
      const res = await request(makeSqlApp())
        .get('/api/admin/llm-settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.activeProvider).toBe('gemini');
      expect(res.body.data.summary.textProvider).toBe('gemini');
    });
  });

  describe('PUT /api/admin/llm-settings', () => {
    it('saves provider selection and masks api key on response', async () => {
      const app = makeSqlApp();

      const put = await request(app)
        .put('/api/admin/llm-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activeProvider: 'openai',
          embeddingProvider: 'openai',
          openai: {
            apiKey: 'sk-test-secret-key-1234',
            textModel: 'gpt-4o-mini',
            embeddingModel: 'text-embedding-3-small',
            embeddingDimensions: 768,
          },
        });

      expect(put.status).toBe(200);
      expect(put.body.data.settings.activeProvider).toBe('openai');
      expect(put.body.data.settings.openai.apiKey).toContain(MASKED_SECRET_PLACEHOLDER);
      expect(put.body.data.settings.openai.apiKey.endsWith('1234')).toBe(true);

      const get = await request(app)
        .get('/api/admin/llm-settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(get.body.data.settings.openai.textModel).toBe('gpt-4o-mini');
      expect(get.body.data.settings.openai.apiKey).toContain(MASKED_SECRET_PLACEHOLDER);
    });

    it('preserves api key when client sends masked placeholder', async () => {
      const app = makeSqlApp();

      await request(app)
        .put('/api/admin/llm-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activeProvider: 'gemini',
          embeddingProvider: 'gemini',
          gemini: { apiKey: 'real-secret-key-abcd', textModel: 'gemini-2.5-flash' },
        });

      const second = await request(app)
        .put('/api/admin/llm-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activeProvider: 'gemini',
          embeddingProvider: 'gemini',
          gemini: {
            apiKey: `${MASKED_SECRET_PLACEHOLDER}abcd`,
            textModel: 'gemini-2.5-flash',
          },
        });

      expect(second.status).toBe(200);
      expect(second.body.data.summary.textConfigured).toBe(true);
    });
  });
});
