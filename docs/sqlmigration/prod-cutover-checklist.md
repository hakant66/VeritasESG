# Production cutover checklist — MongoDB → PostgreSQL

> **✅ Cutover complete, and it is no longer reversible.** MongoDB and Mongoose
> have been deleted from the codebase entirely — there is no `DB_DRIVER` flag,
> no Mongo connection code, and no rollback path. If a production deployment is
> still running an older build against MongoDB, that build must stay pinned to
> its current image/commit until it can be migrated to a `main` build talking
> to Postgres; deploying current `main` against a Mongo-only environment will
> not work at all (the code no longer knows how to connect to Mongo).
>
> The phases below are kept as the historical record of how the cutover was
> planned and executed. Do not follow Phase B/Phase D's Mongo-rollback steps —
> they describe a capability that existed only during the migration window.

Deployment-specific companion to [`staging-prod-etl-runbook.md`](staging-prod-etl-runbook.md)
(which covers the ETL mechanics, itself no longer runnable — see that doc). This
recorded the hosting/sequencing steps and the gotchas found during the cutover.

## Phase A — Provision (no downtime)

- [ ] PostgreSQL 16 with `pgvector`, reachable from the prod app (managed or self-hosted `pgvector/pgvector:pg16`).
- [ ] Empty `governance` DB + least-privilege app role.
- [ ] Prod deploy secrets: `DATABASE_URL`, `VECTOR_DATABASE_URL` (= same URL on a PG core), `VECTOR_BACKEND=pgvector`.
- [ ] Confirm the prod image rebuilds from current `main` (Dockerfile now runs `prisma generate`; do not reuse the old image).

## Phase B — Rehearse against a prod snapshot (no downtime)

Run on a bastion/CI runner with read-only reach to prod Mongo. Follow runbook §1–7 against a **migration** DB (not live):

- [ ] `mongodump` prod Mongo → archive (rollback source of truth).
- [ ] `npm run sql:setup` on `governance_migration`; `npm run audit:mongo` → review dangling refs / dup emails on real prod data.
- [ ] `migrate:mongo-to-sql --dry-run` → `migrate:mongo-to-sql` → `sql:validate` must end **"All collections match."**
- [ ] KB vectors: `migrate:embeddings-pgvector`.
  - **Gotcha:** run with `DB_DRIVER=mongo` and `DATABASE_URL` **unset** (only `VECTOR_DATABASE_URL` set), else `getVectorPrisma()` takes the "same-DB" branch and reports "pgvector unavailable."
- [ ] Point a staging app at the migration DB; run runbook §8 smoke checklist.

## Phase C — Cutover (maintenance window)

- [ ] Announce window; drain/read-only if possible.
- [ ] Final `mongodump` + final ETL prod Mongo → prod Postgres (or promote the validated migration DB); re-run `sql:validate` → **zero mismatches** (gate).
- [ ] Set prod env: `DB_DRIVER=sql`, `DATABASE_URL`, `VECTOR_DATABASE_URL`, `VECTOR_BACKEND=pgvector`. Remove any temporary `DB_DRIVER=mongo` pin.
- [ ] Deploy/restart every app instance. Verify `GET /api/health` → `dbDriver: sql, sqlReady: true` on all.
- [ ] Smoke: login, project questions/answers, a KB chat query, customer API.

## Phase D — After

- [x] Monitor logs/Sentry 24–48h.
- [x] ~~Keep Mongo running read-only for the rollback window~~ — the rollback window has closed. Mongo/Mongoose code is deleted; there is nothing to flip back to.
- [x] Confirm a `pg_dump` backup actually runs. Lock the scheduler to `platform_admin` — it executes shell.

## Deployment-specific confirmations

- **Multi-domain**: re-verify `CORS_ALLOWED_ORIGINS` / `PASSWORD_RESET_*` for `giq.impact-ai.co.uk` **and** `giq.g2m.partners` after the env swap (no DB dependency, but easy to miss).
- **Sessions**: keep the **same `JWT_SECRET`** in the new env, or all logged-in users are bounced.
- **Second instance** (`giq.g2m.partners`, if separate): apply the same env flip and point it at the **same** Postgres.

## Related

- [Staging / production ETL runbook](staging-prod-etl-runbook.md)
- [Current status](current-status.md)
- [Phase 8 — cutover + cleanup](phases/phase-08-cutover-cleanup.md)
