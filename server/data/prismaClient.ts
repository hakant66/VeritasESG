/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lazily-instantiated singletons for the relational core Prisma client and the
 * optional vector-store Postgres client (for kb_chunks + pgvector, used when the
 * core runs on MySQL or when RAG is served by a dedicated Postgres).
 */

import { PrismaClient } from '@prisma/client';

let corePrisma: PrismaClient | null = null;
let vectorPrisma: PrismaClient | null = null;

/** Relational core client (Postgres or MySQL per deployment). */
export function getPrisma(): PrismaClient {
  if (!corePrisma) {
    corePrisma = new PrismaClient();
  }
  return corePrisma;
}

/**
 * Postgres client that owns the RAG chunk store (`kb_chunks` + embeddings).
 * Reuses the core client when `VECTOR_DATABASE_URL` is unset or equal to
 * `DATABASE_URL` (Postgres core); otherwise connects to the sidecar. Returns
 * null when no Postgres is available (e.g. core is MySQL with no vector
 * sidecar configured — semantic RAG disabled).
 */
export function getVectorPrisma(): PrismaClient | null {
  const vectorUrl = process.env.VECTOR_DATABASE_URL?.trim();
  const coreUrl = process.env.DATABASE_URL?.trim();

  if (!vectorUrl || vectorUrl === coreUrl) {
    // Same database as the core — only valid when the core is Postgres.
    const isMysqlCore = coreUrl?.startsWith('mysql://') || coreUrl?.startsWith('mariadb://');
    return isMysqlCore ? null : getPrisma();
  }

  if (!vectorPrisma) {
    vectorPrisma = new PrismaClient({ datasources: { db: { url: vectorUrl } } });
  }
  return vectorPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  await Promise.all([
    corePrisma?.$disconnect(),
    vectorPrisma?.$disconnect(),
  ]);
  corePrisma = null;
  vectorPrisma = null;
}

/** Ping relational core; used at boot and `/api/health`. */
export async function checkSqlConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
