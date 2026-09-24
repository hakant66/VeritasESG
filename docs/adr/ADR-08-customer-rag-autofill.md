# ADR-08: Customer-scoped RAG ingest for knowledge bases and form autofill

**Status:** Accepted (Phases 1–3 implemented)
**Date:** 2026-06-05
**Severity:** High | **Effort:** L
**Relates to:** Knowledge base documents, customer edit autofill (Phase 2)

## Context

GovernanceIQ already stores knowledge-base documents in MongoDB (`KnowledgeBase`, `KBDocument`) and
extracts cleaned text client-side via Gemini. Chat (`KnowledgeChatPage`) concatenates **all**
processed document text into a single prompt — workable for a handful of small files, but not
scalable and not scoped for per-field retrieval.

Product goals:

1. **Semantic index** customer-linked PDFs and reports uploaded under a customer knowledge base.
2. **Phase 2:** “AI ile doldur” on `EditCustomerModal` — retrieve relevant chunks per field group
   and return structured JSON for form fields.
3. Preserve existing Mongo document records; add vector search without replacing the Firestore-style
   `/api/db/*` CRUD layer.

Constraints:

- Self-hosted stack (Docker Compose locally; same Node process in production).
- Gemini already used for text cleanup and generation; reuse for embeddings.
- `KnowledgeBase.customerId` is the tenancy boundary for customer KBs; project-scoped KBs use
  `projectId` (same ingest pipeline, different filter at query time).

## Decision

Introduce a **server-side ingest pipeline** (Phase 1) and defer generation/autofill to Phase 2.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Chunking | Structure-aware paragraph merge + overlap (`server/lib/rag/chunkText.ts`) | Cheap, deterministic, good enough for sustainability reports |
| Embeddings | Gemini `gemini-embedding-001` (`outputDimensionality: 768`) | Same vendor/key as existing AI features |
| Vector store | **Qdrant** (`@qdrant/js-client-rest`) | Self-hosted, filterable payloads, Docker-friendly |
| Job queue | **BullMQ + Redis** when `REDIS_URL` set; inline `setImmediate` fallback | Async ingest without blocking upload UI |
| Metadata | Mongo `KbChunk` + `KbIngestJob` | Audit trail, re-index, delete-by-document |
| API | `/api/kb-rag/*` dedicated routes | Keeps generic mongo CRUD thin; explicit lifecycle |

### Data model (Mongo)

**`KbChunk`** — one row per indexed chunk:

- `kbId`, `documentId`, `customerId?`, `projectId?`
- `chunkIndex`, `text` (snippet), `qdrantPointId`, `embeddingModel`

**`KbIngestJob`** — ingest lifecycle:

- `documentId`, `kbId`, `status`: `queued` | `processing` | `completed` | `failed`
- `chunkCount?`, `error?`, `startedAt?`, `completedAt?`

**`KBDocument`** (extended semantics):

- `processed: false` until vector index completes (UI “Pending”)
- `processed: true` when Qdrant upsert succeeds (UI “Indexed”)

### Qdrant collection `kb_chunks`

Payload fields: `kbId`, `customerId`, `projectId`, `documentId`, `chunkIndex`, `documentName`, `text`.

Point ID = Mongo `KbChunk.qdrantPointId` (UUID). Re-index deletes all points/chunks for `documentId`
then re-inserts.

### API (Phase 1)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/kb-rag/documents/:docId/index` | Enqueue or run ingest |
| `GET` | `/api/kb-rag/documents/:docId/status` | Poll `KbIngestJob` + document flags |
| `DELETE` | `/api/kb-rag/documents/:docId` | Remove Qdrant points + `KbChunk` rows |
| `GET` | `/api/kb-rag/health` | Qdrant/Redis/Gemini config probe (auth required) |
| `POST` | `/api/kb-rag/chat` | Knowledge Chat: vector retrieval + Gemini answer (Phase 3) |
| `POST` | `/api/kb-rag/customers/:customerId/autofill` | Customer form autofill (Phase 2) |
| `GET` | `/api/kb-rag/customers/:customerId/search` | Customer-scoped chunk search (Phase 2) |

Auth: JWT bearer (same as other `/api/*` routes). Role gate: `platform_admin`, `consultant_manager`,
`consultant` (contributors read-only in Phase 2).

### Upload flow (UI)

1. Client extracts/cleans text (existing Gemini step) → `POST /api/db/kbDocuments` with `processed: false`.
2. Client calls `POST /api/kb-rag/documents/:id/index`.
3. Client polls status until `completed` → reload list (`processed: true`).

### Docker / env

```yaml
# docker-compose.yml additions
redis:6379
qdrant:6333
```

```
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
KB_EMBEDDING_MODEL=gemini-embedding-001
KB_EMBEDDING_DIMENSIONS=768
KB_CHUNK_TARGET_CHARS=1500
KB_CHUNK_OVERLAP_CHARS=200
```

## Phases

### Phase 1 (this ADR) — Ingest + index

- Chunk, embed, upsert to Qdrant; customer/project scope on payload.
- Wire `KnowledgeBaseDetailPage` to trigger and poll indexing.
- Delete hook removes vector data.

### Phase 2 — Customer form autofill

- `POST /api/kb-rag/customers/:customerId/autofill` with `fieldGroups[]`.
- Hybrid retrieval (vector + keyword) filtered by `customerId`.
- Gemini JSON schema → `EditCustomerModal` field mapping.
- Source citations per field.

### Phase 3 — Knowledge Chat retrieval (implemented)

- `POST /api/kb-rag/chat` — embed user query, top-k Qdrant search filtered by `kbIds[]`
  (optional `customerId` / `projectId` when a single scoped KB is selected).
- Server-side Gemini answer generation with retrieved chunks only (no full-document stuffing).
- `KnowledgeChatPage` calls `/api/kb-rag/chat`; assistant messages show collapsible source citations.
- Tests: `tests/server/lib/searchKnowledgeKb.test.ts`, `knowledgeChatAnswer.test.ts`,
  `tests/client/kbRagChat.test.tsx`; smoke: `scripts/test-kb-rag-chat.ts`.

## Consequences

**Positive**

- Documents scale beyond prompt limits; ingest is async and idempotent per document.
- Customer tenancy enforced at payload filter — ready for autofill without cross-customer leakage.
- Qdrant + Redis run locally via Compose; no cloud vector DB lock-in for dev.

**Negative / costs**

- Three new infrastructure services in full Docker stack (Redis, Qdrant, embedding API quota).
- Re-index on model/dimension change requires migration script (not automated in Phase 1).
- `KBDocument.text` still stored in Mongo (duplicate of chunk text) — acceptable for audit/regen.

**Mitigations**

- Graceful degradation: missing `REDIS_URL` runs ingest in-process; missing Qdrant returns clear
  API error without corrupting Mongo rows.
- `KbIngestJob` exposes failure reason in UI.
- Phase 3 chat migration can drop full-text reads once retrieval is validated.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| MongoDB Atlas Vector Search | Requires Atlas tier; local dev uses standalone Mongo |
| Client-side embedding | Exposes API key abuse; large PDFs should not leave server twice |
| Keep stuffing full text | Already fails on Akkim-scale sustainability reports |
| Pinecone / Weaviate | Extra SaaS cost; Qdrant covers filter + self-host |
