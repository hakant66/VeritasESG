# Phase 5 — Search & vector

**Plan reference:** Migration plan §7.1–7.2, §10 Phase 5 (3–7 days estimated)

## Planned

- Replace Mongo `$text` on `kb_chunks` with Postgres `tsvector` (or MySQL FULLTEXT)
- Consolidate Qdrant embeddings into `pgvector` on `kb_chunks`
- Pluggable vector backend via env
- Migration script Qdrant → pgvector

## Delivered

| Artifact | Path | Notes |
|----------|------|-------|
| `VectorStore` interface | `server/data/vector/vectorStore.ts` | upsert, delete, search |
| pgvector store | `server/data/vector/pgVectorStore.ts` | Uses `VECTOR_DATABASE_URL` |
| Qdrant adapter | `server/data/vector/qdrantVectorStore.ts` | Transition / parity |
| Disabled store | Factory default when misconfigured | `server/data/vector/index.ts` |
| Ingest routing | `server/lib/rag/ingestKbDocument.ts` | `getVectorStore()` instead of direct Qdrant |
| Raw SQL indexes | `prisma/sql/pgvector-and-partial-indexes.sql` | `embedding vector`, `tsvector` GIN |
| Embedding migration | `scripts/migrate-embeddings-to-pgvector.ts` | `npm run migrate:embeddings-pgvector` |

### Env

```bash
VECTOR_BACKEND=pgvector   # default
VECTOR_BACKEND=qdrant     # legacy path
VECTOR_BACKEND=disabled
VECTOR_DATABASE_URL=...   # Postgres for chunks (sidecar on MySQL core)
```

## Remaining

- [ ] Wire Mongo text search fallback off when `DB_DRIVER=sql` (hybrid RRF path)
- [ ] A/B quality check pgvector vs Qdrant before retiring Qdrant in production
- [ ] MySQL core: document sidecar Postgres requirement for semantic RAG
- [ ] Run `migrate:embeddings-pgvector` after ETL on staging

## Validation

```bash
VECTOR_BACKEND=pgvector VECTOR_DATABASE_URL="$DATABASE_URL" npm run migrate:embeddings-pgvector
curl http://localhost:3010/api/kb-rag/health
```
