/**
 * Track A smoke test: ship & stabilize (A2).
 *
 * Usage:
 *   npx tsx scripts/smoke-ship-stabilize.ts
 *   BASE_URL=http://localhost:3010 npx tsx scripts/smoke-ship-stabilize.ts
 *
 * Requires: Docker stack running, .env with JWT_SECRET and DATABASE_URL.
 * Does not send assignment emails unless --send-assignment-email.
 */

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../server/data/prismaClient.ts';
import { getRagSearchStatus } from '../lib/ragSearchConfig.ts';

dotenv.config();

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3010').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
const SEND_ASSIGNMENT_EMAIL = process.argv.includes('--send-assignment-email');

type CheckResult = { name: string; ok: boolean; detail?: string };

const results: CheckResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

async function resolveAutofillFixture(): Promise<{
  projectId: string;
  questionId: string;
  assignmentId: string;
  customerId: string;
  recipientUserId: string;
} | null> {
  const prisma = getPrisma();
  const candidates = await prisma.assignment.findMany({
    where: { status: { not: 'completed' } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  const assignments = candidates
    .filter((a) => Array.isArray(a.questionIds) && (a.questionIds as unknown[]).length > 0)
    .slice(0, 20);

  for (const assignment of assignments) {
    const projectId = String(assignment.projectId || '').trim();
    const assignmentId = assignment.id;
    const questionIds = Array.isArray(assignment.questionIds)
      ? (assignment.questionIds as unknown[]).map((id) => String(id)).filter(Boolean)
      : [];
    const questionId = String(questionIds[0] || '').trim();
    const recipientId = String(assignment.recipientId || '').trim();
    if (!projectId || !assignmentId || !questionId || !recipientId) continue;

    const recipient = await prisma.platformUser.findFirst({
      where: {
        OR: [
          { id: recipientId },
          { legacyFirebaseId: recipientId },
          { contactId: recipientId },
        ],
      },
    });
    if (!recipient) continue;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const customerId = String(project?.customerId || '').trim();
    if (!customerId) continue;

    return {
      projectId,
      questionId,
      assignmentId,
      customerId,
      recipientUserId: recipient.id,
    };
  }

  return null;
}

async function signTokenForUserId(userId: string): Promise<string> {
  const user = await getPrisma().platformUser.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`Platform user not found: ${userId}`);
  return jwt.sign(
    { uid: user.id, sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

async function signAdminToken(): Promise<string> {
  const prisma = getPrisma();
  const admin =
    (await prisma.platformUser.findFirst({ where: { role: 'platform_admin' }, orderBy: { createdAt: 'asc' } })) ||
    (await prisma.platformUser.findFirst({ orderBy: { createdAt: 'asc' } }));
  if (!admin) throw new Error('No platform user in the database — seed or log in once');
  return jwt.sign({ uid: admin.id, sub: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

async function main() {
  console.log(`\n=== Ship & stabilize smoke (${BASE_URL}) ===\n`);

  // --- Infra ---
  try {
    const health = await api('/api/health');
    if (health.status === 200 && health.json.status === 'ok') {
      pass('API health', `sqlReady=${String(health.json.sqlReady)}`);
    } else {
      fail('API health', `status ${health.status}`);
    }
  } catch (err) {
    fail('API health', err instanceof Error ? err.message : String(err));
  }

  // --- Env / ops (A3, A4) ---
  const ragStatus = getRagSearchStatus();
  if (ragStatus.hybridSearchEnabled) {
    pass('KB_HYBRID_SEARCH_ENABLED', 'hybrid retrieval active');
  } else {
    fail('KB_HYBRID_SEARCH_ENABLED', 'set KB_HYBRID_SEARCH_ENABLED=true in .env');
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    pass('RESEND_API_KEY', 'assignment email delivery configured');
  } else {
    fail('RESEND_API_KEY', 'missing — assignment emails will not send');
  }

  if (process.env.COHERE_API_KEY?.trim()) {
    pass('COHERE_API_KEY', `rerank via ${ragStatus.rerank.model}`);
  } else {
    pass('COHERE_API_KEY', 'not set (optional — vector+text hybrid still works)');
  }

  if (process.env.OLLAMA_BASE_URL?.trim()) {
    pass('OLLAMA_BASE_URL', process.env.OLLAMA_BASE_URL.replace(/\/$/, ''));
  } else {
    fail('OLLAMA_BASE_URL', 'missing for local LLM/embedding');
  }

  let token = '';
  try {
    token = await signAdminToken();
    pass('Admin JWT', 'signed for smoke API calls');
  } catch (err) {
    fail('DB + JWT', err instanceof Error ? err.message : String(err));
    printSummary();
    process.exit(1);
  }

  // --- KB RAG health ---
  try {
    const kbHealth = await api('/api/kb-rag/health', { token });
    if (kbHealth.status !== 200 || kbHealth.json.success !== true) {
      fail('KB-RAG health', `HTTP ${kbHealth.status}`);
    } else {
      const data = kbHealth.json.data as Record<string, unknown> | undefined;
      const retrieval = data?.retrieval as Record<string, unknown> | undefined;
      const hybrid = retrieval?.hybridSearchEnabled;
      const qdrantOk = data?.qdrant != null && !data?.qdrantError;
      pass('KB-RAG health', `hybrid=${String(hybrid)} qdrant=${qdrantOk ? 'ok' : 'error'}`);
      if (hybrid !== true) {
        fail('KB-RAG hybrid in container', 'restart app after .env change: docker compose up -d app');
      }
    }
  } catch (err) {
    fail('KB-RAG health', err instanceof Error ? err.message : String(err));
  }

  // --- Ollama reachability (from app container perspective via API) ---
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';
    const ollama = await api('/api/admin/llm-settings/ollama-health', {
      method: 'POST',
      token,
      body: { baseUrl: ollamaUrl },
    });
    if (ollama.status === 200 && ollama.json.success === true) {
      const data = ollama.json.data as { ok?: boolean; models?: string[] } | undefined;
      if (data?.ok) {
        pass('Ollama health', `${data.models?.length ?? 0} models`);
      } else {
        fail('Ollama health', 'API returned ok=false — check host.docker.internal from Docker');
      }
    } else {
      fail('Ollama health', `HTTP ${ollama.status}`);
    }
  } catch (err) {
    fail('Ollama health', err instanceof Error ? err.message : String(err));
  }

  const fixture = await resolveAutofillFixture();
  if (!fixture) {
    fail('Autofill fixture', 'no assignment with project/customer in the database');
  }

  // --- Hybrid retrieval via API (runs inside Docker app / Ollama path) ---
  if (fixture) {
    try {
      const search = await api(
        `/api/kb-rag/customers/${fixture.customerId}/search?q=${encodeURIComponent('çalışan sayısı')}&limit=3`,
        { token },
      );
      if (search.status === 200 && search.json.success === true) {
        const hits = (search.json.data as { hits?: Array<{ score?: number }> } | undefined)?.hits ?? [];
        if (hits.length > 0) {
          pass('KB hybrid search', `${hits.length} hits via API, top ${hits[0]?.score?.toFixed(3) ?? '?'}`);
        } else {
          fail('KB hybrid search', 'no hits — re-index KB documents');
        }
      } else {
        fail('KB hybrid search', String(search.json.error || search.status));
      }
    } catch (err) {
      fail('KB hybrid search', err instanceof Error ? err.message : String(err));
    }
  }

  // --- Task autofill: Lokal AI + Genel AI ---
  if (fixture) {
    const { projectId, questionId, assignmentId } = fixture;
    const recipientToken = await signTokenForUserId(fixture.recipientUserId);

    for (const mode of ['local', 'general'] as const) {
      try {
        const res = await api('/api/kb-rag/tasks/autofill-answer', {
          method: 'POST',
          token: recipientToken,
          body: {
            projectId,
            questionId,
            assignmentId,
            lang: 'tr',
            mode,
          },
        });
        if (res.status === 200 && res.json.success === true) {
          const data = res.json.data as { answer?: string; chunkCount?: number } | undefined;
          const preview = (data?.answer || '').slice(0, 80).replace(/\s+/g, ' ');
          pass(`Task autofill (${mode})`, `chunks=${data?.chunkCount ?? 0} "${preview}…"`);
        } else {
          const err = String(res.json.error || res.status);
          fail(`Task autofill (${mode})`, err);
        }
      } catch (err) {
        fail(`Task autofill (${mode})`, err instanceof Error ? err.message : String(err));
      }
    }

    // --- Assignment email (config check; optional live send) ---
    if (SEND_ASSIGNMENT_EMAIL) {
      try {
        const res = await api(
          `/api/projects/${projectId}/assignments/${assignmentId}/resend-email`,
          { method: 'POST', token },
        );
        if (res.status === 200 && res.json.success === true) {
          pass('Assignment resend email', 'sent');
        } else {
          fail('Assignment resend email', String(res.json.error || res.status));
        }
      } catch (err) {
        fail('Assignment resend email', err instanceof Error ? err.message : String(err));
      }
    } else {
      pass('Assignment resend email', 'skipped (pass --send-assignment-email to send)');
    }
  }

  printSummary();
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length > 0 ? 1 : 0);
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log(`\n=== Summary: ${passed.length} passed, ${failed.length} failed ===`);
  if (failed.length > 0) {
    for (const f of failed) {
      console.log(`  FAIL: ${f.name} — ${f.detail || ''}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
