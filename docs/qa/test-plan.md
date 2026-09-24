# GovernanceIQ Test Plan

**Generated:** 2026-05-30  
**Status:** Proposed — no tests currently exist. Zero `*.test.*`/`*.spec.*` files; no test tooling in package.json.

---

## 0. Critical Risk Assessment

Ranked by blast radius (auth, authorization, data-isolation are highest priority):

| # | Unit | File | Why critical |
|---|------|------|--------------|
| 1 | `resolvePlatformUserFromRequest` | `server/lib/requestAuth.ts` | Single gate for every authenticated endpoint. Verifies JWT, resolves user by `uid`/`sub` (ObjectId), then `legacyFirebaseId`, then `email`. Bug = auth bypass / wrong-user resolution. |
| 2 | `verifyPassword` / `hashPassword` | `server/auth/password.ts` | scrypt + `timingSafeEqual`. Format `scrypt:<salt>:<hash>`, KEY_LENGTH 64. Wrong parsing/length handling = auth bypass. |
| 3 | OTP first-user bootstrap (`getUserForOtpRequest`) | `server.ts` ~L225-246 | First-user-only auto-register as `platform_admin` guarded by `countDocuments() > 0`. Break = anyone self-provisions admin. |
| 4 | `canSubmitOnBehalf` / `canSubmitAuditorResponse` | `server/routes/onBehalfResponse.ts` ~L112-137 | Authorizes on-behalf answer writes via platform role + per-project assignment role (`admin`/`editor`). |
| 5 | `normalizePlatformRole` + `LEGACY_PLATFORM_ROLE_MAP` | `lib/platformRoles.ts` | All role checks normalize through it (`admin`→`platform_admin`, `viewer`→`contributor`, `read_only`→`customer`). |
| 6 | `platformUserVisibleForProject` / `platformUserCustomerIdMismatchForProject` | `src/lib/userRoles.ts` L107-125 | Customer multi-tenant isolation boundary. |
| 7 | `isTasksAndProfileOnlyUser` / `isCustomerParticipantOnlyUser` | `src/lib/userRoles.ts` L48-63 | Locks contributors/customers to Tasks+Profile; bug exposes admin screens. |
| 8 | Contact magic-link token verify | `server.ts` `/api/auth/validate-token` L984, `/api/auth/generate-token` L1005 | Account-less token-gated access; must reject tampered/expired and distinguish `TokenExpiredError`. |
| 9 | `serialize` / `buildFilter` | `server/routes/mongoApi.ts` L182-291 | `serialize` strips `passwordHash`/`_id`, normalizes role; `buildFilter` is the only scoping in CRUD. |
| 10 | `resolveAnswerAuditAction` / `buildChangeDetails` | `server/lib/answerAuditLog.ts` L55-139 | Pure create-vs-update classification; protects audit trail integrity. |

**Implementation order:** 1, 2, 5 → 3, 4, 6, 7 → integration for 8, 9 → components.

---

## 1. Test Harness Setup

### Tools

| Tool | Purpose |
|------|---------|
| `vitest@^3` | Test runner (reuses Vite/esbuild; native ESM; separate `node` + `jsdom` projects) |
| `@vitest/coverage-v8` | Coverage (Istanbul-compatible reports) |
| `@testing-library/react@^16` | React 19 component rendering |
| `@testing-library/jest-dom@^6` | Custom matchers (`.toBeVisible()`, etc.) |
| `@testing-library/user-event@^14` | Realistic user interactions |
| `jsdom@^25` | DOM environment for client tests |
| `supertest@^7` | HTTP integration tests against Express app |
| `@types/supertest@^6` | TypeScript types for supertest |
| `mongodb-memory-server@^10` | Isolated in-memory MongoDB for server tests |

### Install

```bash
npm install -D \
  vitest@^3.0.0 \
  @vitest/coverage-v8@^3.0.0 \
  @testing-library/react@^16.1.0 \
  @testing-library/jest-dom@^6.6.3 \
  @testing-library/user-event@^14.5.2 \
  jsdom@^25.0.1 \
  supertest@^7.0.0 \
  @types/supertest@^6.0.2 \
  mongodb-memory-server@^10.1.2
```

### `vitest.config.ts` (project root)

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'server/lib/**', 'server/auth/**', 'server/routes/**',
        'lib/**', 'src/lib/**', 'src/pages/**', 'src/components/layout/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['tests/server/**/*.test.ts', 'tests/shared/**/*.test.ts'],
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.client.ts'],
          include: ['tests/client/**/*.test.tsx'],
        },
      },
    ],
  },
});
```

### `tests/setup.client.ts`

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
```

### `package.json` scripts to add

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"test:server": "vitest run --project server",
"test:client": "vitest run --project client",
"test:coverage": "vitest run --coverage"
```

### Test directory layout

```
tests/
  shared/
    platformRoles.test.ts
    userRoles.test.ts
  server/
    helpers/
      memoryMongo.ts        # mongodb-memory-server lifecycle
      makeApp.ts            # thin Express factory (no port binding, no Brevo)
    requestAuth.test.ts
    password.test.ts
    otpBootstrap.test.ts
    answerAuditLog.test.ts
    api/
      auth.test.ts
      db.resource.test.ts
      contactToken.test.ts
      onBehalf.test.ts
  client/
    LoginPage.test.tsx
    ContactResponsePage.test.tsx
    AdminLayout.test.tsx
```

> **Note:** `server.ts` is not test-friendly as-is — its `startServer()` binds a port, connects to Brevo, and runs migrations. A `buildApp()` factory that only registers routes should be extracted (relates to ADR-01). Until then, `makeApp.ts` manually mounts `registerMongoApiRoutes` and specific auth handlers without calling `startServer()`.

---

## 2. Unit Tests — Backend

### 2.1 `server/lib/requestAuth.ts` → `tests/server/requestAuth.test.ts`

Return shape: `{ user, decoded, reason }`.

| Test case | Expected result |
|-----------|----------------|
| Missing `Authorization` header | `reason: 'missing-token'` |
| Non-`Bearer` scheme | `reason: 'missing-token'` |
| Bad signature | `reason: 'invalid-token'`, `decoded: null` |
| Expired token (`expiresIn: '-1s'`) | `reason: 'invalid-token'` |
| No `uid`/`sub`/`email` in payload | `reason: 'invalid-token'` |
| 24-hex `uid` matching existing user | `user` resolved via `findById`, `reason: null` |
| Non-ObjectId `uid` matching `legacyFirebaseId` | Legacy lookup succeeds |
| `email`-only (normalized lowercase/trim) | Resolved by email |
| No matching user | `reason: 'user-not-found'` |
| `sub` fallback when `uid` absent | Tries `sub` as ObjectId |
| Contact magic-link token (no `uid`/`sub`/`email`) | `reason: 'invalid-token'` (contact tokens must not act as session bearers) |

### 2.2 `server/auth/password.ts` → `tests/server/password.test.ts`

| Test case | Expected result |
|-----------|----------------|
| `hashPassword` return format | Matches `scrypt:<32-hex>:<128-hex>` |
| Two hashes of same pw differ | Different salts (random) |
| Round-trip (hash then verify) | `true` |
| Wrong password | `false` |
| `undefined` hash | `false` |
| Wrong algo prefix | `false` |
| Missing salt/hash segment | `false` |
| Mismatched hash length | `false` |
| Unicode password | Round-trips correctly |
| Empty string password | Round-trips correctly |

### 2.3 OTP bootstrap → `tests/server/otpBootstrap.test.ts`

Export `getUserForOtpRequest` from server.ts (currently unexported) to enable direct unit testing.

| Test case | Expected result |
|-----------|----------------|
| Existing email, users in DB | Returns existing user, no create |
| Empty DB + unknown email | Creates `platform_admin`, `department: 'Management'`, `isConfirmed: false`, `language: 'tr'` |
| Non-empty DB + unknown email | Returns `null`, no user created, no enumeration |
| Email normalization | Equivalent lowercase/trimmed emails resolve to same user |

### 2.4 `src/lib/userRoles.ts` → `tests/shared/userRoles.test.ts`

Table-driven tests over canonical + legacy role strings.

Key functions to cover:
- `isAuditorPlatformUser` — auditor→true, all others→false
- `isTasksOnlyPlatformUser` — legacy `viewer`→true
- `isCustomerPortalPlatformUser` — legacy `read_only`→true
- `isElevatedProjectMemberRole` — `admin`/`editor`→true, `viewer`/`contributor`→false
- `hasElevatedProjectMembership` — checks assignment list
- `isCustomerParticipantOnlyUser` / `isTasksAndProfileOnlyUser`
- **Data isolation (high priority):**
  - `platformUserVisibleForProject`: non-customer→always true; customer match→true; mismatch→false; no `projectCustomerId`→true
  - `platformUserCustomerIdMismatchForProject`: different→true; matching→false; missing `user.customerId`→false; no `projectCustomerId`→false; non-customer role→false
- `isProjectContributorRole`, `isTasksPageFilterAdmin`, `canListAllProjects` (legacy `admin`→true)
- `isAssignmentOtpPlatformUser`, `projectMemberRoleForSelect` (`viewer`→`contributor`)
- `isPlatformAdminRole`

### 2.5 `lib/platformRoles.ts` → `tests/shared/platformRoles.test.ts`

| Test case | Expected result |
|-----------|----------------|
| Each canonical role | Maps to itself |
| Legacy `admin` | → `platform_admin` |
| Legacy `viewer` | → `contributor` |
| Legacy `read_only` | → `customer` |
| Unknown role | → `undefined` |
| Empty string | → `undefined` |
| `isLegacyPlatformRole` | Correct for each |
| `hasLegacyPlatformRoleInUsers` | Tolerates null entries |
| **Sync guard** | Assert `CANONICAL_PLATFORM_ROLES` equals `server/models/index.ts` `PLATFORM_USER_ROLE_ENUM` so client/server drift fails CI |

### 2.6 `server/lib/answerAuditLog.ts` → `tests/server/answerAuditLog.test.ts`

(Export `resolveAnswerAuditAction` and `buildChangeDetails` for direct testing, or test via `recordAnswerUpsertAudit` against memory Mongo.)

| Test case | Expected result |
|-----------|----------------|
| New answer text | `action: 'create'`, change details include text |
| Updated answer text | `action: 'update'`, before/after recorded |
| Added comment | Detected as change |
| Removed evidence | Detected as change |
| No change | `buildChangeDetails` returns `[]`; `recordAnswerUpsertAudit` returns early, no DB write |
| Whitespace-only difference | Treated as no change |
| No resolvable `actorId` | No `AuditLogModel.create` call |

---

## 3. Integration Tests — API

Use `makeApp.ts` + `mongodb-memory-server` + `supertest`. Mock Brevo (`sendBrevoEmail`) to avoid real email sends.

### 3.1 `POST /api/auth/login`

| Test case | Expected |
|-----------|----------|
| Missing credentials | 400 `auth/missing-credentials` |
| Unknown email | 401 `auth/user-not-found` (generic message) |
| Wrong password | 401 `auth/wrong-password` |
| Valid credentials | 200 `{token, user, profile}`, token decodes `{uid, sub, email, role}`, no `passwordHash` |
| Valid login side effects | `lastLoginAt` updated, `isConfirmed: true` |

### 3.2 OTP request + verify

**Request:**

| Test case | Expected |
|-----------|----------|
| Empty DB + unknown email | First user created, generic success (mock Brevo invoked) |
| Non-empty DB + unknown email | Generic success message, no user created, no OTP row |
| Existing email | OTP upserted with future `expiresAt`, Brevo invoked |
| Missing email | 400 `auth/missing-email` |

**Verify:**

| Test case | Expected |
|-----------|----------|
| Missing code | 400 `auth/missing-otp` |
| Wrong code | 400 `auth/invalid-otp` |
| Expired code (`expiresAt <= now`) | 400 `auth/invalid-otp` |
| Valid code, user deleted | 400, OTP deleted |
| Valid code | 200 token, OTP deleted, `lastLoginAt`/`isConfirmed` set |

### 3.3 `GET /api/auth/me`

| Test case | Expected |
|-----------|----------|
| Valid token | 200 `{user, profile}`, no `passwordHash` |
| Missing token | 401 `auth/invalid-token` |
| Expired token | 401 |
| Tampered token | 401 |
| User deleted | 401 `user-not-found` |

### 3.4 `GET /api/db/:resource`

| Test case | Expected |
|-----------|----------|
| Unknown resource | 404 `db/unknown-resource` |
| Valid resource, no auth | **Currently:** 200 (document existing open-read gap; `.todo` for intended 401) |
| Serialized documents | `_id`/`passwordHash` removed, dates→epoch ms, role normalized |
| `?ids=` param | Builds `$or` over `_id` + `legacyFirebaseId` |
| `?limit` / `?skip` | Limit capped at 5000, skip clamped ≥ 0 |
| `?countTotal=true` | Returns `{items, total}` |

### 3.5 `POST /api/db/:resource`

| Test case | Expected |
|-----------|----------|
| Unknown resource | 404 |
| No auth token | **Currently:** succeeds (`.todo` for intended 401) |
| `createdBy` auto-set | Populated from JWT `uid`/`sub` |
| Reserved fields `id`/`_id`/`__v` | Stripped from body |
| Date fields as ms/numeric strings | Converted to `Date` |
| `platformUsers` with invalid role | 400 `db/validation-error` |
| `platformUsers` with legacy role | Normalized before save |
| `contacts` email conflict with same-customer PlatformUser | 400 `db/email-conflict` |
| Mongoose `ValidationError` | 400, not 500 |

### 3.6 Contact magic-link

| Test case | Expected |
|-----------|----------|
| `generate-token` missing fields | 400 `{error: 'Missing data'}` |
| `generate-token` valid | Token payload includes `{projectId, contactId}` |
| `validate-token` missing | 400 `{valid: false}` |
| `validate-token` valid | 200 `{valid: true, decoded}` |
| `validate-token` tampered | 401 `{valid: false, error: 'Invalid token signature'}` |
| `validate-token` expired | 401 `{valid: false, error: 'Token has expired'}` |
| Default expiry | `CONTACT_RESPONSE_TOKEN_EXPIRES_IN='7d'` |

**On-behalf authorization (`canSubmitOnBehalf`):**

| Role | Project assignment role | Expected |
|------|------------------------|----------|
| `platform_admin` | any | Allowed |
| `consultant_manager` | any | Allowed |
| `auditor` | any | 403 `on-behalf/forbidden` |
| `consultant` | `admin`/`editor` | Allowed |
| `consultant` | `contributor` or none | 403 |
| No auth | — | 401 |
| Missing name/email/answer | — | 400 `on-behalf/validation` |

---

## 4. Component Tests — Frontend

Mock `apiRequest` (`src/lib/apiClient.ts`), global `fetch`, and `src/services/db.ts`. Wrap in `MemoryRouter`.

### 4.1 `LoginPage` → `tests/client/LoginPage.test.tsx`

| Test case |
|-----------|
| Renders email/password form in `login` mode |
| Empty form submit is a no-op (line 145 guard) |
| Valid submit calls `POST /api/auth/login`, then `GET /api/auth/me` |
| `auth/user-not-found` / `auth/wrong-password` show user-friendly message |
| Generic server error shows `error.message` |
| OTP flow: `otp-request` → `POST /api/auth/otp/request` → `otp-verify` → success |
| Empty OTP code is no-op (line 188 guard) |
| `/login/forceotp` forces OTP mode (lines 51-52, 92) |
| Forgot mode posts `POST /api/auth/request-password-reset` |

### 4.2 `ContactResponsePage` → `tests/client/ContactResponsePage.test.tsx`

| Test case |
|-----------|
| On mount, posts token to `POST /api/auth/validate-token` |
| `{valid: true}` → sets `tokenData`, calls `loadData`, renders questionnaire |
| `{valid: false}` → shows error state with "no longer valid or has expired" |
| Loading state visible during initial fetch |
| Submission posts decoded `projectId`/`contactId` → shows `isCompleted` view |
| Thrown error during load → error state shown (line 100 catch) |

### 4.3 `AdminLayout` → `tests/client/AdminLayout.test.tsx`

Mock `useAuth()` return value. Test nav logic at AdminLayout.tsx lines 82-118.

| Role | Expected nav behavior |
|------|-----------------------|
| `platform_admin` | Full secondary nav shown |
| `consultant_manager` | Manager-or-admin items shown; admin-only items hidden |
| `consultant` | `/customer-directory` hidden (line 94) |
| `customer` | Directory hidden |
| `auditor` | Secondary nav hidden (line 99); main filtered (line 87) |
| `isTasksAndProfileOnly` | Secondary hidden; only Tasks + Profile visible |
| `shouldShowAdminSection` | False when secondary nav is empty (no header rendered) |

---

## 5. Coverage Priority

| Wave | Tests | Target coverage |
|------|-------|----------------|
| **Wave 1** (auth + isolation, do first) | `password.test.ts`, `requestAuth.test.ts`, `platformRoles.test.ts` (incl. enum sync guard), `userRoles.test.ts` (isolation helpers) | **95%+** stmt/branch on these pure modules |
| **Wave 2** (auth integration + authz) | `auth.login`, `auth.otp`, `auth.me`, `contactToken`, `onBehalfAuthz`, `otpBootstrap` | **80%+** on server.ts auth handlers + on-behalf helpers; 100% of documented error codes |
| **Wave 3** (CRUD + audit + components) | `db.resource`, `answerAuditLog`, the three component tests | **70%+** on mongoApi helpers + components |
| **Overall initial** | All above | ~60% project-wide lines; auth/role/isolation modules 90%+ |

`ProjectDetailPage.tsx` (~8,479 lines) is out of scope for Wave 1-3. Plan component extraction (ADR-02) before writing tests for it.

---

## 6. Gaps & Known Issues

1. **No server-side authorization on `/api/db/*`** — `registerMongoApiRoutes` only ensures a Mongo connection (mongoApi.ts:246-253); GET/POST/PUT/DELETE do no token verification or customer scoping. Isolation is UI-only. Severity **Critical** — documented as I-1/I-2 in [architecture.md](../architecture/architecture.md). Track as `.todo` tests until ADR-03 is implemented.

2. **`server.ts` not test-friendly** — `startServer()` binds a port, runs migrations, connects Brevo. Recommend extracting a `buildApp()` factory and exporting `getUserForOtpRequest`. See ADR-01.

3. **Module-private pure functions** — `resolveAnswerAuditAction`, `buildChangeDetails` (answerAuditLog.ts), `canSubmitOnBehalf` (onBehalfResponse.ts) should be exported for direct unit testing.

4. **Single `JWT_SECRET` signs both session and contact tokens** — assert a contact token (no `uid`/`sub`/`email`) cannot be used as a session bearer (test: `resolvePlatformUserFromRequest` returns `invalid-token`).

5. **Client/server role enum drift** — prevented only by discipline today. The 2.5 sync guard test closes it automatically in CI.

---

## 7. Client UI tests (implemented)

Vitest **client** project (`tests/client/**/*.test.tsx`) covers shell and login UX with React Testing Library.

| File | What it verifies |
|------|------------------|
| `tests/client/adminShell.ui.test.tsx` | Sidebar links for `platform_admin`, consultant/auditor/contributor gating, module flags (emissions/chat hidden when disabled), outlet rendering |
| `tests/client/loginPage.ui.test.tsx` | Login form, forgot-password flow, OTP mode, Turkish locale via `?lang=tr` |
| `tests/client/helpers/renderWithAppShell.tsx` | Shared mocks/settings for layout tests |

Run:

```bash
npm run test:client -- tests/client/adminShell.ui.test.tsx tests/client/loginPage.ui.test.tsx
```

See also [`guides/application-features-guide.md`](../guides/application-features-guide.md) §13 for operator-facing test instructions.
