# Documentation index

Markdown in this repo is grouped by purpose. **Filenames are preserved** for historical snapshots and delivery artifacts (no cosmetic renames).

## Root (repository)

| File | Purpose |
|------|---------|
| [`README.md`](../README.md) | Project overview, quick start, capabilities |
| [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md) | Contributor and agent guidance |
| [`docs/README.md`](README.md) | This index |

## Guides (operators & users)

| File | Purpose |
|------|---------|
| [`guides/application-features-guide.md`](guides/application-features-guide.md) | **Feature catalog** — all modules (emissions, materiality, tasks, etc.) |
| [`guides/application-features-guide.docx`](guides/application-features-guide.docx) | Feature catalog (Word export) |
| [`guides/user-guide.md`](guides/user-guide.md) | English user guide |
| [`guides/user-guide-tr.md`](guides/user-guide-tr.md) | Turkish user guide (Markdown) |
| [`guides/user-guide-tr.docx`](guides/user-guide-tr.docx) | Turkish user guide (Word export) |
| [`guides/platform-guide.md`](guides/platform-guide.md) | Business / platform overview |
| [`guides/PLATFORM_WORKFLOW_GUIDE.md`](guides/PLATFORM_WORKFLOW_GUIDE.md) | User-facing workflow |
| [`guides/COMPLETE_SYSTEM_WORKFLOW.md`](guides/COMPLETE_SYSTEM_WORKFLOW.md) | Full platform workflow + gap context |

## Architecture & design

| File | Purpose |
|------|---------|
| [`architecture/architecture.md`](architecture/architecture.md) | Architecture review, issues, ADR index |
| [`architecture/tech-stack-architecture.md`](architecture/tech-stack-architecture.md) | Technical stack reference |
| [`architecture/architecture-priority-1.md`](architecture/architecture-priority-1.md) | Priority 1 compliance features blueprint |
| [`architecture/architecture-target-structure-and-backlog.md`](architecture/architecture-target-structure-and-backlog.md) | Target structure backlog |
| [`architecture/gap-analysis-enterprise-requirements.md`](architecture/gap-analysis-enterprise-requirements.md) | Enterprise gap analysis |
| [`adr/`](adr/) | Architecture decision records |
| [`design/`](design/) | Feature design specs (Tasks 1, 4, 7) |

## SQL migration (in progress)

| File | Purpose |
|------|---------|
| [`sqlmigration/README.md`](sqlmigration/README.md) | **Implementation journal** — planned vs delivered per phase |
| [`sqlmigration/01-delivery-log.md`](sqlmigration/01-delivery-log.md) | Chronological delivery log |
| [`sqlmigration/local-dev-runbook.md`](sqlmigration/local-dev-runbook.md) | Dual-stack Mongo + Postgres setup |
| [`migration/mongo-to-sql-migration-plan.md`](migration/mongo-to-sql-migration-plan.md) | Migration plan and locked decisions |
| [`migration/mongo-to-sql-implementation-status.md`](migration/mongo-to-sql-implementation-status.md) | Short status companion |

## Operations & QA

| File | Purpose |
|------|---------|
| [`operations/prod-env-template.md`](operations/prod-env-template.md) | Production environment checklist |
| [`operations/smoke-checklist.md`](operations/smoke-checklist.md) | Post-deploy smoke tests |
| [`operations/ollama-gpu-host-setup.md`](operations/ollama-gpu-host-setup.md) | Ollama GPU host setup |
| [`qa/test-plan.md`](qa/test-plan.md) | Test coverage plan |
| [`qa/ui-quality-report.md`](qa/ui-quality-report.md) | UI quality report |
| [`security_spec.md`](security_spec.md) | Threat model & data invariants |

## RAG & knowledge base

| File | Purpose |
|------|---------|
| [`rag/rag-hybrid-rerank-prep.md`](rag/rag-hybrid-rerank-prep.md) | Hybrid search + rerank prep |

## Delivery packages & prompts

| Location | Purpose |
|----------|---------|
| [`delivery/priority-1/`](delivery/priority-1/) | June 2026 Priority 1 delivery package (task list, integration guide, kickoff) |
| [`prompts/`](prompts/) | AI implementation prompts (Tasks 2, 3, 5) |

## Changelog (session notes)

| File | Purpose |
|------|---------|
| [`changelog/2026-09-09-fixes.md`](changelog/2026-09-09-fixes.md) | SQL/migration fixes, ETL map, UI tests — 9 Sep 2026 |

## Archive (point-in-time snapshots)

Historical reports kept **as-is** — not renamed or maintained as living docs.

| Location | Purpose |
|----------|---------|
| [`archive/changelog/CHANGELOG_LAST_5_DAYS.md`](archive/changelog/CHANGELOG_LAST_5_DAYS.md) | Changes Jun 17–22, 2026 |
| [`archive/e2e-techcorp/`](archive/e2e-techcorp/) | TechCorp E2E test automation snapshot |
| [`archive/reports/FEATURE_VERIFICATION_REPORT.md`](archive/reports/FEATURE_VERIFICATION_REPORT.md) | DMA auto-template verification (Jun 2026) |
| [`archive/firebase-blueprint.json`](archive/firebase-blueprint.json) | Legacy Firestore entity schema (pre-Mongo migration) |

## PR notes

| File | Purpose |
|------|---------|
| [`notes/pr-6-query-shadcn.md`](notes/pr-6-query-shadcn.md) | PR 6 notes |
| [`notes/pr-7-features-tasks.md`](notes/pr-7-features-tasks.md) | PR 7 notes |
| [`notes/pr-8-features-knowledge-base.md`](notes/pr-8-features-knowledge-base.md) | PR 8 notes |
