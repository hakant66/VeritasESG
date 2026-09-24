# Implementation Plan — Materiality Assessment Survey Module

> Status: **Delivered (Phases 1–6).** Source prompt: `materiality-survey-module-prompt.md`.
> Decision taken: **extend the existing materiality/DMA subsystem** (reuse topics, CSV,
> matrix chart, token flow) rather than build a parallel module.
>
> **Delivery summary** (all on `main`, SQL-only):
> - P1 — Prisma models + migration `20260723200000_materiality_survey_module` + `server/data/materialitySurveyDataAccess.ts`.
> - P2 — admin CRUD `server/routes/materialitySurveyRoute.ts` + `src/features/materiality-survey/` (list page, IRO/stakeholder builders).
> - P3 — public tokenized `SurveyRunnerPage` + `/api/materiality/survey/:token` (GET context, POST responses).
> - P4 — invite (`/invite`) + idempotent reminder sweep (`/cron/reminders`) via Resend.
> - P5 — matrix (`/matrix`, weighted aggregation) + scoring table + CSV export.
> - P6 — threshold audit logging, RBAC (admin-gated mutations), TR/EN runner i18n, 5 SQL integration tests.
>
> All 6 acceptance criteria met. Scheduling the reminder sweep is a deploy step (scheduler shell job or external cron hitting `/cron/reminders` with `PLATFORM_API_KEY`).

## 1. What already exists (reused, not rebuilt)

| Capability | Existing asset |
|---|---|
| Topic longlist + CSV (`id;subject;griMapping;disclosures;financialImpact;impactSeverity;probability;stakeholderConcern;isMaterial;notes`) | `MaterialityTopic`, `GRIMaterialityMatrixRow` models; `src/lib/materialityScoringCsv.ts` |
| Materiality matrix visual (SVG, `matrixCoordinates`) | `src/components/customer/MaterialityMatrixChart.tsx` (props: `scores`, `topicLabels`) |
| Admin materiality UI | `MaterialityDesignPage.tsx`, `DMAPage.tsx`, `GRIMaterialityTab.tsx` |
| Tokenized public response (no login, JWT magic link) | `server/routes/onBehalfResponse.ts`, assignment magic-link helpers |
| Reminder-log pattern | `assignmentreminderlogs` table |
| Cron scheduler | `scheduledjobs` + `schedulerService.ts` / `schedulerRoute.ts` |
| Transactional email | `sendResendEmail` (`server/lib/resendEmail.ts`) |
| i18n (TR default) | `src/lib/i18n.ts` + `useTranslation` |
| Dual-driver data seam | `server/data/*DataAccess.ts` + `withDb()` / `isSqlDriver()` |

**The current model is single-scorer** (an admin types `financialImpact/impactSeverity/...` on `MaterialityTopic`). This module adds a **crowd-sourced survey layer** on top and feeds aggregated results back into the same matrix.

## 2. Naming note

The app already uses **Project** for reporting projects. To avoid collision, the survey campaign entity is **`MaterialitySurvey`** (not `materiality_projects`). "IRO" and "stakeholder" concepts are new.

## 3. Data model — new Prisma models (additive)

All follow repo conventions: `id String @id @default(cuid())`, `legacyFirebaseId?`, `createdBy?`, `ownerId?`, `createdAt/updatedAt`, `@@map` lowercase.

```
MaterialitySurvey        (campaign)
  id, customerId, subeId?, title, standardRef (GRI|ESRS|SASB), year?,
  status (draft|collecting|scoring|finalized), deadline?,
  scaleMax Int @default(5),
  topicRollup (max|weighted_avg) @default(max),
  materialThreshold Float?, reminderCadence Json @default("[3,7]"), reminderCutoffDays Int @default(14),
  maxReminders Int @default(3)
  @@index([customerId])

MaterialityIro
  id, surveyId (FK), topicRef (String → longlist row id/esrsId), description,
  iroType (impact|risk|opportunity), valueChainPosition (own_operations|upstream|downstream),
  polarity (positive|negative), sasbRef?, esrsRef?, sortOrder Int @default(0)
  @@index([surveyId])

MaterialityStakeholderGroup
  id, surveyId (FK), name, weight Float @default(1.0), sortOrder Int @default(0)
  @@index([surveyId])

MaterialityStakeholder
  id, groupId (FK), name, email, phone?, locale (tr|en) @default(tr),
  inviteToken (unique), status (invited|reminded|completed|expired) @default(invited),
  invitedAt?, completedAt?
  @@index([groupId]); @@unique([inviteToken])

MaterialitySurveyResponse
  id, iroId (FK), stakeholderId (FK),
  financialMaterialityScore Int, impactSeverityScore Int, impactScopeScore Int,
  impactProbabilityScore Int, irremediabilityScore Int?, freeTextComment String @db.Text @default(""),
  submittedAt
  @@unique([iroId, stakeholderId])          # idempotent upsert per stakeholder/IRO

MaterialitySurveyReminderLog             # mirrors assignmentreminderlogs
  id, stakeholderId (FK), sentAt, channel @default("email"), reminderNumber Int
  @@index([stakeholderId])
```

**Aggregated scores: compute on-demand** (like the single emissions aggregation) via a SQL `GROUP BY` over responses joined to stakeholder-group weights — no materialized table in v1. Add a `MaterialityIroScore` cache table only if the matrix endpoint gets slow.

- `avg_financial_materiality = weighted avg(financialMaterialityScore)` by group weight
- `avg_impact_materiality = weighted avg(severity × scope × probability)` by group weight
- `is_material = avg dimension ≥ survey.materialThreshold`
- Topic rollup = `max` or weighted avg of its IROs (per `survey.topicRollup`)

**Universal disclosures:** reuse a flag on the topic longlist (add `isUniversalDisclosure Boolean @default(false)` to the canonical topic table) so GRI 2/3 rows are excluded from scoring/matrix.

## 4. API endpoints (namespaced under existing `/api/materiality`)

**Admin (requireAuth + firma-admin RBAC):**
```
POST   /api/materiality/surveys                          create survey
POST   /api/materiality/surveys/:id/topics/import        CSV import (reuse materialityScoringCsv)
POST   /api/materiality/surveys/:id/iros                 add IRO
POST   /api/materiality/surveys/:id/stakeholder-groups   create group
POST   /api/materiality/surveys/:id/stakeholders         bulk add (CSV/manual)
POST   /api/materiality/surveys/:id/invite               issue tokens + send invites
GET    /api/materiality/surveys/:id/matrix               aggregated matrix (topic + IRO)
GET    /api/materiality/surveys/:id/export               CSV export (original schema, real scores)
```
**Public (no auth, tokenized — mirror onBehalfResponse):**
```
GET    /api/materiality/survey/:token                    survey view (IROs, i18n by stakeholder.locale)
POST   /api/materiality/survey/:token/responses          submit/update (upsert by (iroId, stakeholderId))
```
**Cron (internal key / scheduler):**
```
POST   /api/materiality/surveys/cron/reminders           idempotent reminder sweep
```

All handlers route through `server/data/materialitySurveyDataAccess.ts` behind `withDb()`; SQL-first (Prisma), Mongo path optional since prod is now SQL.

## 5. Invite + reminder engine

- **Token**: JWT signed like the contact magic link (reuse `CONTACT_RESPONSE_TOKEN_EXPIRES_IN`), stored as `stakeholder.inviteToken`; public link `#/materiality-survey/:token`.
- **Send**: `sendResendEmail` with TR/EN templates (mirror `assignmentNotificationEmail.ts`).
- **Reminders (idempotent):** cron sweep selects stakeholders where `status ∈ {invited,reminded}`, `completedAt IS NULL`, survey not past cutoff, and `reminderNumber < maxReminders`, and whose last reminder is older than the next cadence step. Insert a `MaterialitySurveyReminderLog` row **before** send; a unique `(stakeholderId, reminderNumber)` guard prevents double-send on overlapping runs. Stop automatically on completion, cutoff, or `maxReminders`.

## 6. Frontend — `src/features/materiality-survey/`

```
api/        surveysApi.ts, stakeholdersApi.ts, matrixApi.ts   (fetch wrappers via apiClient)
hooks/      useSurveys, useSurveyMatrix, useStakeholderMutations  (react-query)
components/ TopicIroBuilder, StakeholderManager, ReminderSettings,
            SurveyMaterialityMatrix (wraps MaterialityMatrixChart), MaterialityScoringTable
pages/      MaterialitySurveyListPage, SurveyRunnerPage (public, mobile-first)
```
- Query keys: `['materiality-survey', 'list', customerId]`, `['materiality-survey', 'matrix', surveyId]`; invalidate by `['materiality-survey']` prefix.
- shadcn-style primitives from `src/shared/ui/` (Table, Slider/RadioGroup, Sheet/Dialog, Toast).
- **Matrix**: `SurveyMaterialityMatrix` maps aggregated scores into the existing `MaterialityTopicScore` shape and renders via the current `MaterialityMatrixChart`, extended with dot-size = response count and a stakeholder-group filter.
- **Public SurveyRunner**: routed like `ContactResponsePage` under a public layout (no `AdminLayout` guard); one IRO per screen, financial + impact scales, progress bar, autosave to `/responses`.

## 7. Non-functional

- **i18n**: add `materialitySurvey.*` keys to `src/lib/i18n.ts`; survey UI + emails localize by `stakeholder.locale`, TR default.
- **RBAC**: create/threshold/override restricted to firma-admin roles (reuse `platformRoles`); stakeholders only via token, no account.
- **Audit**: manual `isMaterial`/threshold overrides log who/when/why to `auditLogs` (reuse the answer-audit pattern).
- **CSV compat**: import/export use the existing `materialityScoringCsv.ts` column format; export now emits aggregated (non-zero) scores.

## 8. Sequencing (proposed vertical slices, each shippable + reviewed)

| Phase | Deliverable | Verify |
|---|---|---|
| 1 | Prisma models + `sql:push` migration + `materialitySurveyDataAccess` seam + CSV import reuse | `npm run lint`, `db:push` |
| 2 | Admin CRUD (survey, IRO, groups, stakeholders) + hooks + `TopicIroBuilder`/`StakeholderManager` | `test:client`, manual |
| 3 | Public tokenized `SurveyRunnerPage` + token issuance + submit/upsert | manual on mobile viewport |
| 4 | Invite + reminder engine (email + cron + idempotency) | manual + dedupe test |
| 5 | On-demand aggregation + `SurveyMaterialityMatrix` + `MaterialityScoringTable` + CSV export | manual matrix drill-down |
| 6 | i18n TR/EN, RBAC, audit, tests, docs note | `test:client`, `build`, `smoke:ship` |

Maps to the prompt's 6 acceptance criteria: AC1→P1/P2, AC2→P2, AC3→P2/P3/P4, AC4→P4, AC5→P5, AC6→P5.

## 9. Decisions needed before Phase 1

1. **Canonical topic table for `MaterialityIro.topicRef`**: `MaterialityTopic` (has the score columns, keyed `customerId+year+esrsId`) or `GRIMaterialityMatrixRow` (the longlist: subject/griMapping/disclosures)? *Recommend `GRIMaterialityMatrixRow` as the longlist source; `MaterialityTopic` becomes a derived/aggregated view.*
2. **Survey scope**: tied to `(customer, year)` or a standalone campaign with optional year? *Recommend standalone `MaterialitySurvey` with optional `year`.*
3. **Scores**: on-demand aggregation (recommended v1) vs materialized `MaterialityIroScore`.
4. **Chart**: extend `MaterialityMatrixChart` in place vs a `SurveyMaterialityMatrix` wrapper (recommended — keeps the single-scorer chart untouched).
5. **Cron wiring**: register a `scheduledjobs` entry hitting `/cron/reminders`, vs an in-process `node-cron` sweep. *Recommend a `scheduledjobs` entry for consistency with existing backups.*
6. **Scale**: fix 1–5 or honor `survey.scaleMax` throughout (recommended: honor it).

## 10. Out of scope (v1)

SMS/WhatsApp reminders (schema leaves `channel` open), multi-language per-IRO text beyond TR/EN, and real-time websocket matrix updates (react-query refetch/poll suffices).
