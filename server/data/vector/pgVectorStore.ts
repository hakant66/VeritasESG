/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pgvector-backed VectorStore. Owns the `kbchunks` embedding + tsvector columns
 * on a PostgreSQL database (the core on a Postgres deployment, or a sidecar when
 * the core is MySQL — selected via VECTOR_DATABASE_URL). Prisma has no native
 * vector type, so embeddings and full-text are managed with raw SQL here.
 */

import { getEmbeddingDimensions, getEmbeddingModel } from '../../lib/rag/constants.ts';
import { getVectorPrisma } from '../prismaClient.ts';
import type {
  VectorHit,
  VectorPoint,
  VectorSearchOptions,
  VectorStore,
} from './vectorStore.ts';

function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;
}

export class PgVectorStore implements VectorStore {
  readonly backend = 'pgvector' as const;
  private ready = false;

  isEnabled(): boolean {
    return getVectorPrisma() !== null;
  }

  private client() {
    const prisma = getVectorPrisma();
    if (!prisma) throw new Error('pgvector store unavailable: set VECTOR_DATABASE_URL (or DATABASE_URL on a Postgres core)');
    return prisma;
  }

  async ensureReady(): Promise<void> {
    if (this.ready) return;
    const prisma = this.client();
    const dims = getEmbeddingDimensions();

    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE kbchunks ADD COLUMN IF NOT EXISTS embedding vector(${dims})`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS kbchunks_embedding_idx ON kbchunks USING hnsw (embedding vector_cosine_ops)`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE kbchunks ADD COLUMN IF NOT EXISTS text_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text, ''))) STORED`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS kbchunks_text_tsv_idx ON kbchunks USING gin (text_tsv)`,
    );

    this.ready = true;
  }

  async upsertChunks(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;
    await this.ensureReady();
    const prisma = this.client();
    const model = getEmbeddingModel();
    const now = new Date();

    for (const point of points) {
      const p = point.payload;
      await prisma.$executeRawUnsafe(
        `INSERT INTO kbchunks
           ("id", "kbId", "documentId", "customerId", "projectId", "chunkIndex",
            "text", "qdrantPointId", "embeddingModel", "embedding", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector,$11,$12)
         ON CONFLICT ("documentId","chunkIndex") DO UPDATE SET
           "text" = EXCLUDED."text",
           "embedding" = EXCLUDED."embedding",
           "embeddingModel" = EXCLUDED."embeddingModel",
           "updatedAt" = EXCLUDED."updatedAt"`,
        point.id,
        p.kbId,
        p.documentId,
        p.customerId ?? null,
        p.projectId ?? null,
        p.chunkIndex,
        p.text,
        point.id,
        model,
        toVectorLiteral(point.vector),
        now,
        now,
      );
    }
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.ensureReady();
    await this.client().$executeRawUnsafe('DELETE FROM kbchunks WHERE "documentId" = $1', documentId);
  }

  async searchByVector(options: VectorSearchOptions): Promise<VectorHit[]> {
    await this.ensureReady();
    const prisma = this.client();
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 50);

    const conditions: string[] = ['embedding IS NOT NULL'];
    const params: unknown[] = [toVectorLiteral(options.vector)];
    let idx = 2;
    if (options.customerId) {
      conditions.push(`"customerId" = $${idx++}`);
      params.push(options.customerId);
    }
    if (options.projectId) {
      conditions.push(`"projectId" = $${idx++}`);
      params.push(options.projectId);
    }
    const kbIds = (options.kbIds ?? []).map((id) => String(id).trim()).filter(Boolean);
    if (kbIds.length > 0) {
      conditions.push(`"kbId" = ANY($${idx++}::text[])`);
      params.push(kbIds);
    }
    params.push(limit);

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "kbId", "documentId", "chunkIndex", "text", "customerId", "projectId",
              1 - (embedding <=> $1::vector) AS score
       FROM kbchunks
       WHERE ${conditions.join(' AND ')}
       ORDER BY embedding <=> $1::vector
       LIMIT $${idx}`,
      ...params,
    );

    return rows.map((r) => this.rowToHit(r, options.customerId));
  }

  async searchByText(customerId: string, query: string, limit = 10): Promise<VectorHit[]> {
    await this.ensureReady();
    const prisma = this.client();
    const capped = Math.min(Math.max(limit, 1), 50);

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "kbId", "documentId", "chunkIndex", "text", "customerId", "projectId",
              ts_rank(text_tsv, websearch_to_tsquery('simple', $2)) AS score
       FROM kbchunks
       WHERE "customerId" = $1 AND text_tsv @@ websearch_to_tsquery('simple', $2)
       ORDER BY score DESC
       LIMIT $3`,
      customerId,
      query,
      capped,
    );

    return rows.map((r) => this.rowToHit(r, customerId));
  }

  private rowToHit(r: Record<string, unknown>, fallbackCustomerId?: string): VectorHit {
    return {
      score: Number(r.score ?? 0),
      kbId: String(r.kbId ?? ''),
      documentId: String(r.documentId ?? ''),
      documentName: 'Document',
      chunkIndex: Number(r.chunkIndex ?? 0),
      text: String(r.text ?? ''),
      customerId: String(r.customerId ?? fallbackCustomerId ?? ''),
      projectId: r.projectId ? String(r.projectId) : undefined,
    };
  }

  async ping() {
    try {
      await this.ensureReady();
      return { backend: this.backend, ok: true, detail: 'pgvector ready' };
    } catch (err) {
      return { backend: this.backend, ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
  }
}
