-- Raw SQL to run AFTER `prisma migrate deploy` on a PostgreSQL core (or the
-- Postgres vector sidecar). These objects cannot be expressed in schema.prisma:
--   1. Partial/sparse unique indexes (Mongo parity)
--   2. pgvector embedding column + ANN index on kb_chunks
--   3. tsvector full-text column + GIN index on kb_chunks
--
-- Idempotent. On MySQL, use the partial-index emulation notes in the migration
-- plan instead (generated columns / app-level enforcement); MySQL never hosts
-- kb_chunks (that lives on Postgres — core or sidecar).

-- 1a. metricEntries sparse unique (customerId, year, metricDefinitionCode, facilityId)
--     Mongo used a sparse unique index; NULL facilityId rows are excluded here.
DROP INDEX IF EXISTS metricentries_companywide_unique;
-- Per-facility only (Mongo sparse-unique parity). Company-wide rows (NULL/'' facilityId)
-- are not unique-indexed — one row per facility plus optional consolidated rows.
CREATE UNIQUE INDEX IF NOT EXISTS metricentries_sparse_unique
  ON metricentries ("customerId", "year", "metricDefinitionCode", "facilityId")
  WHERE "facilityId" IS NOT NULL AND "facilityId" <> '';

-- 1b. knowledgeBases partial unique (project/customer scoped names)
CREATE UNIQUE INDEX IF NOT EXISTS knowledgebases_project_name_unique
  ON knowledgebases ("projectId", "name")
  WHERE "projectId" IS NOT NULL AND "projectId" <> '';

CREATE UNIQUE INDEX IF NOT EXISTS knowledgebases_customer_name_unique
  ON knowledgebases ("customerId", "name")
  WHERE "customerId" IS NOT NULL AND "customerId" <> '';

-- 2. pgvector embedding on kb_chunks (dimension must match KB_EMBEDDING_DIMENSIONS; default 768)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE kbchunks ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS kbchunks_embedding_idx
  ON kbchunks USING hnsw (embedding vector_cosine_ops);

-- 3. tsvector keyword search on kb_chunks (replaces Mongo $text index)
ALTER TABLE kbchunks ADD COLUMN IF NOT EXISTS text_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text, ''))) STORED;
CREATE INDEX IF NOT EXISTS kbchunks_text_tsv_idx
  ON kbchunks USING gin (text_tsv);
