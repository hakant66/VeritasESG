/**
 * Answer note/comment routes on `DB_DRIVER=sql`:
 *   POST /api/db/answers/:answerId/assignee-notes
 *   POST /api/db/answers/:answerId/review-comments
 *
 * Ported from the former Mongo-backed `tests/server/api/db.answers.test.ts`.
 * (The `PUT /api/db/answers/upsert` cases already live in `db.api.test.ts`.)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import request from 'supertest';
import { makeSqlApp } from '../helpers/makeSqlApp.ts';
import { clearSqlTables, createSqlAnswer } from '../helpers/sqlTestHarness.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

const BASE_ANSWER = {
  projectId: 'proj-1',
  questionId: 'q-1',
  contactId: 'contact-1',
  assignmentId: 'assign-1',
  latestAnswer: 'Our scope-1 emissions are 100t CO2.',
};

const LEGACY_ID = `${BASE_ANSWER.contactId}_${BASE_ANSWER.questionId}`;

function seedAnswer() {
  return createSqlAnswer({ ...BASE_ANSWER, legacyFirebaseId: LEGACY_ID });
}

describeSql('SQL answer notes & review comments', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  describe('POST /api/db/answers/:answerId/assignee-notes', () => {
    it('returns 400 when text is missing', async () => {
      const answer = await seedAnswer();

      const res = await request(makeSqlApp())
        .post(`/api/db/answers/${answer.id}/assignee-notes`)
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/validation-error');
    });

    it('returns 404 for a non-existent answer', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/answers/no-such-answer/assignee-notes')
        .send({ text: 'hello' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/not-found');
    });

    it('appends a note and returns the updated answer', async () => {
      const answer = await seedAnswer();

      const res = await request(makeSqlApp())
        .post(`/api/db/answers/${answer.id}/assignee-notes`)
        .send({ text: 'Please clarify your scope 2.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const notes = res.body.data.answerNotes as Array<{ text: string; id: string }>;
      expect(notes).toHaveLength(1);
      expect(notes[0].text).toBe('Please clarify your scope 2.');
      expect(typeof notes[0].id).toBe('string');
    });

    it('appends a second note after the first', async () => {
      const answer = await seedAnswer();
      const app = makeSqlApp();
      await request(app)
        .post(`/api/db/answers/${answer.id}/assignee-notes`)
        .send({ text: 'Note 1' });

      const res = await request(app)
        .post(`/api/db/answers/${answer.id}/assignee-notes`)
        .send({ text: 'Note 2' });

      expect(res.status).toBe(200);
      const notes = res.body.data.answerNotes as Array<{ text: string }>;
      expect(notes).toHaveLength(2);
      expect(notes[1].text).toBe('Note 2');
    });

    it('resolves by legacyFirebaseId', async () => {
      await seedAnswer();

      const res = await request(makeSqlApp())
        .post(`/api/db/answers/${LEGACY_ID}/assignee-notes`)
        .send({ text: 'Legacy ref note' });

      expect(res.status).toBe(200);
      expect(res.body.data.answerNotes).toHaveLength(1);
    });
  });

  describe('POST /api/db/answers/:answerId/review-comments', () => {
    it('returns 400 when text is missing', async () => {
      const answer = await seedAnswer();

      const res = await request(makeSqlApp())
        .post(`/api/db/answers/${answer.id}/review-comments`)
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('db/validation-error');
    });

    it('returns 404 for a non-existent answer', async () => {
      const res = await request(makeSqlApp())
        .post('/api/db/answers/no-such-answer/review-comments')
        .send({ text: 'comment' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('db/not-found');
    });

    it('appends a review comment with authorName and returns the updated answer', async () => {
      const answer = await seedAnswer();

      const res = await request(makeSqlApp())
        .post(`/api/db/answers/${answer.id}/review-comments`)
        .send({
          text: 'This looks good, approve.',
          authorId: 'user-99',
          authorName: 'Senior Consultant',
        });

      expect(res.status).toBe(200);
      const comments = res.body.data.reviewComments as Array<{
        text: string;
        authorName: string;
        id: string;
      }>;
      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe('This looks good, approve.');
      expect(comments[0].authorName).toBe('Senior Consultant');
      expect(typeof comments[0].id).toBe('string');
    });

    it('defaults authorName to "—" when not provided', async () => {
      const answer = await seedAnswer();

      const res = await request(makeSqlApp())
        .post(`/api/db/answers/${answer.id}/review-comments`)
        .send({ text: 'Anonymous comment' });

      expect(res.status).toBe(200);
      const comments = res.body.data.reviewComments as Array<{ authorName: string }>;
      expect(comments[0].authorName).toBe('—');
    });

    it('accumulates multiple review comments', async () => {
      const answer = await seedAnswer();
      const app = makeSqlApp();
      await request(app)
        .post(`/api/db/answers/${answer.id}/review-comments`)
        .send({ text: 'First' });

      const res = await request(app)
        .post(`/api/db/answers/${answer.id}/review-comments`)
        .send({ text: 'Second' });

      expect(res.status).toBe(200);
      expect(res.body.data.reviewComments).toHaveLength(2);
    });
  });
});
