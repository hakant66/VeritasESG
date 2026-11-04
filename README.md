# VeritasESG

Consultancy platform for **sustainability and governance reporting**: customer directory (Firma), reporting projects, structured questionnaires, assignments, knowledge-base RAG, emissions ledger, double materiality (DMA), materiality surveys, and compliance tooling (TSRS, IFRS S2, GRI, ESRS, TCFD).

Stack: **React 19 + Vite**, **Express + PostgreSQL (Prisma 6)**, **pgvector** for KB vector search, optional **Redis** for KB ingest queueing, **Resend** email, **S3/MinIO** for uploads (avatars served via app `/storage/…` proxy).

> **Database: PostgreSQL.** Prisma is the only backend — RAG vectors live in `pgvector` (`VECTOR_BACKEND=pgvector`). MongoDB has been fully removed (no `DB_DRIVER` flag, no Mongoose); that migration's history and cutover runbooks live under [`docs/sqlmigration/`](docs/sqlmigration/) and [`docs/migration/`](docs/migration/). A MySQL core is also supported by the same provider-neutral schema.

---

## Quick start

```bash
npm install
cp .env.example .env   # edit secrets and API keys (DB_DRIVER=sql, DATABASE_URL, …)
docker compose up --build -d
```

- App: [http://localhost:3010](http://localhost:3010)
- Health: `GET /api/health` → `{ "status": "ok", "dbDriver": "sql", "sqlReady": true }`

Local dev (without Docker for the app):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

Default login language (Vite build-time): set `VITE_LOGIN_LANG=tr` or `en` in `.env`, then rebuild. Per-visit override: `#/login?lang=tr`.

---

## Recent changes (October 2026)

| Area | What shipped |
|------|----------------|
| **Customer sector classification simplified** | The "Yeni Firma Kaydı" Sektör tab's manual platform-sector checklist was removed; `sectorIds` is now derived automatically from the NACE code / SASB sub-sector (`resolvePlatformSectorIds`). Picking a SASB sub-sector auto-fills its macro sector (and can be picked directly, without choosing a macro first); SASB selection no longer pushes an unreliable NACE code; NACE entry still auto-fills its description and SASB classification. |
| **GRI & ESRS Standards catalogs** | New per-company multi-selects, by code and name, distinct from the coarser `reportingFrameworkKeys` umbrella picker: `griStandardCodes` (~40 GRI Standards) and `esrsStandardCodes` (12 ESRS Standards, including the general/cross-cutting ESRS 1 and ESRS 2 — deliberately kept separate from `server/lib/domainEnums.ts`'s `ESRS_TOPICS`, which only covers the 10 scored materiality topics). Which ESRS Standards are selectable is admin-configurable at **Settings → Modules**. |
| **Customer profile governance fields** | New "Governance programs & group structure" section on the ESG Özet tab: publicly listed, subject to independent audit, Responsible / Turquality program membership, TR ETS scope, and a repeatable Subsidiaries & Affiliates list. Stored in the existing `esgSummary` JSON column. |
| **Organizational boundary entry point moved** | The "Organizasyonel sınır" button moved from the Firmalar list toolbar to the individual Customer Profile page header. |
| **`consultant_manager` admin access widened** | Can now access Kullanıcılar / Sektörler / Kategoriler / Bilgi Bankası / Önemlilik Yönetimi / Denetim (previously `platform_admin`-only), matching that role's documented scope ("manage customers, all projects"). Settings and Translations stay `platform_admin`-only. |
| **Public legal pages** | Privacy Policy and Terms of Service pages, sourced from new Settings fields (legal entity, address, jurisdiction, contact emails), linked from the login footer, sidebar footer, and 404 page. |
| **Formlar: bulk-delete & additive add** | Formlar tab gained multi-select ("Silinecek Formları Seç") to delete a chosen subset of a project's forms/questions without wiping the rest. **Form Ekle** is now additive (and always visible, not just on an empty project) — it adds a template's pages/questions alongside what's already there instead of replacing everything; the old full-wipe rebuild is still used internally when a project genuinely starts from zero. |
| **Reporting Framework auto-load** | Saving a project's Raporlama Çerçevesi selection now offers to auto-add the matching form template(s) (GRI, TSRS1, TSRS2) when exactly the newly-selected frameworks imply them — e.g. selecting both TSRS 1 and TSRS 2 adds both side by side. Ambiguous or unmapped selections (IFRS S1/S2, ESRS/CSRD, CDP, TCFD) fall back to manual **Form Ekle**. |
| **GRI Template populated** | The "GRI" template (previously empty — `Form Ekle → GRI` produced 0 questions) now has 5 pages / 69 questions covering all 38 GRI standards; GRI 1/2/3 use real disclosure text extracted from the uploaded GRI Universal Standards PDFs, the remaining 35 topic standards are AI-estimated pending source documents. Reproducible via `scripts/seed-gri-template.py`. |
| **KB ingest job status bug fix** | Fixed a stale-closure bug (`ingestJobToMutable`) where a Knowledge Base document's indexing job status never persisted to the database — jobs looked permanently "queued" even after completing or failing, which is what caused the "Dizine alma kuyruğa alındı ancak başlamadı" message. Also hardened chunk insertion (`skipDuplicates`) and raised the ingest worker's stall-detection window. |
| **VeritasESG AI Quality & Continuous Improvement (Hermit)** | New optional, `platform_admin`-managed subsystem (Settings → **AI Quality**) for evaluating — and eventually, with human approval, improving — the prompting behind AI-assisted features, via [Hermit](https://github.com/Infini-AI-Lab/hermit). Off by default; see [`docs/hermit/architecture-review.md`](docs/hermit/architecture-review.md). |
| **LangGraph customer-autofill engine** | New optional, `platform_admin`-managed alternative engine for "AI ile doldur" customer-profile extraction (Settings → **Autofill Engine**), built on [LangGraph](https://langchain-ai.github.io/langgraphjs/) (`@langchain/langgraph`, in-process — no new runtime). Adds deterministic citation verification, a bounded retrieval retry, and a cross-check that flags (instead of silently applying) any suggestion that contradicts an already-saved customer value; flagged conflicts get their own review section in the Edit Customer autofill panel, with a one-click "use suggested value" per field. Off by default — the existing single-shot extraction is unchanged. |
| **LangGraph Knowledge Chat engine** | New optional, `platform_admin`-managed alternative engine for Knowledge Chat (Settings → **Chat Engine**), also on `@langchain/langgraph`, in-process. The default chat engine is stateless per request — no conversation history reaches the backend, so a follow-up like "what about Scope 3?" is answered with no awareness of the prior turn. The graph engine adds real multi-turn memory (a LangGraph checkpointer persists history across requests), a query-rewrite step that resolves references to prior turns before retrieval runs, one bounded retry on a weak retrieval, and a citation check flagging any source the model cites but wasn't actually given. Fixed a real, pre-existing bug along the way: Knowledge Chat's retrieval only ever queried Qdrant directly with no fallback, silently returning zero hits on this deployment's default `pgvector` backend (Qdrant was empty) — now uses the same hybrid vector+full-text search as customer autofill. Off by default — the existing chat behavior is unchanged. |

## Recent changes (September 2026)

| Area | What shipped |
|------|----------------|
| **MongoDB fully removed** | The Mongo-to-SQL migration is complete: no `DB_DRIVER` flag, no Mongoose, no Mongo service in Docker/env/package.json. PostgreSQL via Prisma is the only backend. |
| **Materiality Survey templates** | Any survey can be flagged **Şablon** and cloned (topics + IROs, no stakeholders/responses) into a new draft via **Şablondan Oluştur** / the per-survey **Kopyala** icon; in-page **Yardım** dialog explains the IRO concept and workflow. |
| **TSRS scope reference** | Customer **Reporting** tab's CSRD scope card now also shows a TSRS (Türkiye) threshold note (TRY 500M assets / TRY 1B sales / 250 employees, banks, first period 2024, assurance from 2026) alongside the EUR-based EU CSRD calculation. |
| **Feature catalog docs** | New module-by-module reference at `docs/guides/application-features-guide.md` (+ Word export), linked from the user guide and docs index. |
| **Client UI tests** | Vitest + React Testing Library coverage for the admin shell (`adminShell.ui.test.tsx`) and login page (`loginPage.ui.test.tsx`). |
| **pgvector partial index fix** | `metricEntries` sparse-unique index now also excludes empty-string `facilityId` (previously only `NULL`), matching the old Mongo sparse-index behavior. |

---

## Main capabilities

| Area | Description |
|------|-------------|
| **Customers & projects** | Firma directory, branches, contacts, sector/NACE auto-classification, ESG summary (incl. governance programs & subsidiaries), GRI/ESRS/TSRS reporting frameworks |
| **Templates & questionnaires** | Bilingual questions, branch expansion (`soruCogaltma`), question codes in form titles, TSRS/GRI/ESRS mappings |
| **Assignments & contacts** | Magic-link responses, on-behalf submission, quick assign, merge assignments, audit trail |
| **Tasks (Görevlerim)** | Assignment workflow, **Lokal AI** / **Genel AI** answer autofill from KB or general LLM |
| **Denetim (audit)** | Auditor review tab, accept/reject/explanation decisions, activity log |
| **Knowledge base (RAG)** | Per-customer KB, hybrid search (pgvector + Postgres full-text) + optional Cohere rerank, admin chat |
| **Compliance (project)** | Framework completeness, cross-framework consistency, climate scenarios |
| **Emissions** | Emission ledger, factors, Scope 1–3; metric entry approval workflow |
| **Materiality (DMA)** | GRI / ESRS / ISSB double materiality scoring and admin matrix design |
| **Materiality surveys** | Stakeholder double-materiality surveys, weighted aggregation, matrix + CSV export |
| **AI autofill** | RAG-backed customer profile suggestions from indexed documents; optional LangGraph engine adds citation verification + saved-value conflict detection |
| **AI Quality** (optional) | `platform_admin`-managed evaluation & continuous-improvement subsystem for AI-assisted features, powered by Hermit; off by default |
| **Settings & ops** | LLM providers, scheduled DB backup, demo seed, external Customer API docs |

---

## Settings (admin)

**Path:** `#/settings` — `platform_admin` only.

| Tab | Feature |
|-----|---------|
| **LLM** | Multi-provider server LLM (Gemini, OpenAI, Claude, Ollama); task prompts for Lokal/Genel AI |
| **Autofill Engine** | Enable/disable the LangGraph customer-autofill engine (off by default) |
| **Chat Engine** | Enable/disable the LangGraph Knowledge Chat engine (off by default) |
| **AI Quality** | Enable/disable the Hermit-powered AI Quality & Continuous Improvement subsystem (off by default) |
| **Backup** | Scheduled database backup (engine-aware `pg_dump`) via Docker; create/toggle/run jobs |
| **Demo** | Restore frozen demo snapshot (`POST /api/demo/seed`) |
| **API** | Customer API v1 documentation (`x-api-key` auth) |
| Platform / modules / domains / content | Branding, module toggles, ESRS Standards visibility, help markdown & video URLs |

### LLM (multi-provider)

- **UI:** Settings → **LLM**
- **API:** `GET/PUT /api/admin/llm-settings`, `POST /api/admin/llm-settings/ollama-health`
- **Code:** `lib/llmSettings.ts`, `server/lib/llm/`, `src/components/admin/LlmSettingsPanel.tsx`

Env fallbacks until saved in UI: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`, etc. (see `.env.example`).

> Browser Knowledge Chat may still use `VITE_GEMINI_API_KEY` separately from server LLM settings.

### LangGraph customer-autofill engine

Optional, `platform_admin`-managed alternative engine for "AI ile doldur" customer-profile extraction (`POST /api/kb-rag/customers/:customerId/autofill`), built on [LangGraph](https://langchain-ai.github.io/langgraphjs/) (`@langchain/langgraph`). **Off by default** — leaves the existing single-shot extraction (`server/lib/rag/customerAutofill.ts`) completely unchanged; the toggle only decides which engine `kbRagRoute.ts` calls.

Runs **in-process**, not as an isolated worker like Hermit — its graph nodes call the same existing TypeScript functions (`searchCustomerKbChunks`, `extractGroupFields`) directly, so there's no new network hop and no new runtime dependency to operate.

Per generic field group (basic/workforce/sector/reporting/esg — stakeholders/facilities keep their own dedicated extractors unchanged), the graph runs `retrieve → extract → verifyCitations → [retry ≤2× | crossCheck]`:

- **`verifyCitations`** replaces a fuzzy substring-match fallback with a deterministic check: a suggestion is kept only if its quoted excerpt actually appears in the *specific* source chunk it claims to cite.
- **Retry** reformulates the retrieval query toward whatever fields failed verification and loops back, bounded at 2 attempts.
- **`crossCheck`** flags — rather than silently applies — any suggestion that contradicts an already-saved, non-empty customer field. Flagged fields are excluded from the auto-applied patch and shown in their own "Conflicts with saved values" section in the Edit Customer autofill panel, each with the existing vs. suggested value and a one-click **"Use suggested value"** to apply that single field.

Live-verified against a real customer's indexed Knowledge Base (not simulated): it correctly flagged a real conflict between an already-saved `legalName` and a KB-sourced suggestion using the group's shorter brand name, instead of silently overwriting the more precise saved value.

- **UI:** Settings → **Autofill Engine**; conflict review surfaces in the Edit Customer modal's "AI ile doldur" panel.
- **API:** `GET/PUT /api/admin/customer-autofill-engine/settings`
- **Code:** `lib/customerAutofillEngineSettings.ts`, `server/lib/rag/customerAutofillEngineConfig.ts`, `server/lib/rag/customerAutofillGraph.ts`, `src/components/admin/CustomerAutofillEnginePanel.tsx`
- **Ops override:** `CUSTOMER_AUTOFILL_ENGINE=graph|default` env var takes precedence over the saved setting (useful for debugging without touching Settings).

### LangGraph Knowledge Chat engine

Optional, `platform_admin`-managed alternative engine for Knowledge Chat (`POST /api/kb-rag/chat`), also built on `@langchain/langgraph`, in-process. **Off by default** — leaves the existing stateless chat (`server/lib/rag/knowledgeChatAnswer.ts`) completely unchanged.

The real gap this closes: the default engine carries **no conversation history** at all — every request is independent, so a follow-up like "what about Scope 3?" is answered with zero awareness of what was just discussed. The graph runs `rewriteQuery → retrieve → [broadenQuery retry ≤1× | generateAnswer] → checkFaithfulness → appendHistory`:

- **`rewriteQuery`** resolves pronouns/implicit references against the last 3 turns before retrieval runs (no-op on a conversation's first turn).
- A LangGraph **checkpointer** (in-memory — fine for this single-process deployment) persists `history` across requests, keyed by a `conversationId` the server assigns on first contact and the client echoes back.
- A weak top-hit score triggers one broadened retry instead of immediately giving up.
- **`checkFaithfulness`** is deterministic, not another LLM call: flags any inline `*document.pdf*`-style citation that isn't actually among the retrieved sources.

Fixed a real, pre-existing bug while building this (unrelated to the graph itself): `searchKnowledgeKb.ts` only ever queried Qdrant directly with no fallback, so on this deployment's default `VECTOR_BACKEND=pgvector` — where Qdrant is simply unused and empty — it silently returned zero hits for every query. Now uses the same hybrid vector+full-text pattern `searchCustomerKb.ts` already had, so retrieval works regardless of which vector backend is actually populated.

Live-verified against a real customer's indexed Knowledge Base (not simulated), two real turns: turn 1 asked about subsidiaries and got a sourced answer listing several; turn 2 asked "when was the first one acquired?" and the model's answer engaged naturally with the specific companies from turn 1 instead of treating the question as a context-free non-sequitur.

- **UI:** Settings → **Chat Engine**
- **API:** `GET/PUT /api/admin/knowledge-chat-engine/settings`
- **Code:** `lib/knowledgeChatEngineSettings.ts`, `server/lib/rag/knowledgeChatEngineConfig.ts`, `server/lib/rag/knowledgeChatGraph.ts`, `src/components/admin/KnowledgeChatEnginePanel.tsx`
- **Ops override:** `KNOWLEDGE_CHAT_ENGINE=graph|default` env var takes precedence over the saved setting.

### AI Quality & Continuous Improvement (Hermit)

Optional, `platform_admin`-managed subsystem that evaluates — and, once a human approves a candidate, can improve — the prompting behind AI-assisted features (questionnaire autofill, customer profile autofill, KB RAG), via [Hermit](https://github.com/Infini-AI-Lab/hermit). **Off by default**; enabling the toggle alone changes nothing on its own — it only unlocks the evaluation/adapter workflow for an admin to use.

- **UI:** Settings → **AI Quality**
- **API:** `GET/PUT /api/admin/ai-quality/settings`
- **Code:** `lib/aiQualitySettings.ts`, `server/lib/aiQuality/`, `src/components/admin/AiQualityPanel.tsx`
- **Evaluation harness:** `hermit/` (pipelines, datasets, configs — isolated from the app; see `docs/hermit/architecture-review.md`), run via an optional, profile-gated `hermit-worker` Docker Compose service (`docker compose --profile hermit up hermit-worker`) — not started by `docker compose up`.

See [`docs/hermit/architecture-review.md`](docs/hermit/architecture-review.md) for the full design, what's built and verified vs. still planned, and governance/security decisions.

### Scheduled database backup

**Path:** `#/settings?tab=backup`

- Create a default job (explicit confirmation — not auto-created)
- Schedule: hourly, daily, or weekly (cron generated in UI)
- Manual **Run now**; poll status and view log output
- Default command is engine-aware: on PostgreSQL it runs `pg_dump "$DATABASE_URL"` into `backups/`

**API:** `/api/admin/scheduled-jobs` (list, create, update, toggle, run)

**Docker requirements:** app container needs Docker socket access and `docker.io` in the image (see `docker-compose.yml`, `Dockerfile`). Optional: `BACKUP_HOST_PWD` for host path context.

---

## Knowledge base & indexing

- Upload documents to a customer-linked knowledge base.
- **Index** queues ingest (BullMQ + Redis) when `REDIS_URL` is set; chunk text + embeddings are stored in PostgreSQL (`kbchunks` with `pgvector`).
- **Redis is optional:** when `REDIS_URL` is unset — or set but unreachable — ingest **falls back to inline** (in-process) processing so documents are still indexed instead of stuck pending. The queue only adds durable, out-of-process background processing. See `server/lib/rag/kbIngestQueue.ts`.
- **Re-index:** per-document **Yeniden dizine al** and KB-level **Tümünü yeniden dizine al** on the KB detail page.
- **Hybrid search:** `KB_HYBRID_SEARCH_ENABLED=true` — pgvector similarity + Postgres full-text (`tsvector`), merged with RRF.
- **Rerank:** optional Cohere (`COHERE_API_KEY`, `RERANK_PROVIDER=cohere`).
- **Health:** `GET /api/kb-rag/health` — reports `redisQueue` (whether the queue is active) and ingest `mode` (`queue` vs `inline`).

Requires: `VECTOR_DATABASE_URL` (Postgres holding `kbchunks`; reuse `DATABASE_URL` on a Postgres core) and an embedding model (`KB_EMBEDDING_MODEL` or Ollama via Settings → LLM). `REDIS_URL` is optional (inline fallback).

---

## Tasks — Lokal AI & Genel AI

**Path:** Görevlerim → assignment question form.

| Button | Behavior |
|--------|----------|
| **Lokal AI ile doldur** | RAG-backed answer from customer KB chunks (`mode: local`) |
| **Genel AI ile doldur** | General LLM prompt without KB requirement (`mode: general`) |

**API:** `POST /api/kb-rag/tasks/autofill-answer` with `{ "mode": "local" | "general", … }`

Prompt templates configurable in Settings → LLM.

---

## Customer AI autofill (RAG)

**Path:** Edit customer → **AI ile doldur** → choose scope → suggestions applied to the form (or review modal for contacts/facilities).

| UI scope | What it fills |
|----------|----------------|
| **Temel bilgi** | Legal name, address, website, description, tax, currency, … |
| **İşgücü** | Headcount, operation geographies, contract breakdown |
| **Sektör** | NACE, SASB, platform sectors |
| **Paydaşlar** | Named contacts → review modal (email required before add) |
| **Tesisler** | Plants/offices/sites → review modal → create branches |
| **Raporlama** | `reportingFrameworkKeys`, CSRD scope metrics, PIE flag |
| **Sürdürülebilirlik** | ESG summary (29 fields: financials, policies, emissions, social) |
| **Tümü** | Basic + workforce + sector + ESG (not stakeholders/facilities/reporting) |

**API:** `POST /api/kb-rag/customers/:customerId/autofill` with body `{ "groups": ["basic", "esg", …] }`.

**Requires:** Indexed KB documents for that customer.

---

## Materiality (double materiality / DMA)

| Route | Purpose |
|-------|---------|
| `/materiality` | Customer DMA — score topics, approve assessment (GRI / ESRS / ISSB tabs) |
| `/materiality_design` | Admin matrix design — edit framework topic definitions |

Seeded topic counts: **24 GRI**, **57 ESRS**, **26 ISSB** (design matrices).

**APIs:** `/api/materiality/*`, `/api/gri-materiality/*`, `/api/dma/gri-assessment`, `/api/dma/esrs-assessment`, `/api/dma/issb-assessment`

---

## Materiality surveys (Önemlilik Anketleri)

Crowd-sourced double-materiality: collect stakeholder input, score topics/IROs for financial and impact materiality, and auto-generate a matrix. Extends the DMA subsystem (reuses the topic longlist, CSV format, and scoring schema).

| Route | Purpose |
|-------|---------|
| `/materiality-surveys` | Admin: create surveys, define IROs, manage stakeholder groups, send invites, view results |
| `#/materiality-survey/:token` | Public, no-login, mobile survey for stakeholders (tokenized link) |

**Workflow:** create a survey (or clone one from a template) → import/define topics and IROs → add weighted stakeholder groups + stakeholders → **send invites** → stakeholders respond via tokenized links → reminders fire on a cadence → **Sonuçlar** tab shows the weighted matrix + scoring table + CSV export. A **Yardım** button on the page opens a dialog explaining what an IRO is and how the workflow runs.

**Templates & cloning:** any survey can be flagged **Şablon** (`isTemplate`); templates are listed across all customers via `GET /api/materiality/surveys?templates=true`. **Şablondan Oluştur** clones a template's topics + IROs into a new draft survey for the chosen customer (stakeholders/responses are never copied); the per-survey **Kopyala** icon does the same to duplicate any existing survey. Cloning within the same customer reuses existing topic rows; cloning across customers duplicates the topic longlist into the target customer first. `scripts/seed-materiality-survey-template.ts` seeds a reusable example ESRS survey (under a dedicated "Şablon Kütüphanesi" customer) — run once with `npx tsx scripts/seed-materiality-survey-template.ts`.

**APIs:**
- Admin (`platform_admin`/`consultant_manager`): `POST/GET/PATCH/DELETE /api/materiality/surveys[/:id]`, `…/iros`, `…/stakeholder-groups`, `…/stakeholders`, `…/topics/import`, `…/invite`, `…/clone`, `GET …/:id/matrix`, `GET /api/materiality/surveys?templates=true`
- Public (token): `GET /api/materiality/survey/:token`, `POST /api/materiality/survey/:token/responses`
- Automation: `POST /api/materiality/surveys/cron/reminders` (guarded by `x-api-key: {PLATFORM_API_KEY}` or an admin token) — schedule this to drive reminder emails.

**Scoring:** financial materiality + impact severity/scope/probability per IRO, weighted by stakeholder-group weight; impact axis = geometric mean; topics rolled up per survey (`max` | `weighted_avg`); `isMaterial` derived from a configurable threshold (changes are audit-logged).

See [`docs/features/materiality-survey-module-plan.md`](docs/features/materiality-survey-module-plan.md).

---

## Emissions & emission data

| Route | Purpose |
|-------|---------|
| `/emissions` | Emission ledger, factors, calculated tCO₂e |
| `/emission-data` | Structured metric entry with approval workflow |

**Approval stages:** DATA_ENTRY → MANAGER_REVIEW → HORIZON_REVIEW → APPROVED (with revision loop).

**API:** `/api/emissions/*` (factors, summary, entries, intensity, Scope 2 market data).

Compliance consistency checks can fall back to emission ledger values when project answers are missing.

---

## Denetim (audit review)

- **Project detail → Denetim tab:** auditor enters review data; accept / reject / request explanation.
- **API:** `POST /api/projects/:projectId/answers/:answerId/audit-review`
- **Activity:** `#/audit` — platform audit log (Sistem Denetimi); Resend webhook delivery tracking when configured.

Roles: `auditor`, project-level auditor assignment, or `platform_admin`.

---

## Project compliance

Inside **Project detail → Compliance**:

### Framework Completeness

Validates required disclosures per claimed framework, including **TSRS 1** and **TSRS 2**.

**API:** `POST /api/compliance/validate-completeness`, `GET /api/compliance/completeness/:projectId/:frameworkId`

### Cross-Framework Consistency Checker

Compares the same metrics across frameworks when values differ beyond a threshold.

**Frameworks:** TSRS 1, TSRS 2, IFRS S2, GRI 305, ESRS E1, TCFD (min. 2 selected).

**API:** `POST /api/compliance/check-consistency`, `GET /api/compliance/conflicts/:projectId`

### Climate Scenario Analysis

Decarbonization pathways and transition levers (Compliance → Climate Scenarios).

---

## Profile images & object storage

- **Upload:** `POST /api/uploads/profile-image` (JPG/PNG/WEBP, max 5 MB)
- **Storage:** MinIO/S3 inside Docker; files under `governance-uploads/avatars/…`
- **Public URL:** defaults to `{APP_PUBLIC_URL}/storage/governance-uploads/…` (app proxies to MinIO)
- **Legacy CDN:** existing `cdn.impact-ai.co.uk` URLs in the DB are rewritten on API read
- **Fallback:** if S3 upload fails and file &lt;350 KB, stores inline `data:` URL

Set in `.env`:

```env
APP_PUBLIC_URL=https://giq.theleadai.co.uk
# Optional override (usually leave empty — auto-derived from APP_PUBLIC_URL):
# S3_PUBLIC_URL_BASE=https://giq.theleadai.co.uk/storage/governance-uploads
```

---

## Customer external API (v1)

**Docs in UI:** Settings → **API** tab.

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/customer/customers` | List customers |
| `GET /api/v1/customer/projects` | List projects |
| `GET /api/v1/customer/project-data` | Project submissions export |

Auth header: `x-api-key: {PLATFORM_API_KEY}`

---

## Environment variables (essentials)

| Variable | Purpose |
|----------|---------|
| `PORT` | Default `3010` |
| `APP_PUBLIC_URL` | Public app URL (links, avatar base, password reset) |
| `DATABASE_URL` | PostgreSQL (or MySQL) connection for the relational core |
| `VECTOR_DATABASE_URL` | Postgres holding `kbchunks` + embeddings (reuse `DATABASE_URL` on a Postgres core) |
| `VECTOR_BACKEND` | RAG vector store: `pgvector` (default) \| `qdrant` \| `disabled` |
| `JWT_SECRET` | Auth tokens |
| `PLATFORM_API_KEY` | Customer API + reminder cron + smoke scripts |
| `RESEND_*` | Transactional email (OTP, assignments, survey invites, password reset) |
| `RESEND_WEBHOOK_SECRET` | Email delivery/bounce webhooks → audit log |
| `GEMINI_API_KEY` | Server LLM / embeddings default |
| `VITE_GEMINI_API_KEY` | Browser Knowledge Chat (build arg in Docker) |
| `VITE_LOGIN_LANG` | Default login UI language (`en` \| `tr`; rebuild required) |
| `REDIS_URL` | KB ingest queue (optional; inline fallback when unset/unreachable) |
| `KB_HYBRID_SEARCH_ENABLED` | Hybrid pgvector + full-text retrieval |
| `COHERE_API_KEY` | Optional rerank for KB search |
| `S3_*` | MinIO/S3 for uploads (`S3_ENDPOINT`, `S3_BUCKET`, keys) |
| `BACKUP_HOST_PWD` | Host path for scheduled backup Docker command |

See [`.env.example`](.env.example) and [`docs/operations/prod-env-template.md`](docs/operations/prod-env-template.md) for the full list.

---

## Development

```bash
npm run lint          # TypeScript check
npm test              # Vitest (client + server)
npm run test:server
npm run test:server:sql   # SQL integration tests (Testcontainers Postgres)
npm run test:client
npm run smoke:ship    # POST-deploy smoke (set BASE_URL)
```

### Database (Prisma)

```bash
npm run db:provider postgresql   # select engine (postgresql | mysql)
npm run db:generate              # generate Prisma client
npm run db:deploy                # apply migrations (prod)
npm run sql:push                 # sync schema to the DB (local/dev)
npm run dev:set-password -- email@example.com 'NewPassword123'
```

Backups are automated via **Settings → Backup** (engine-aware `pg_dump`), or run `pg_dump "$DATABASE_URL"` directly.

### Docker services

```bash
docker compose up --build -d    # app + PostgreSQL (pgvector) + Redis + Qdrant + MinIO
docker compose -f docker-compose.minio.yml up   # MinIO only
```

After code or frontend env changes: `docker compose up --build -d app`.

---

## Documentation

Full index: [`docs/README.md`](docs/README.md).

| Doc | Content |
|-----|---------|
| [`CLAUDE.md`](CLAUDE.md) | Architecture, data model, contributor guide |
| [`docs/guides/application-features-guide.md`](docs/guides/application-features-guide.md) | Feature catalog — all modules (emissions, materiality, tasks, etc.), Word export available |
| [`docs/guides/user-guide-tr.md`](docs/guides/user-guide-tr.md) | **Turkish user guide** (Markdown) — roles, workflows, troubleshooting |
| [`docs/guides/user-guide-tr.docx`](docs/guides/user-guide-tr.docx) | Turkish user guide (Word export for distribution) |
| [`docs/guides/user-guide.md`](docs/guides/user-guide.md) | English user guide |
| [`docs/guides/platform-guide.md`](docs/guides/platform-guide.md) | Business / platform overview |
| [`docs/features/materiality-survey-module-plan.md`](docs/features/materiality-survey-module-plan.md) | Materiality Survey module design & delivery |
| [`docs/operations/prod-env-template.md`](docs/operations/prod-env-template.md) | Production env checklist |
| [`docs/operations/smoke-checklist.md`](docs/operations/smoke-checklist.md) | Post-deploy smoke tests |
| [`docs/security_spec.md`](docs/security_spec.md) | Threat model |
| [`docs/sqlmigration/README.md`](docs/sqlmigration/README.md) | MongoDB → PostgreSQL migration journal |
| [`docs/sqlmigration/prod-cutover-checklist.md`](docs/sqlmigration/prod-cutover-checklist.md) | Production cutover checklist |
| [`docs/adr/ADR-08-customer-rag-autofill.md`](docs/adr/ADR-08-customer-rag-autofill.md) | Customer RAG autofill ADR |
| [`docs/hermit/architecture-review.md`](docs/hermit/architecture-review.md) | AI Quality & Continuous Improvement (Hermit) — architecture, what's built/verified vs. planned |

### Turkish user guide

For Turkish-speaking consultants and Firma users:

- **Markdown:** [`docs/guides/user-guide-tr.md`](docs/guides/user-guide-tr.md) — maintained in-repo
- **Word:** [`docs/guides/user-guide-tr.docx`](docs/guides/user-guide-tr.docx) — export for email / offline distribution
- Covers all six platform roles (Platform Admin, Consultant Manager, Consultant, Contributor, Customer, Auditor), navigation, magic links, materiality surveys, and common issues
- UI label **Firma** (formerly Müşteri) used throughout

---

## Known limitations

- **Consistency conflicts** — rare when all frameworks read the same emission ledger; meaningful diffs need distinct sources (e.g. TSRS answer text vs ledger).
- **Stakeholder autofill** — documents without emails require manual entry in the review modal.
- **Survey reminders** — the `/api/materiality/surveys/cron/reminders` sweep must be scheduled (scheduler job or external cron) to send reminder emails automatically.
- **Scheduled backup** — requires Docker socket in app container; verify job logs after first run.
- **Large avatars without S3** — files over 350 KB need working MinIO/S3 or upload fails.
- **AI Quality subsystem** — only the enable/disable toggle and Overview are built. Evaluation runs, adapter experiments, approvals, and quality trends are designed but not yet implemented; see `docs/hermit/architecture-review.md` for exact status.

---

## License

See repository license / SPDX headers in source files.
