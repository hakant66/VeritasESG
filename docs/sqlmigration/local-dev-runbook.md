# Local dev runbook (Postgres-only)

> **Historical note:** this runbook originally described running MongoDB and
> PostgreSQL side by side while the migration was in progress (`DB_DRIVER=mongo`
> / `DB_DRIVER=sql`). MongoDB has since been fully removed from the codebase —
> there is no `DB_DRIVER` flag, no Mongo service, and no way to switch back.
> The steps below reflect the current, Postgres-only setup.

## Prerequisites

- Docker Desktop running
- `node_modules` installed (`npm install`)
- `.env` in project root (copy from `.env.example`)
- Optional: `psql` CLI for `sql:extras` (`brew install libpq`)

## Environment (`.env`)

```bash
DATABASE_URL=postgresql://governance:governance@localhost:5442/governance
VECTOR_DATABASE_URL=postgresql://governance:governance@localhost:5442/governance
VECTOR_BACKEND=pgvector

# Supporting services
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://127.0.0.1:6333
```

## Step 1 — Start infrastructure

```bash
npm run docker:up   # or: docker compose up -d postgres redis qdrant minio minio-init
docker compose ps
```

Wait until `postgres` shows **healthy**. `npm run docker:up` auto-picks a free host port for any service whose default port is already taken — see `CLAUDE.md` → "Docker & Local Stack".

## Step 2 — Create the SQL schema

```bash
npm run sql:setup
```

This runs: provider → generate → `prisma db push` → pgvector/partial-index SQL.

## Step 3 — Seed data

There is no Mongo seed to restore anymore. To get sample data into a fresh Postgres instance, either:
- Point `DATABASE_URL` at a database that already has data (e.g. a copy of staging/prod), or
- Use the demo snapshot: `npm run demo:snapshot` (dumps the current DB to `server/data/demo-snapshot.json`) then `POST /api/demo/seed` as a `platform_admin` to restore it into another database, or
- Create a first user via the OTP-bootstrap flow: call `POST /api/auth/otp/request` with any email while `platformusers` is empty — it auto-creates the first row as `platform_admin`.

## Step 4 — Run the app

```bash
npm run dev
```

- App: http://localhost:3010
- Health: `curl http://localhost:3010/api/health` → `{"status":"ok","dbDriver":"sql","sqlReady":true,...}`

## Docker app container (optional)

```bash
npm run docker:up   # builds and starts the app container too
```

`DATABASE_URL` inside the app container points at the `postgres` service (`postgresql://governance:governance@postgres:5432/governance` by default); override host-side tools' `DATABASE_URL` separately if you run `psql`/Prisma CLI from your host against the mapped port (`5442` by default).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `connect ECONNREFUSED :5442` (or your mapped Postgres port) | `docker compose up -d postgres` / check `npm run docker:up` output for the port it picked |
| `psql: command not found` | Install client or run SQL via `docker compose exec postgres psql -U governance -d governance -f ...` |
| Empty screens after a fresh `sql:push` | Expected — schema exists but has no rows; see Step 3 |
| `Environment variable not found: DATABASE_URL` | Set `DATABASE_URL` in `.env` (required now — there is no Mongo fallback) |

## Status

Postgres-only. See [`current-status.md`](current-status.md) and [`../migration/mongo-to-sql-implementation-status.md`](../migration/mongo-to-sql-implementation-status.md) for the full picture of what shipped.
