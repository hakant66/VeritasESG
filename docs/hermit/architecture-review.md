# VeritasESG AI Quality & Continuous Improvement — Architecture Review

Status: **Stage 1 (Discovery) complete. Stage 2 (Evaluation foundation) started.**
This document is the mandatory first deliverable before any Hermit integration code was written, per the project brief's own implementation order. It records what was actually found in the repository (not assumed) and the integration design that follows from it.

## 1. What Hermit actually is (verified against the real repo/docs, 2026-10-30)

- Repo: `github.com/Infini-AI-Lab/hermit` (Apache-2.0, Python, 406 stars, active — last push 2026-10-30).
- A **harness adapter** is an external, trainable artifact (in the simplest case, plain text files like `ADAPTER.md`) that is *injected into* an existing agent's prompt/context without touching the agent's own code or model weights.
- Hermit's **custom-task integration contract** (verified via the docs' "Bring your own task" tutorial) is three files:
  - `pipeline.py` — `def run(task: dict, adapter: Path | None) -> RunOutput` — this is where *we* call our own code. The docs explicitly say to "replace its interpreter with your agent call." It does **not** require a specific supported agent host (Codex etc.) — an arbitrary HTTP call from inside `run()` is a supported, documented pattern.
  - `judge.py` — `def score(task: dict, output: RunOutput) -> JudgeResult` — scoring logic (deterministic, reference-based, or LLM-assisted).
  - `task-info/README.md` — human/learner-facing description of the task.
- Core install: `python -m pip install hermit-harness` (PyPI) or `pip install -e .` from a source checkout. **Requires Python 3.12+.** No GPU required for evaluation. Linux + `bubblewrap` is only required for *sandboxed learner-program execution* (one specific evolution path we are not using yet) — plain HTTP-pipeline evaluation runs fine on macOS or in a regular Linux container.
- Evolution methods (GEPA, SkillOpt, MWM, Harness², Continual Harness, ReHarness) are **separate, optional dependency groups** (`--group gepa`, etc.), not part of the core install. None are installed by this change.
- Confirmed local dev environment: Python 3.14.4 is available (exceeds the 3.12+ requirement for the core; the `harness2`/`all` groups specifically fail on 3.14 — irrelevant until we adopt one of those methods).

**Conclusion:** Hermit fits our need (evaluate, then later evolve, the *prompting* around our existing LLM calls) without requiring us to adopt an "agent host" concept we don't have. The adapter's natural home in VeritasESG is as a block of extra instruction text that an already-existing prompt-builder function can optionally append.

## 2. VeritasESG's actual AI architecture (as found, not assumed)

### LLM provider abstraction
- `lib/llmSettings.ts` — provider-neutral settings type (`gemini`/`openai`/`claude`/`ollama`), stored via the existing generic `AppSetting` key/value table (`key = 'llm'`).
- `server/lib/llm/llmConfig.ts` — loads/caches/saves those settings (5s cache TTL), exposes `resolveLlmRuntimeConfig()`.
- `server/lib/llm/llmService.ts` — provider-agnostic `generateTextFromPrompt` / `embedTexts` etc., dispatching to `server/lib/llm/providers/{gemini,openai,claude,ollama}.ts`.
- Admin UI: `src/components/admin/LlmSettingsPanel.tsx`, mounted in `src/pages/admin/SettingsPage.tsx` (`platform_admin`-only page). Backed by `server/routes/llmSettingsRoute.ts` (`GET/PUT /api/admin/llm-settings`).

This is the exact pattern the new AI Quality toggle (section 4) and the eventual adapter-settings panel reuse.

### RAG / retrieval
- `server/lib/rag/` — `chunkText.ts`, `hybridKbSearch.ts` (vector + Postgres full-text), `keywordKbSearch.ts`, `rerankKbHits.ts` (optional Cohere), `qdrantStore.ts`.
- **Vector storage is actually Qdrant in this deployment** (`docker-compose.yml`: `qdrant` service, `VECTOR_BACKEND: pgvector` env default is set but `qdrantStore.ts` is what's wired into `ingestKbDocument.ts`'s `getVectorStore()`). The Postgres `kbchunks.embedding` pgvector column exists in the schema and is restored by `prisma/sql/pgvector-and-partial-indexes.sql` after every `prisma db push`, but no application code reads it for search — it appears to be a legacy/parallel path, not the active one. **Flagged as a discrepancy for the team to confirm, not something this change alters.**
- `server/lib/rag/kbIngestQueue.ts` — BullMQ-backed ingest queue (Redis), with an inline-fallback when Redis is unreachable. (This file and `kbRagDataAccess.ts` had a real, separate bug — ingest job status never persisting — found and fixed in this same session, unrelated to Hermit.)

### Target evaluation surfaces (the four modules named in the brief)
| Module | Verified entry point | Verified implementation |
|---|---|---|
| A. Local questionnaire autofill | `POST /api/kb-rag/tasks/autofill-answer` (`server/routes/kbRagRoute.ts:235`) | `server/lib/rag/taskQuestionAutofill.ts`. Prompt built by `lib/taskLocalAutofillPrompt.ts::buildLocalAutofillUserPrompt` (local/RAG mode) or `lib/taskGeneralAutofillPrompt.ts` (general mode, customizable per-admin in `LlmSettingsPanel`). Retrieval via `searchKbHitsForTaskQuestion` → `taskQuestionKbSearch.ts`. |
| B. Customer ESG profile autofill | `POST /api/kb-rag/customers/:customerId/autofill` | `server/lib/rag/customerAutofill.ts` + `customerAutofillGroups.ts` (defines the extractable field groups: `basic`, `stakeholders`, `facilities`, `sector` — trimmed down earlier this session). |
| C. Knowledge-base RAG | Backs modules A/B | `hybridKbSearch.ts`, `searchCustomerKb.ts`, `searchKnowledgeKb.ts`, `knowledgeChatAnswer.ts` (chat UI). |
| D. Compliance assistance | *Not found as named.* `POST /api/compliance/validate-completeness` and `POST /api/compliance/check-consistency` from the brief **do not exist in this repository.** The closest real analogues are the materiality/DMA and ESRS/ISSB assessment routes (`registerESRSAssessmentRoutes`, `registerISSBAssessmentRoutes` in `server.ts`) and `taskCustomerProfileContext.ts`. **This module is deferred until the team confirms which real endpoint it maps to** — evaluating a route that doesn't exist was not attempted. |

Priority target confirmed per the brief: **Module A (local questionnaire autofill)** — the PoC pipeline (section 5) targets this first.

### Auth, roles, tenant isolation
- `lib/platformRoles.ts` — canonical roles: `platform_admin, consultant_manager, consultant, contributor, customer, auditor`. "System admin" in the brief maps 1:1 to `platform_admin`.
- `server/lib/requestAuth.ts::resolvePlatformUserFromRequest` — JWT → `PlatformUser`. No FK constraints anywhere in the schema (CLAUDE.md convention); all scoping is app-level `customerId`/`projectId` string matching, e.g. `assertTaskQuestionAutofillAccess` on the autofill route.
- `src/pages/admin/SettingsPage.tsx` already gates its **entire page** to `profile.role === 'platform_admin'` client-side; every admin route handler in this codebase (e.g. `llmSettingsRoute.ts`) re-checks the role server-side independently — the new AI Quality settings route follows the identical pattern (see section 4).

### Background jobs
- BullMQ + Redis (`server/lib/rag/kbIngestQueue.ts`) is the only existing background-job mechanism. It degrades to synchronous inline execution when Redis is unreachable. The Hermit worker (section 6) is **not** built on this queue — it is Python, not Node, and is deliberately a separate, isolated process (see "Integration strategy" below).

### Tests
- `tests/` has client (Vitest + RTL) and server test suites; `npm run lint`, `npm test`, `npm run test:server`, `npm run test:client` are real, working scripts (confirmed in `package.json`). `npm run test:server:sql` requires an isolated test DB — not run in this pass; Hermit-specific tests are deferred to Stage 3 (section 8).

### Git status at start
- Repository was on `main`, clean, several unrelated feature commits from the same day already pushed (GRI template seeding, bulk-form-delete, additive Form-Ekle, KB-ingest-status bugfix). This Hermit work is additive on top of that history; nothing was reverted.

## 3. Integration strategy decision

**Option A (isolated Python worker) chosen over Option B (ad-hoc CLI invocation from Express).**

Reasoning:
- Hermit is Python 3.12+; the app is Node/TypeScript (`tsx`). Embedding Python execution inside an Express request handler (even via `child_process`) would mean every evaluation request blocks a request-handling process on arbitrary, potentially long-running (minutes) subprocess work — unacceptable for a production API process, and explicitly forbidden by the brief ("Do not embed uncontrolled Python execution directly inside Express request handlers").
- A dedicated `hermit-worker` service (new, **optional**, `docker-compose` entry — see section 6) keeps Hermit's process, its Python dependency tree, and any sandboxed execution it does for specific evolution methods, fully isolated from the production app container. The Express app talks to it only over an internal HTTP API, and only when the `aiQuality.enabled` flag (section 4) is true.
- This mirrors the existing pattern of an isolated service reached over HTTP/internal network (Qdrant, MinIO) rather than growing a new kind of coupling.

## 4. What is built and live-tested in this pass (Stage 2, slice 1)

**The literal ask — "make Hermit usage optional, managed by the system admin" — implemented end-to-end:**

| Layer | File | Verified |
|---|---|---|
| Settings type | `lib/aiQualitySettings.ts` | — |
| Server config (AppSetting-backed, `key = 'aiQuality'`, mirrors `llmConfig.ts`) | `server/lib/aiQuality/aiQualityConfig.ts` | `isAiQualityEnabled()` is the one gate every future Hermit code path must check first |
| Admin API (`platform_admin`-only, mirrors `llmSettingsRoute.ts`) | `server/routes/aiQualityRoute.ts` (`GET/PUT /api/admin/ai-quality/settings`), registered in `server.ts` | ✅ live-tested via curl: defaults `enabled:false`, PUT persists, GET reflects it |
| Client hook | `src/shared/hooks/useAiQualitySettings.ts` | — |
| Admin UI | `src/components/admin/AiQualityPanel.tsx`, new "AI Quality" tab in `src/pages/admin/SettingsPage.tsx` | ✅ live-tested via Playwright: toggle flips, persists across reload, resets correctly, renders correctly in Turkish |
| i18n | `src/lib/i18n.ts` (EN + TR, `tabAiQuality` + `aiQuality*` keys) | ✅ confirmed in live TR render |

Default is **off**. No evaluation runs, adapters, or prompt changes occur unless a `platform_admin` explicitly enables it — and even then, nothing downstream exists yet to act on it (section 7 explains why that's deliberate).

### Schema (additive, migrated, verified)

Seven new tables, pushed via the project's own documented `sql:push` + `sql:extras` flow and confirmed present in Postgres:

`aievaluationdatasets`, `aievaluationcases`, `aievaluationruns`, `aievaluationresults`, `aiadapterversions`, `aiadapterapprovals`, `aiadapterdeployments` — see `prisma/schema.prisma` (appended at the end, under the "VeritasESG AI Quality & Continuous Improvement" banner comment) for exact fields. No existing table's columns were dropped; the only data-loss warning from `prisma db push` was the pre-existing, already-documented `kbchunks.embedding`/`text_tsv` false positive (restored by `sql:extras`; `embedding` itself is confirmed unused by any code path, see section 2).

Design notes:
- No `legacyFirebaseId`/`ownerId` on the new models — there is no Firebase migration history for them, and adapters are intentionally **global**, not per-customer (see section 7's tenant-isolation reasoning), so there's no natural "owner" scope.
- `AiAdapterVersion.contentText` holds small adapter text directly; `contentFileUrl` is there for the "store larger artifacts in object storage, keep a reference + hash in Postgres" requirement once a real adapter is large enough to need it (MinIO is already wired into this app for exactly this purpose).
- `AiEvaluationRun.adapterVersionId` nullable = baseline run (no adapter).

## 5. Priority PoC target: local questionnaire autofill

Scaffolded (not yet executed against a live `hermit` install — see "Known limitations" below):

```
hermit/
  pipelines/
    questionnaire_autofill/
      pipeline.py       # run(task, adapter) -> calls POST /api/kb-rag/tasks/autofill-answer
      judge.py           # score(task, output) -> deterministic + reference-based checks
      task-info/
        README.md
  datasets/
    questionnaire_autofill/
      starter.json        # 8 illustrative cases (not the full ~200); schema matches the brief's example
  configs/
    questionnaire_autofill_smoke.yaml
  adapters/                # empty; populated once a real training run produces one
  judges/                  # shared judge helpers (schema validation, citation checks)
  results/                 # .gitignore'd — evaluation run output
  reports/                 # .gitignore'd — human-readable summaries
```

`pipeline.py`'s `run()` makes a real HTTP call to the real, existing `/api/kb-rag/tasks/autofill-answer` endpoint — no duplicate/parallel autofill logic was written. It reads the adapter (if any) and, when present, forwards its text as an extra instruction block; wiring that block into `buildLocalAutofillUserPrompt` itself is **not yet done** (see limitations) because there is no approved adapter to inject yet and no case to test the splice against.

`judge.py` implements only deterministic/reference-based checks for now (schema validity of the response, presence/absence of citations matching `expected_citations`, correct `insufficient_evidence` handling) — no LLM-assisted judge yet, per the brief's instruction to start with evaluation-only, deterministic-first.

## 6. `hermit-worker` service (scaffolded, not started by default)

Added to `docker-compose.yml` under Docker Compose **profiles** (`profiles: ["hermit"]`), so `docker compose up` / `npm run docker:up` **does not start it** — it only runs via `docker compose --profile hermit up hermit-worker`, an explicit opt-in on top of the application-level toggle in section 4. This gives two independent gates: the admin UI switch (whether the *application* will attempt to call out to Hermit) and the operator's own decision to actually run the worker container at all.

- `hermit-worker/Dockerfile` — `python:3.12-slim`, installs `hermit-harness` (core only — no evolution-method dependency groups) plus `requests`/`fastapi`/`uvicorn` for its own tiny control API.
- Not yet built or started in this pass (no Python dependency has touched the running stack; the main `app` image is unchanged by this).

## 7. Governance decisions made now, deliberately conservative

- **No prompt injection path is wired up yet.** Even with the flag on, nothing currently changes any AI output, because no `AiAdapterDeployment` row can exist yet (no evaluation has run, no adapter has been approved). This is intentional: the toggle exists and is fully functional, but it currently gates "nothing to gate" — exactly matching the brief's Phase 3 instruction ("Do not enable automatic adapter modification during this phase").
- **Adapters are global, not per-customer**, per the brief's own stated preference ("Prefer a globally trained generic adapter without customer-specific confidential content") — this sidesteps the hardest tenant-isolation problem (a learned adapter leaking one customer's content into another customer's prompts) by construction, for the initial phase. If a future phase needs customer-specific adapters, it needs its own isolation design before being built — not assumed safe by default.
- **`platform_admin`-only** for both the toggle and (once they exist) every evaluation/adapter-management endpoint, server-side-checked (not just hidden in the UI), matching every other admin surface in this codebase.
- **No live customer documents are used by the starter dataset** — the 8 illustrative cases in `hermit/datasets/questionnaire_autofill/starter.json` are synthetic, not pulled from any real customer's Knowledge Base.

## 8. Known limitations / explicitly not done in this pass

Being honest about scope, per the brief's own "clearly distinguish completed and tested from partially implemented or proposed" requirement:

1. **`hermit-harness` is not installed anywhere yet** (not in a venv, not in a container). `hermit check`/`hermit eval` have not been run. The pipeline/judge/task files are written against the verified real contract but are untested against the real CLI.
2. **No service-account authentication exists yet** for the Python worker to call the real, `requireAuth`-protected `/api/kb-rag/tasks/autofill-answer` endpoint. `pipeline.py` reads a `HERMIT_SERVICE_TOKEN` env var that does not yet correspond to a real, provisioned, scoped-down platform user — this needs a real decision (dedicated evaluation service account vs. a new narrow service-auth header) before any real evaluation run can execute.
3. The dataset has **8 starter cases, not ~200**. Expanding it is expert-reviewable content work, not something to fabricate.
4. **Module D (compliance assistance)** evaluation is deferred — the two endpoints named in the brief do not exist in this repository; needs a decision from the team on the real mapping before any work starts there.
5. **No Judge uses an LLM yet** — deterministic/reference checks only.
6. **No adapter has ever been trained, evaluated, approved, or deployed** — `AiAdapterVersion`/`AiAdapterApproval`/`AiAdapterDeployment` tables exist and are migrated, but are empty, and no UI exists yet to populate them (the "Evaluation runs", "Adapter experiments", "Approval management", "Quality trends" sections of the brief's Phase 8 are not built — only "Overview" exists, and only its toggle is functional).
7. **No Hermit-specific automated tests** exist yet (dataset validation, judge correctness, tenant isolation, prompt injection, rollback, etc. — all listed in the brief's Phase 10).
8. The remaining `docs/hermit/*.md` files (integration-design, installation-guide, evaluation-methodology, adapter-management, governance-safeguards, operations-runbook, implementation-report) are not written yet — this file covers what they'd collectively need to, but is not a substitute for them.

## 9. Recommended next slice (not started)

In order: (a) decide and implement the worker's service-authentication mechanism, (b) install `hermit-harness` in `hermit-worker` and get `hermit check`/`hermit eval` running against the starter dataset with a **baseline, no-adapter** run only, (c) persist that run's results into `AiEvaluationRun`/`AiEvaluationResult`, (d) build the "Evaluation runs" admin UI section to trigger/inspect it. Do not attempt adapter *training* until (a)–(d) are working and reviewed.
