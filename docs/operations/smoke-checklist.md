# Ship & stabilize smoke checklist (Track A — A2)

**Script:** `npx tsx scripts/smoke-ship-stabilize.ts`  
**Last run:** 2026-06-15 — `npm run smoke:ship` → **12 passed, 0 failed**  
**Environment:** Docker `docker compose up`, app on `http://localhost:3010`

## Prerequisites

- [ ] `docker compose ps` — app, mongo, redis, qdrant healthy
- [ ] `.env` copied from `.env.example` with secrets set (see [prod-env-template.md](./prod-env-template.md))
- [ ] Ollama on host: `curl http://127.0.0.1:11434/api/tags` returns models
- [ ] `KB_HYBRID_SEARCH_ENABLED=true` in `.env`; restart app container after change

## Automated checks (`smoke-ship-stabilize.ts`)

| Check | What it validates |
|-------|-------------------|
| API health | `GET /api/health` → `mongoReady: true` |
| Env flags | Hybrid search, Resend, Ollama URL |
| KB-RAG health | `GET /api/kb-rag/health` (auth) + retrieval block |
| Ollama health | `POST /api/admin/llm-settings/ollama-health` from app |
| Hybrid search | `searchCustomerKbChunks` for Akkim customer |
| Lokal AI autofill | `POST /api/kb-rag/tasks/autofill-answer` `mode=local` |
| Genel AI autofill | Same endpoint `mode=general` |
| Assignment email | Skipped by default; `--send-assignment-email` for live Resend |

```bash
npm run test:server
npx tsx scripts/smoke-ship-stabilize.ts
# Optional live email (sends real mail):
npx tsx scripts/smoke-ship-stabilize.ts --send-assignment-email
```

## Manual UI smoke (5 min)

### Tasks — Lokal AI

1. Log in as consultant/admin → **Görevlerim** / Tasks.
2. Open an assignment with KB-backed customer (e.g. Akkim).
3. Click **Lokal AI** on a question.
4. Confirm answer cites sources in **KAYNAKLAR** footer.
5. Ask ownership/listing question — answer must **not** claim “halka açık” without explicit source text.

### Tasks — Genel AI

1. Same assignment → **Genel AI**.
2. Confirm answer uses configured general prompt (Settings → LLM).
3. No KB chunk requirement; disclaimer still applied.

### Knowledge base — re-index

1. **Bilgi bankası** → customer KB → **Re-index all**.
2. All documents reach `processed` / job `completed`.
3. Chunk count stable; embedding model matches Settings (e.g. `nomic-embed-text`).

### Assignment email

1. Project → assignment → **Resend email** (or assignment manage modal).
2. Confirm Resend dashboard shows `email.sent` / `email.delivered`.
3. Link in email opens assignment response flow.

## Pass criteria

- Automated script exits `0` (all critical checks pass).
- `npm run test:server` — 294+ tests green.
- Manual UI: Lokal/Genel autofill return answers; KB re-index completes; one assignment email delivered (if tested).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Ollama health fails from Docker | `OLLAMA_BASE_URL=http://host.docker.internal:11434` |
| Hybrid still `false` in kb-rag health | `docker compose up -d app` after `.env` change |
| Autofill 503 LLM | Check Ollama models + Settings → LLM active provider |
| No KB hits | Re-index all documents after embedding switch |
| Email fails | Verify `RESEND_API_KEY` + verified `RESEND_FROM_EMAIL` domain |
