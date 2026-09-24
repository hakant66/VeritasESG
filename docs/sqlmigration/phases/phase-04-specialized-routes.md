# Phase 4 — Specialized routes

**Plan reference:** Migration plan §10 Phase 4 (8–12 days estimated)

## Planned

Port ~350 direct Mongoose calls across specialized routes and `server.ts`:

- Auth, OTP, password reset (`server.ts`)
- Emissions (including one `$group` aggregation)
- Materiality / GRI / ESRS / ISSB assessments
- Compliance, climate scenarios
- Assignments, audit review, on-behalf responses
- KB/RAG metadata routes
- Scheduler + backup UI integration

## Delivered (partial)

| Item | Path | Status |
|------|------|--------|
| Engine-aware backup command | `server/lib/backupCommand.ts` | Done |
| OTP TTL SQL sweep | `server/lib/otpCleanup.ts` | Done |
| **Batch A — auth + boot** | | **Done** |
| Platform auth seam (Mongo + Prisma) | `server/data/platformAuth.ts` | Login, OTP, password reset, session lookup |
| JWT session resolution on SQL | `server/lib/requestAuth.ts` | Uses `platformAuth` |
| Auth routes wired | `server.ts` | `/api/auth/login`, `/me`, OTP, password reset |
| OTP cleanup at boot | `server.ts` | `startOtpCleanup()` |
| Backup default at boot + API | `server.ts`, `schedulerRoute.ts` | Log + `GET .../default-command` |
| Settings backup UI | `SettingsPage.tsx` | Fetches engine-aware default command |
| `dev:set-password` dual sync | `scripts/dev-set-password.ts` | Updates Mongo + SQL when `DATABASE_URL` set |
| Porting pattern documented | `docs/migration/mongo-to-sql-implementation-status.md` | Done |
| **Batch B — emissions + materiality** | | **Done** |
| Emissions SQL handlers | `server/data/emissionsSql.ts` | All `/api/emissions/*` incl. `groupBy` yearly totals |
| Materiality SQL handlers | `server/data/materialitySql.ts` | `/api/materiality/*` |
| GRI matrix SQL handlers | `server/data/griMaterialitySql.ts` | `/api/gri-materiality/*` |
| DMA assessment SQL handlers | `server/data/dmaAssessmentSql.ts` | GRI / ESRS / ISSB assessment routes |
| Dual-driver route wrapper | `server/lib/routeDb.ts` | `withDb()` branches Mongo vs SQL per handler |
| **Batch C — compliance + climate** | | **Done** |
| Compliance data access | `server/data/complianceDataAccess.ts` | Framework reqs, runs, mappings, conflicts |
| Climate data access | `server/data/climateDataAccess.ts` | Levers + climate scenarios |
| Entity lookup | `server/data/entityLookup.ts` | `findProjectById` dual-id |
| Compliance services on SQL | `server/services/compliance/*.ts` | Registry, completeness, consistency, scenarios |
| **Batch D — workflow + KB + scheduler** | | **Done** |
| Workflow data access | `server/data/workflowDataAccess.ts` | Assignments, answers, on-behalf, audit review |
| Scheduler data access | `server/data/schedulerDataAccess.ts` | Scheduled jobs CRUD + run status |
| KB/RAG metadata access | `server/data/kbRagDataAccess.ts` | Documents, ingest jobs, chunks (vectors via Phase 5) |
| Workflow routes + libs | `onBehalfResponse`, `assignmentManage`, `auditReview`, email/notice libs | Dual-driver via data access |
| KB RAG route | `server/routes/kbRagRoute.ts` | `withDb()` + metadata on SQL |
| Scheduler route + service | `schedulerRoute.ts`, `schedulerService.ts` | Prisma scheduled jobs |
| **Batch E — Lib helpers** | | **Done** |
| Project lib data access | `server/data/projectLibDataAccess.ts` | Branches, clone/expand/repair, questionnaire delete |
| Audit + app settings access | `server/data/auditLogDataAccess.ts`, `appSettingDataAccess.ts` | Email audit log, LLM settings |
| Boot seed access | `server/data/seedDataAccess.ts` | Emission factors, GFANZ, levers, framework reqs/mappings |
| Assignment + clone libs | `assignmentQuestionSync`, `cloneTemplateQuestionsToProject`, `expandStaleBranchQuestionsInProject`, `repairBranchQuestionTextInProject` | Dual-driver via data access |
| Audit / conflict / LLM libs | `answerAuditLog`, `auditReviewStakeholders`, `openAssignmentConflict`, `emailDeliveryAuditLog`, `llm/llmConfig` | Dual-driver |
| RAG autofill + text search | `taskQuestionAutofill`, `taskQuestionKbSearch`, `mongoTextKbSearch`, `customerAutofill`, `knowledgeChatAnswer` | SQL keyword fallback + chunk counts |
| Boot seeds | `*Seed.ts` under `server/lib/` | All route through `seedDataAccess` |

### Estimated coverage

~**100%** of Phase 4 scope (Batch A+B+C+D+E + conditional Mongo boot).

## Remaining (priority order)

### Batch A — Boot + auth

- [x] `server.ts`: call `startOtpCleanup()` at boot
- [x] `server.ts` auth routes: login, OTP, `/api/auth/me`, password reset → `platformAuth` / Prisma when `DB_DRIVER=sql`
- [x] `requestAuth.ts`: session resolution on SQL
- [x] `GET /api/admin/scheduled-jobs/default-command` + Settings UI uses `getDefaultBackupCommand()`
- [x] Conditional `connectMongo()` at boot — skipped when `DB_DRIVER=sql`; `connectMongo({ force: true })` for ETL scripts

### Batch B — High-traffic features

- [x] `server/routes/emissionsRoute.ts` (+ `groupBy` aggregation via Prisma `groupBy`)
- [x] `server/routes/materialityRoute.ts`, `griMaterialityRoute.ts`
- [x] `server/routes/griAssessmentRoute.ts`, `esrsAssessmentRoute.ts`, `issbAssessmentRoute.ts`

### Batch C — Compliance & climate

- [x] `server/routes/complianceRoute.ts` (+ `server/data/complianceDataAccess.ts`, service updates)
- [x] `server/routes/climateRoute.ts` (+ `server/data/climateDataAccess.ts`, `ClimateScenarioService`)

### Batch D — Workflow

- [x] `server/data/workflowDataAccess.ts` — assignments, answers, contacts, on-behalf
- [x] `server/data/schedulerDataAccess.ts` + `schedulerService.ts`
- [x] `server/data/kbRagDataAccess.ts` + `ingestKbDocument.ts`
- [x] `server/routes/onBehalfResponse.ts`
- [x] `server/routes/assignmentManage.ts`, `auditReview.ts`
- [x] `server/routes/kbRagRoute.ts` (metadata; vectors via Phase 5 seam)
- [x] `server/routes/schedulerRoute.ts`

### Batch E — Lib helpers

- [x] `server/data/projectLibDataAccess.ts` — branches, clone/expand/repair, project/customer lookup
- [x] `server/data/auditLogDataAccess.ts`, `appSettingDataAccess.ts`, `seedDataAccess.ts`
- [x] `server/lib/**` assignment sync, clone/expand, audit, LLM, conflict libs
- [x] RAG autofill + `mongoTextKbSearch` SQL keyword fallback
- [x] Boot seeds (`emissionFactor`, GFANZ pathways, transition levers, framework reqs/mappings, TSRS)

## Per-route pattern

1. Add query/write to repository or `getPrisma()` bespoke SQL
2. Top of handler: `if (isSqlDriver()) { ...; return; }`
3. `serialize()` from `server/lib/apiSerialize.ts` on responses
