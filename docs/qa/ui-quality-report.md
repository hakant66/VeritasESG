# GovernanceIQ — UI Quality Report

**Generated:** 2026-05-30  
**Scope:** React 19 + Tailwind CSS 4 SPA (HashRouter). Routing, role-based access, form validation, error/empty/loading states, accessibility, and responsive design.

---

## 1. Page Inventory

Routes are in `src/App.tsx`. Guards are inline ternaries resolving to the page or `<Navigate>`. Wrappers `auditorGuard`/`tasksOnlyGuard` (App.tsx:59-62) short-circuit restricted roles first.

| Route | Component | Required role(s) | Guard type |
|---|---|---|---|
| `/login`, `/login/forceotp` | `pages/LoginPage.tsx` | Public (redirect if logged in) | Auth redirect (App.tsx:68-93) |
| `/reset-password` | `pages/ResetPasswordPage.tsx` | Public | None |
| `/respond/:token` | `pages/contact/ContactResponsePage.tsx` | Unauthenticated magic-link | Token validated in component, not router (App.tsx:97-99) |
| `/` (index) | `DashboardPage.tsx` | Staff; auditor→`/projects`, tasks-only→`/tasks` | Auth + redirect (App.tsx:103-112) |
| `/sectors` | `CustomerSectorsPage.tsx` | `platform_admin` | Role ternary (App.tsx:113-116) |
| `/service-categories` | `ServiceCategoriesPage.tsx` | `platform_admin` | Role ternary (App.tsx:117-120) |
| `/templates/:sectorId` | `TemplatesPage.tsx` | admin, consultant_manager, consultant | Role ternary (App.tsx:121-128) |
| `/customers` | `CustomersPage.tsx` | admin, consultant_manager | Role ternary (App.tsx:129-134) |
| `/customers/:customerId` | `CustomerProfilePage.tsx` | non-auditor, non-tasks-only | **Guard gap — no role check** (App.tsx:135) |
| `/customer-directory` | `CustomerDirectoryPage.tsx` | not contributor/consultant/customer | Negative ternary (App.tsx:136-145) |
| `/users` | `UsersPage.tsx` | `platform_admin` | Role ternary (App.tsx:146-149) |
| `/audit` | `AuditPage.tsx` | `platform_admin` | Role ternary (App.tsx:150-153) |
| `/translations` | `TranslationsPage.tsx` | `platform_admin` | Role ternary (App.tsx:154-157) |
| `/settings` | `SettingsPage.tsx` | `platform_admin` | Role ternary (App.tsx:158-161) |
| `/projects`, `/services` | `ProjectsPage.tsx` | non-tasks-only | tasksOnlyGuard (App.tsx:162-163) |
| `/projects/:projectId` | `ProjectDetailPage.tsx` | non-tasks-only | **tasksOnlyGuard only — no customer scoping** (App.tsx:164) |
| `/tasks` | `TasksPage.tsx` | non-auditor | auditorGuard (App.tsx:165) |
| `/chat` | `KnowledgeChatPage.tsx` | non-auditor, non-tasks-only | Both guards (App.tsx:166) |
| `/profile` | `ProfilePage.tsx` | any authenticated | Auth only (App.tsx:167) |
| `/knowledge-base` | `KnowledgeBasePage.tsx` | `platform_admin` | Role ternary (App.tsx:169-172) |
| `/knowledge-base/:kbId` | `KnowledgeBaseDetailPage.tsx` | `platform_admin` | Role ternary (App.tsx:173-176) |
| `*` | — | — | Redirect to role home (App.tsx:179-187) |

---

## 2. Role Access Matrix

`✓` accessible · `✗` redirected by guard · `⚠` reachable but relies on server-side enforcement only.

`contributor` and `customer`-without-elevated-membership resolve to tasks-only (userRoles.ts:57-63, AuthContext.tsx:169-175).

| Page | admin | cons_mgr | consultant | contributor | customer | auditor |
|---|---|---|---|---|---|---|
| `/` Dashboard | ✓ | ✓ | ✓ | ✗→tasks | ✓* | ✗→projects |
| `/sectors` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/service-categories` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/templates/:sectorId` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/customers` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/customers/:customerId` | ✓ | ✓ | ⚠ | ✗→tasks | ⚠ | ✗→projects |
| `/customer-directory` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/users` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/audit` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/translations` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/settings` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `/projects`, `/services` | ✓ | ✓ | ✓ | ✗→tasks | ✓ | ✓ |
| `/projects/:projectId` | ✓ | ✓ | ✓ | ✗→tasks | ⚠ cross-customer | ✓ read-only |
| `/tasks` | ✓ | ✓ | ✓ | ✓ | ✓ | ✗→projects |
| `/chat` | ✓ | ✓ | ✓ | ✗ | ✓ | ✗→projects |
| `/profile` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/knowledge-base` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

\* A customer with no elevated project membership is treated as tasks-only at boot and redirected to `/tasks`; one with an `admin`/`editor` project role gets the dashboard.

### Key Role Access Issues

- **`/customers/:customerId` has no router role guard** (App.tsx:135) — only `auditorGuard(tasksOnlyGuard(...))`. A `consultant` blocked from the customers list can still load any customer profile by URL.
- **`/projects/:projectId` is not customer-scoped client-side.** `ProjectDetailPage` reads `projectId` from URL (ProjectDetailPage.tsx:1003) and loads it directly (loadProjectData, lines 2440-2442). No early return/`<Navigate>` when a `customer` opens another company's project. The helper `platformUserCustomerIdMismatchForProject` (userRoles.ts:117-125) exists but is only used to filter the Users-tab list (ProjectDetailPage.tsx:2276), not for page access control. Relies entirely on the API.
- Admin-only pages have nav/route parity — `AdminLayout.tsx:104-106` hides them and the router enforces the same set. No nav-only leak.

---

## 3. Form & Error State Findings

### ContactResponsePage (`pages/contact/ContactResponsePage.tsx`) — external users, highest priority

- Loading state present (line 204). Invalid/expired token: dedicated user-facing error card with guidance (lines 206-221), though message falls back to hardcoded English.
- **Field validation absent.** Number inputs (342-356) accept anything; required questions never enforced. "Mark as Complete" (486) submits with zero answers.
- **Silent save failures.** `handleUpdateAnswer` (151-186) and `handleMarkAsComplete` (188-202) swallow errors with `console.error` while UI shows "Saved" optimistically (320-328).
- **Evidence upload non-functional.** Stores only `file.name` (448-453); ships the literal disclaimer "For the demo, 'uploading' stores the file metadata in the session" (466).
- **Hardcoded English copy** throughout despite `useTranslation()` being wired (211-491; ContactLayout.tsx:18-22).
- `loadData` silently returns if project doc missing (line 113), leaving a blank page with no error state. Token/answers are `any`-typed (41-43).

### LoginPage

Good: loading spinners (310/378/432/497), inline error banners with shake animation (298-303), success banners, OTP disabled until 6 digits (494), OTP sanitized (472).

Gaps: no field-level validation; inputs use `placeholder` as label — no `<label>`/`aria-label` (276-294, 349-356, 410-417, 467-475).

### ProjectDetailPage

Rich role gating (`canEdit`, `canAccessAuditTab`, `canEditAuditForm`, `canUpdateQuestionWorkflow`, lines 1833-1862), auditor read-only view, 14 loading-state usages.

`getExpireTime` (2430-2438) parses JWT client-side, returns "Unknown" silently on failure. No access-denied UI when a wrong-customer project is loaded.

### Admin CRUD Pages

Native `required` only (Customers, Users, Sectors, ServiceCategories) — no inline field-error pattern anywhere. Empty states exist on most lists (ProjectsPage.tsx:356 is a clean example). **TasksPage, AuditPage, TranslationsPage, CustomerProfilePage, CustomerDirectoryPage, ProfilePage** showed no empty-state markers — verify they don't render blank on no-data conditions.

---

## 4. Accessibility Findings

### Shared Modal (`src/components/ui/Modal.tsx`) — highest impact (used app-wide)

- **No `role="dialog"`/`aria-modal`** on panel (79-92).
- **No focus trap, no initial focus, no focus restore** on close.
- **No Escape-to-close** — only backdrop click (67) and X button.
- Positive: X button has `aria-label` (119) and is a real `<button>`.

### Form Labeling

Only TemplatesPage (5), CustomerSectorsPage (1), ServiceCategoriesPage (1) use `htmlFor`. Most `<label>`s (CustomersPage 21, ProjectDetailPage 28, SettingsPage 15, UsersPage 16) are visual-only, not associated via `htmlFor`/`id`. LoginPage and ContactResponsePage use placeholders instead of labels.

### Missing `alt` Attributes

- `ProjectDetailPage.tsx:4537` — image missing alt
- `UsersPage.tsx:1286` — image missing alt
- `UsersPage.tsx:1405` — image missing alt

Most others correctly set `alt` (Customers 651/773, Users 856/913, Dashboard 323/393, ProjectsPage 305, CustomerDirectory 410/659, Settings 589/611); LoginPage logos correctly use `alt=""`.

### Keyboard Navigation

Most actions are real `<button>`/`<Link>`. Issues:
- Clickable `<div>` rows used as controls (CustomerDirectoryPage.tsx:403-404) are not focusable and lack `role`/`tabIndex`/`onKeyDown`.
- ContactResponsePage dropzone (444-465) is a click-through input with no keyboard label.
- Decorative icons use `aria-hidden` inconsistently (good at ProjectsPage.tsx:299).

### Navigation Controls

- Collapsed-sidebar tooltips are hover-only with `title` fallback (AdminLayout.tsx:394-398).
- Collapse toggle (353-361) and mobile hamburger (171) lack `aria-label`/`aria-expanded`.

---

## 5. Responsive Design Findings

### Breakpoint Coverage by Page

| Page | Responsive classes count |
|---|---|
| ProjectDetailPage | 159 |
| TemplatesPage | 43 |
| CustomerDirectoryPage | 26 |
| SettingsPage | 22 |
| KnowledgeChatPage | 21 |
| AuditPage | 21 |
| ProfilePage | 17 |
| TasksPage | 15 |
| CustomersPage | 13 |
| DashboardPage | 12 |
| UsersPage | 10 |
| ProjectsPage | 10 |
| KnowledgeBasePage | 10 |
| CustomerProfilePage | 4 ⚠ |
| TranslationsPage | 3 ⚠ |
| ServiceCategoriesPage | 3 ⚠ |
| CustomerSectorsPage | 3 ⚠ |

**Low coverage pages** (CustomerProfilePage, TranslationsPage, ServiceCategoriesPage, CustomerSectorsPage) should be tested for horizontal overflow on mobile.

### Mobile Navigation

Solid implementation: fixed top bar below `md` with hamburger (AdminLayout.tsx:170-187), slide-in drawer with backdrop + spring (189-300), auto-close on route change (163-165), desktop sidebar `hidden md:flex` (307), resizable/collapsible (130-156), content `pt-16 md:pt-0` (546).

Caveat: resize handle (535-542) is mouse-only (acceptable, desktop-only). ContactLayout responsive (`px-4 sm:px-6`).

---

## 6. Priority Defect List

### P1 — Data Integrity / Security / External Users

| # | Issue | File:Line |
|---|---|---|
| 1 | **Cross-customer project access not guarded client-side** — customer role can open any `/#/projects/<id>` by URL; `platformUserCustomerIdMismatchForProject` exists but is not used for page access | App.tsx:164, ProjectDetailPage.tsx:2440-2442, userRoles.ts:117-125 |
| 2 | **ContactResponsePage silently loses external user data** — save/submit failures swallowed with `console.error` while UI shows "Saved" | ContactResponsePage.tsx:151-202 |
| 3 | **Evidence upload non-functional in production** — stores only filename, ships "for the demo" disclaimer | ContactResponsePage.tsx:444-466 |
| 4 | **`/customers/:customerId` lacks a route role guard** — consultants blocked from list can still access profile by URL | App.tsx:135 |

### P2 — Accessibility Blockers / Validation

| # | Issue | File:Line |
|---|---|---|
| 5 | **Shared Modal not accessible** — missing `role="dialog"`, `aria-modal`, focus trap, Escape key, focus restore | Modal.tsx:79-92 |
| 6 | **No field-level validation feedback** — especially required questions before "Mark as Complete" | ContactResponsePage.tsx:486 |
| 7 | **Inputs not programmatically labeled** — LoginPage and ContactResponsePage use placeholders; most admin `<label>`s lack `htmlFor` | LoginPage.tsx:276-294, ContactResponsePage.tsx:211-491 |
| 8 | **Clickable `<div>` rows not keyboard-accessible** | CustomerDirectoryPage.tsx:403-404 |
| 9 | **ContactResponsePage English-only** despite `useTranslation()` available | ContactResponsePage.tsx:211-491 |

### P3 — Polish / Edge Cases

| # | Issue | File:Line |
|---|---|---|
| 10 | Missing `alt` on images | ProjectDetailPage.tsx:4537, UsersPage.tsx:1286, UsersPage.tsx:1405 |
| 11 | Nav control buttons missing `aria-label`/`aria-expanded` | AdminLayout.tsx:353-361, AdminLayout.tsx:171 |
| 12 | Verify empty states on TasksPage, AuditPage, TranslationsPage, CustomerProfilePage, ProfilePage | — |
| 13 | Low responsive coverage on 4 pages — test for horizontal overflow | CustomerProfilePage.tsx, TranslationsPage.tsx, ServiceCategoriesPage.tsx, CustomerSectorsPage.tsx |
| 14 | JWT decoded client-side for display — brittle, returns "Unknown" silently | ProjectDetailPage.tsx:2430-2438 |

---

## Referenced Files

- `src/App.tsx` — routing and guards
- `src/components/layout/AdminLayout.tsx` — sidebar, mobile nav
- `src/pages/contact/ContactResponsePage.tsx` — magic-link form (external users)
- `src/components/ui/Modal.tsx` — shared modal (accessibility critical)
- `src/pages/admin/ProjectDetailPage.tsx` — main project view
- `src/lib/userRoles.ts` — role check helpers
- `src/lib/AuthContext.tsx` — session/role management
- `src/pages/LoginPage.tsx` — auth UI
