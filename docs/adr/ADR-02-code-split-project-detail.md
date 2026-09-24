# ADR-02: Code-split ProjectDetailPage.tsx

## Status
Proposed

## Context

`src/pages/admin/ProjectDetailPage.tsx` is 8,479 lines with:
- 71 `useState` hooks in a single component scope
- 6 tabs rendered as a single ternary chain (lines 4360-6361+): `overview` | `forms` | `audit` | `plan` | `users` | `activity`
- Eager top-level imports: `import * as XLSX` (line 68), `import * as Gemini` (line 85), `exportSubmissionsZip`
- ~30 helper functions and sub-components declared in-file (lines 161-980): `RecipientAssignmentSummary`, `RecipientQuestionAssignments`, `FormsWorkflowStatusBanner`, etc.
- No `React.lazy`/`Suspense` anywhere in the SPA

`ProjectPlanTab` is already extracted to its own file (line 142), proving the pattern works. The file loads for every project visit regardless of which tab the user needs.

## Decision

1. Extract each tab body into its own component file under `src/components/project/tabs/`:
   - `OverviewTab.tsx`
   - `FormsTab.tsx` (shared by `forms` and `audit` views)
   - `UsersTab.tsx`
   - `ActivityTab.tsx`
   - `PlanTab.tsx` — already exists, keep
2. Load each tab with `React.lazy` + `Suspense`, mounting only when the tab is active.
3. Move XLSX, Gemini, and `exportSubmissionsZip` behind dynamic `import()` invoked at click time, not at module load.
4. Move in-file helpers to `src/lib/projectDetail/*` and sub-components to `src/components/project/*`.
5. Lift shared state into a `ProjectDetailContext` (or a reducer) so child tabs receive scoped props instead of 71 hooks in one scope.

## Rationale

- Cuts first-paint bundle for the most-used admin screen (XLSX and Gemini are large)
- Isolates state per tab — removes accidental cross-tab coupling
- Speeds HMR in development and type-check time
- Makes each tab independently reviewable, testable, and deployable

## Risks

- **High coupling among 71 state hooks**: lifting state is the most delicate step; a missed dependency causes stale renders or infinite re-renders.
- **Shared modals span tabs**: assignment modal, on-behalf modal — must stay accessible from multiple tabs.
- **XL effort**: this is the largest refactor in the codebase; scope it to avoid destabilizing active development.

Mitigation: extract leaf helpers and sub-components first (zero behavior change), then extract read-only tabs (ActivityTab, PlanTab), then the high-value FormsTab/AuditTab last.

## Migration Path

1. Move pure helper functions and already-isolated sub-components out of the file (mechanical, zero behavior change).
2. Introduce `ProjectDetailContext` holding shared state and handlers; have the main component provide it.
3. Extract `ActivityTab` and read-only tab bodies first — lowest coupling, lowest risk.
4. Extract `UsersTab`, then `OverviewTab`.
5. Extract `FormsTab`/`AuditTab` last (highest value, highest coupling risk).
6. Convert each tab mount to `React.lazy` + `<Suspense fallback={<Spinner />}>`.
7. Convert XLSX/Gemini/export to dynamic `import()` at click handlers.
8. Validate bundle reduction with `npm run build` + `npx vite-bundle-visualizer`.

## Effort

XL (3+ weeks). Sequence after ADR-01 and ideally after ADR-07 (service layer) so business logic can be extracted in the same pass.
