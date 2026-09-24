/**
 * Contact magic-link token generate/validate routes.
 *
 * Ported from the former Mongo-backed `tests/server/api/contactToken.test.ts`.
 * No DB access is exercised by these routes, so no Testcontainers guard is needed.
 */
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { makeSqlApp, TEST_JWT_SECRET } from '../helpers/makeSqlApp.ts';

describe('POST /api/auth/generate-token', () => {
  it('returns 400 when projectId is missing', async () => {
    const res = await request(makeSqlApp())
      .post('/api/auth/generate-token')
      .send({ contactId: 'c1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing data');
  });

  it('returns 400 when contactId is missing', async () => {
    const res = await request(makeSqlApp())
      .post('/api/auth/generate-token')
      .send({ projectId: 'p1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing data');
  });

  it('returns a token whose payload carries projectId and contactId', async () => {
    const res = await request(makeSqlApp())
      .post('/api/auth/generate-token')
      .send({ projectId: 'p1', contactId: 'c1' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');

    const decoded = jwt.verify(res.body.token, TEST_JWT_SECRET) as Record<
      string,
      unknown
    >;
    expect(decoded.projectId).toBe('p1');
    expect(decoded.contactId).toBe('c1');
  });
});

describe('POST /api/auth/validate-token', () => {
  it('returns 400 when the token is missing', async () => {
    const res = await request(makeSqlApp())
      .post('/api/auth/validate-token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  it('returns the decoded payload for a valid token', async () => {
    const token = jwt.sign({ projectId: 'p1', contactId: 'c1' }, TEST_JWT_SECRET, {
      expiresIn: '7d',
    });

    const res = await request(makeSqlApp())
      .post('/api/auth/validate-token')
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.decoded.projectId).toBe('p1');
    expect(res.body.decoded.contactId).toBe('c1');
  });

  it('returns 401 for a tampered signature', async () => {
    const token = jwt.sign({ projectId: 'p1', contactId: 'c1' }, 'a-different-secret');

    const res = await request(makeSqlApp())
      .post('/api/auth/validate-token')
      .send({ token });

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toBe('Invalid token signature');
  });

  it('returns 401 for an expired token', async () => {
    const token = jwt.sign({ projectId: 'p1', contactId: 'c1' }, TEST_JWT_SECRET, {
      expiresIn: '-1s',
    });

    const res = await request(makeSqlApp())
      .post('/api/auth/validate-token')
      .send({ token });

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toBe('Token has expired');
  });
});
