# Production & Docker environment template (Track A — A4)

Copy `.env.example` to `.env` and set values below. **Never commit `.env`** to git.

For local Docker full stack, see `docker-compose.yml` — app overrides `MONGODB_URI`, `REDIS_URL`, and `QDRANT_URL` inside the container.

---

## Required (all environments)

| Variable | Example | Notes |
|----------|---------|--------|
| `JWT_SECRET` | 64+ char random | Boot fails in production if unset |
| `PLATFORM_API_KEY` | long random | Platform API + smoke scripts |
| `MONGODB_URI` | `mongodb://localhost:27018/governance` | Host tools; Docker app uses `mongo:27017` |
| `APP_PUBLIC_URL` | `https://giq.theleadai.co.uk` | Assignment links, public asset URLs |
| `RESEND_API_KEY` | `re_…` | Transactional email (assignments, OTP, reset) |
| `RESEND_FROM_EMAIL` | `no-reply@theleadai.co.uk` | Must be verified domain in Resend |
| `RESEND_FROM_NAME` | `Impact AI GovernanceIQ` | Display name |

Optional but recommended:

| Variable | Notes |
|----------|--------|
| `PASSWORD_RESET_PUBLIC_URL` | Multi-domain password reset base URL |
| `CORS_ALLOWED_ORIGINS` | Extra browser origins |
| `RESEND_WEBHOOK_SECRET` | Delivery/bounce tracking in Sistem Denetimi |

---

## RAG stack (Docker compose includes redis + qdrant)

| Variable | Local Docker | Production |
|----------|--------------|------------|
| `REDIS_URL` | Set in compose → `redis://redis:6379` | Managed Redis URL |
| `QDRANT_URL` | Set in compose → `http://qdrant:6333` | Managed Qdrant URL |
| `KB_HYBRID_SEARCH_ENABLED` | `true` | `true` (recommended) |
| `KB_SEARCH_RETRIEVE_LIMIT` | `24` | `24` |
| `KB_RRF_K` | `60` | `60` |
| `COHERE_API_KEY` | Optional | Recommended for rerank quality |
| `RERANK_MODEL` | `rerank-v3.5` | `rerank-v3.5` |
| `RERANK_TOP_N` | `8` | `8` |

When `COHERE_API_KEY` is set, Cohere rerank auto-enables unless `RERANK_PROVIDER=none`.

---

## Ollama on GPU host (app in Docker)

| Variable | Value |
|----------|--------|
| `AI_PROVIDER` | `ollama` |
| `EMBEDDING_PROVIDER` | `ollama` |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` (Mac/Windows Docker) |
| `OLLAMA_TEXT_MODEL` | `llama3.1:8b` (or your pulled model) |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` |
| `OLLAMA_EMBEDDING_DIMENSIONS` | `768` |

**After switching embedding provider:** KB → **Re-index all** (all chunks must use one model).

See [ollama-gpu-host-setup.md](./ollama-gpu-host-setup.md) and [rag-hybrid-rerank-prep.md](./rag-hybrid-rerank-prep.md).

---

## Gemini / browser (optional)

| Variable | Notes |
|----------|--------|
| `GEMINI_API_KEY` | Server-side Genel AI fallback if not using Ollama |
| `VITE_GEMINI_API_KEY` | Browser Knowledge Chat (Vite build arg in Docker) |
| `VITE_GEMINI_MODEL` | Default chat model |

Settings → LLM (Mongo `appsettings` key `llm`) overrides env for runtime provider selection.

---

## S3 / MinIO (profile images)

Local compose sets MinIO automatically. For custom deploy:

```
S3_BUCKET=governance-uploads
S3_ENDPOINT=http://minio:9000
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_PUBLIC_URL_BASE=https://…/governance-uploads
```

---

## Deploy checklist

1. Set all **Required** variables on the host or secret store.
2. Set `KB_HYBRID_SEARCH_ENABLED=true`; add `COHERE_API_KEY` if using rerank.
3. Configure Ollama or cloud LLM + embedding consistently.
4. `docker compose build app && docker compose up -d app`
5. `curl -s https://your-domain/api/health`
6. `npx tsx scripts/smoke-ship-stabilize.ts` (from host with `BASE_URL` set)
7. Manual UI smoke per [smoke-checklist.md](./smoke-checklist.md)

---

## Health endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/health` | None | Mongo + app liveness |
| `GET /api/kb-rag/health` | JWT (indexer role) | Qdrant, LLM, retrieval flags |
