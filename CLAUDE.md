# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GovernanceIQ is a full-stack **sustainability and governance reporting platform** for consultancy firms. It enables organizations to maintain a client directory, run reporting projects, collect structured survey responses, assign tasks, track progress, and optionally use AI-powered knowledge base chat to support consultants.

The application migrated from Firebase (Auth + Firestore) to MongoDB, and has since completed a second migration from MongoDB to a relational core: Node.js/Express backend with **PostgreSQL persistence via Prisma**, custom JWT authentication, and email delivery through Brevo.

> **MongoDB has been fully removed.** The former Mongo-to-SQL migration (tracked in [`docs/migration/mongo-to-sql-migration-plan.md`](docs/migration/mongo-to-sql-migration-plan.md) and [`docs/migration/mongo-to-sql-implementation-status.md`](docs/migration/mongo-to-sql-implementation-status.md)) is complete: there is no `DB_DRIVER` flag, no Mongoose, and no `server/models/index.ts` anymore. Postgres/Prisma is the only backend. RAG vectors live in `pgvector` (`VECTOR_BACKEND`).

## Development Commands

### Setup & Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
# Runs: tsx server.ts
# Starts Express API server + Vite dev server on port 3010 (configurable via PORT env var)
# Hot module replacement enabled (disable with DISABLE_HMR=true env var if using AI Studio)
```

### Production Build & Run
```bash
npm run build        # Vite bundles React client to dist/
npm run start        # Runs: node server.ts (serves static dist/ + API)
npm run clean        # Remove dist/ directory
```

### Validation & Linting
```bash
npm run lint         # Runs: tsc --noEmit (type-check only, no emit)
```

### Database Setup & Seeds
```bash
npm run db:provider postgresql   # or: mysql — set Prisma datasource engine
npm run db:generate              # generate Prisma client from prisma/schema.prisma
npm run db:deploy                # apply Prisma migrations (needs DATABASE_URL)
npm run sql:setup                # provider + generate + push schema + pgvector/partial-index extras
npm run migrate:kimya-excel-sheets   # rename Kimya classifier template Excel sheets (content tooling, not DB migration)
```

### Docker & Local Stack
```bash
npm run docker:up           # Full stack; auto-picks a free host port for any port already in use
docker compose up --build   # Full stack: app + Postgres/pgvector (5442) + MinIO (9000/9001) + Redis (6379) + Qdrant (6333/6334) — fails if a host port is taken
npm run docker:up:minio     # MinIO only, same auto-port-fallback behavior
docker compose -f docker-compose.minio.yml up         # MinIO only (object storage)
```
`npm run docker:up` (`scripts/docker-up.sh`) checks each service's default host port (MinIO API/console, Redis, Postgres, Qdrant HTTP/gRPC, app) and, if it's already bound on the machine, picks the next free port instead of failing — set via `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`, `REDIS_HOST_PORT`, `POSTGRES_HOST_PORT`, `QDRANT_HTTP_PORT`, `QDRANT_GRPC_PORT`, `APP_HOST_PORT` env vars (any of these set explicitly, in the shell or `.env`, are honored as-is). `APP_PUBLIC_URL` is derived from the chosen app port unless already set.

## Architecture & Tech Stack

### Runtime Stack
- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS 4
- **Backend**: Node.js/Express 4 + TypeScript (tsx runner)
- **Database**: PostgreSQL (default) or MySQL via Prisma 6 ORM. `pgvector` backs KB/RAG embeddings.
- **Auth**: Custom JWT (jsonwebtoken) + LocalStorage
- **Email**: Brevo API + Nodemailer for OTP and transactional email
- **AI**: Google Gemini SDK (`@google/genai`; optional, lazily initialized)
- **Storage**: AWS SDK S3-compatible (optional; local MinIO or AWS S3 for large profile images)

### High-Level Architecture

```
┌─ Browser (React SPA, HashRouter) ─────────────────────────┐
│                                                             │
│  AuthContext → apiClient (JWT in Authorization header)    │
│  SettingsContext → db.ts compatibility layer               │
│  UI Components                                             │
└────────────────────────────┬────────────────────────────────┘
                             │ /api/db/*, /api/auth/*, /api/*
                             ▼
┌─ Node.js/Express (server.ts + server/) ──────────────────┐
│                                                            │
│  Routes:                                                   │
│    • Auth (login, OTP, password reset, /me, logout)      │
│    • Generic REST API (/api/db/:resource/:id)            │
│    • Feature-specific (contact tokens, assignments, etc) │
│                                                            │
│  Middleware:                                               │
│    • JWT validation (resolvePlatformUserFromRequest)     │
│    • Multer (file uploads to S3 or inline data URL)      │
│    • Vite dev middleware (dev mode)                      │
│    • Static asset serving (prod mode, dist/)             │
└────────────────────────────┬────────────────────────────────┘
                             │ Prisma
                             ▼
                    PostgreSQL (governance db)
```

### Core Directory Structure

```
governanceiq/
├── src/                           # React frontend (SPA)
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Root routing (HashRouter)
│   ├── index.css                  # Tailwind entry
│   ├── pages/
│   │   ├── LoginPage.tsx          # Public auth UI
│   │   ├── ResetPasswordPage.tsx
│   │   ├── admin/                 # Admin/consultant pages
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProjectDetailPage.tsx (large, handles all project interactions)
│   │   │   ├── CustomersPage.tsx, CustomersDirectoryPage.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   ├── KnowledgeChatPage.tsx
│   │   │   └── [other admin pages]
│   │   └── contact/
│   │       └── ContactResponsePage.tsx (token-gated contact form response)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx (main app chrome)
│   │   │   └── ContactLayout.tsx
│   │   ├── ui/                    # Headless UI components (buttons, modals, etc)
│   │   ├── project/               # Project-related components
│   │   ├── customer/              # Customer/contact components
│   │   ├── tasks/                 # Task/assignment components
│   │   ├── admin/                 # Admin-specific components
│   │   └── users/
│   ├── lib/
│   │   ├── AuthContext.tsx        # Session + role management
│   │   ├── SettingsContext.tsx    # App-wide settings (language, etc)
│   │   ├── apiClient.ts           # Centralized fetch wrapper (adds JWT auth header)
│   │   ├── authToken.ts           # LocalStorage auth token persistence
│   │   ├── userRoles.ts           # Platform role checks (isAuditor, etc)
│   │   ├── platformRoles.ts       # Role enum and normalization (synced with server)
│   │   ├── [40+ domain-specific utilities]
│   │   │   ├── questionWorkflow.ts, projectQuestionUtils.ts
│   │   │   ├── exportMarkdownPreviewPdf.ts, exportSubmissionsZip.ts
│   │   │   ├── assignmentAccessLink.ts, assignmentEmailContent.ts
│   │   │   └── [more...]
│   ├── services/
│   │   ├── db.ts                  # Firestore-shaped compatibility layer
│   │   │   # Maps Firestore-style collection(path).where(...).getDocs()
│   │   │   # to /api/db/* REST endpoints (backed by Postgres via Prisma)
│   │   ├── excel.ts               # XLSX import/export
│   │   ├── gemini.ts              # Google Gemini API client
│   │   └── tts.ts                 # Text-to-speech
│   ├── data/                      # Static data (enums, translations, etc)
│   └── hooks/                     # React hooks
│
├── server.ts                      # Express entry point (handles auth + setup)
├── server/
│   ├── routes/
│   │   ├── mongoApi.ts            # Generic CRUD endpoints /api/db/:resource (name is historical; Postgres-only)
│   │   └── onBehalfResponse.ts     # "Submit on behalf of contact" workflows
│   ├── data/                      # Prisma data-access layer (one *DataAccess.ts / *Sql.ts per domain)
│   │   ├── prismaClient.ts        # Prisma client singleton + checkSqlConnection()
│   │   ├── genericApiSql.ts       # SQL implementations of the generic /api/db endpoints
│   │   ├── resourceRepository.ts / prismaResourceRepository.ts   # Resource repository seam
│   │   └── [per-domain *DataAccess.ts files]
│   ├── lib/
│   │   ├── requestAuth.ts         # JWT validation → PlatformUser lookup
│   │   ├── s3Storage.ts           # S3 upload utilities
│   │   ├── answerAuditLog.ts      # Track answer submission actors
│   │   ├── assignmentQuestionSync.ts
│   │   ├── domainEnums.ts         # Plain shared constants (emission scopes, ESRS topics, etc)
│   │   ├── [more domain utilities]
│   │   └── platformRoles.ts       # Role normalization (synced with client)
│   └── auth/password.ts           # crypto.scrypt hashing
│
├── scripts/                       # One-off utility scripts
│
├── lib/                           # Shared client+server code
│   └── platformRoles.ts           # Platform role enum (must stay in sync)
│
├── prisma/
│   └── schema.prisma              # Prisma schema — source of truth for the data model
│
├── vite.config.ts                 # Vite + React + Tailwind config
├── tsconfig.json                  # TypeScript config (target ES2022, jsx react-jsx)
├── package.json                   # Scripts, dependencies
├── Dockerfile                     # Multi-stage build (builder + runner)
├── docker-compose.yml             # App + Postgres/pgvector + MinIO + Redis + Qdrant
├── docker-compose.minio.yml       # MinIO only
├── .env.example                   # Environment variable template
└── docs/security_spec.md          # Threat model & data invariants
```

### Data Model (Prisma Schema)

Source of truth is `prisma/schema.prisma`. Core entities organized by responsibility:

**Template & Configuration**
- `Segment`, `Template`, `TemplatePage`, `Question`, `Domain`

**Customer & Participants**
- `Customer`, `Branch`, `Contact`, `PlatformUser`, `OtpCode`

**Project Execution**
- `Project`, `ProjectPage`, `ProjectUserAssignment`, `Assignment`, `Answer`, `AnswerVersion`, `CommentMessage`

**Platform & Knowledge**
- `AuditLog`, `Translation`, `EmailSettings`, `AppSetting`, `AIDraft`
- `KnowledgeBase`, `KBDocument`

Most models include:
- `legacyFirebaseId` (tracks the original Firestore migration; retained for historical id lookups)
- `createdBy`, `ownerId` (ownership/audit)
- Prisma timestamps (`createdAt`, `updatedAt`)
- `id` as the primary key (`cuid()`), used directly by the frontend

### Frontend Data Access Pattern

The compatibility layer `src/services/db.ts` preserves Firestore-like API:
```typescript
// Maps to /api/db/ REST endpoints under the hood
collection(path)
  .where(field, op, value)
  .orderBy(field)
  .limit(n)
  .getDocs()  // Returns { docs: [] }
  .then(snap => snap.docs.map(doc => doc.data()))
```

This allows incremental migration without rewriting UI components. Example mapping:
- `customers/:customerId/contacts` → `GET /api/db/contacts?customerId=...`
- `projects/:projectId/answers` → `GET /api/db/answers?projectId=...`

## Authentication & Authorization

### Session Flow
1. User logs in via email+password or OTP.
2. Backend issues JWT (configurable expiry; default `1d`).
3. Frontend stores in LocalStorage via `src/lib/authToken.ts`.
4. `src/lib/apiClient.ts` attaches `Authorization: Bearer <token>` header.
5. Backend validates JWT in `server/lib/requestAuth.ts` → resolves `PlatformUser`.
6. `/api/auth/me` on app boot restores session (via `AuthContext.tsx`).

### Platform Roles
Defined in `lib/platformRoles.ts` (single source of truth; `PlatformUser.role` is a plain string column in Postgres, validated against this list at the application layer):
- `platform_admin` — full access
- `consultant_manager` — manage customers, all projects
- `consultant` — assigned projects only
- `contributor` — limited edit access
- `customer` — external client, sees assigned projects
- `auditor` — read-only on projects

### OTP Bootstrap Rule
Only the **first user** can auto-register via OTP request. If DB has 0 platform users, email is created as `platform_admin`. If users exist and email unknown, backend returns success but does not send OTP (prevents account enumeration).

## Key Integration Points

### Email Delivery (Brevo)
- OTP codes
- Password reset links
- Assignment notifications
- Configured via `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` env vars
- Routes handle password reset origin aliases (`PASSWORD_RESET_ORIGIN_ALIASES`) for multi-domain deployments

### Google Gemini (Optional)
- Browser-side chat and content generation in `KnowledgeChatPage.tsx`
- Server-side report drafting in `ProjectDetailPage.tsx` (uses `services/gemini.ts`)
- Requires `VITE_GEMINI_API_KEY` (browser) and `GEMINI_API_KEY` (server)
- Lazily initialized; missing API keys do not crash startup

### S3-Compatible Storage (Optional)
- Large profile images (> ~350KB) uploaded to S3 or local MinIO via Multer
- `server/lib/s3Storage.ts` handles PutObject + URL normalization
- Public URLs stored in `avatarUrl` fields
- Local MinIO via `docker-compose.minio.yml` (minioadmin/minioadmin)
- AWS S3 via credentials in `.env`

### Contact Magic Links (Token-Gated Access)
- Consultants can email structured questionnaire links to external contacts
- Links include JWT token (default expiry `7d`, configurable via `CONTACT_RESPONSE_TOKEN_EXPIRES_IN`)
- Contact fills form without account; submission tracked as "contact response"
- Workflow in `server/routes/onBehalfResponse.ts`

## Configuration

Key environment variables (see `.env.example` for full list):

```
PORT=3010
DATABASE_URL=postgresql://governance:governance@localhost:5442/governance
JWT_SECRET=<long-random-string>
PLATFORM_API_KEY=<optional>

BREVO_API_KEY=<api-key>
BREVO_FROM_EMAIL=<verified-sender@domain>
BREVO_FROM_NAME=<Display Name>

GEMINI_API_KEY=<server-key>
VITE_GEMINI_API_KEY=<browser-key>

# Multi-domain password reset
PASSWORD_RESET_PUBLIC_URL=https://giq.impact-ai.co.uk
CORS_ALLOWED_ORIGINS=https://giq.impact-ai.co.uk,https://giq.g2m.partners

# S3-compatible storage (MinIO or AWS)
S3_BUCKET=governance-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://127.0.0.1:9000
S3_FORCE_PATH_STYLE=true

# Login page UI customization (Vite rebuild required)
VITE_LOGIN_TITLE=GovernanceIQ
VITE_LOGIN_TAGLINE=Consultancy governance platform
VITE_LOGIN_LANG=en  # en | tr
```

## Testing & Validation

```bash
npm run lint                       # Type-check
curl http://localhost:3010/api/health
# Expected: { "status": "ok", "dbDriver": "sql", "sqlReady": true, "env": "development" }
```

Manual checks after deployment:
- Login page loads without errors
- OTP and password login return JWT
- `/api/auth/me` works with valid bearer token
- CRUD screens load data via `/api/db/*`

## Important Implementation Details

### Large Files
- `src/pages/admin/ProjectDetailPage.tsx` (400KB) — handles all project interactions (questions, answers, assignments, comments); consider dynamic import if bundle size is a concern
- `server.ts` (56KB) — all Express routes and middleware; consider extracting feature-specific middleware

### Turkish Language Support
- Platform supports **English** and **Turkish** via `VITE_LOGIN_LANG` env var and URL query override (`#/login?lang=tr`)
- Questions have bilingual fields: `baslik` (title), `soru` (question text), `ilgiliBirun` (responsible unit), `aciklama` (explanation), `ornekYanit` (sample answer)
- Field `soruCogaltma` (question multiplier) enables "sube bazinda" (branch-based) expansion: one template question maps to N project questions (one per branch)

### Role Synchronization
- `lib/platformRoles.ts` is the single source of truth for platform roles; the client reads the same file, so there's nothing separate to keep in sync anymore
- Changes to the role list only require updating `lib/platformRoles.ts` (and any UI copy that lists roles)

### Answer Audit Logging
- `server/lib/answerAuditLog.ts` tracks who submitted an answer and when
- On-behalf submissions (contact via magic link vs. internal user) are recorded in `submissionActors`

### Question Cloning & Expansion
- Questions can be cloned from templates into projects via `server/lib/cloneTemplateQuestionsToProject.ts`
- Branch-based expansion via `server/lib/expandProjectQuestionsByBranch.ts` (creates N variants per branch when `soruCogaltma: 'sube_bazinda'`)
- Stale branch questions detected/repaired in `expandStaleBranchQuestionsInProject.ts` and `repairBranchQuestionTextInProject.ts`

## Deployment & Operations

### Single-Process Deployment
```bash
npm run build         # Bundles React to dist/
npm run start         # Runs Node server.ts from production artifact
```
Express serves:
- Static assets from `dist/` (React SPA)
- API endpoints (`/api/*`)
- Falls back to `dist/index.html` for HashRouter SPA routing

### Docker
```bash
docker build . -t governanceiq:latest
docker run -p 3010:3010 --env-file .env governanceiq:latest
```

### Required External Services
- PostgreSQL (default `postgresql://governance:governance@localhost:5442/governance`)
- Brevo (for email; can be mocked in dev)
- Google Gemini (optional; lazy-init)
- S3-compatible storage (optional; MinIO for local dev, AWS for production)

## Security Notes

**Current Protections**
- JWT required for authenticated API endpoints
- Passwords hashed with Node `crypto.scrypt`
- OTP auto-registration limited to first platform user
- Generic success messages for account enumeration-sensitive operations
- `legacyFirebaseId` preserves the Firestore migration audit trail on rows that predate it

**Production Hardening Checklist**
- ✅ Move `JWT_SECRET` to deployment secrets (not source control)
- ✅ Use HttpOnly cookies + CSRF protection instead of LocalStorage JWT (XSS risk)
- ✅ Review resource-level authorization per route (current checks are generic/requester-aware)
- ✅ Least-privilege S3 bucket policies (bundled MinIO allows anonymous download **only** for local dev)
- ✅ Set `DISABLE_HMR=true` in production to disable Vite dev features

See `docs/security_spec.md` for threat model.

## Common Workflows for Contributors

### Adding a New Admin Page
1. Create `src/pages/admin/MyNewPage.tsx`
2. Define data fetching in component or extract to `src/services/db.ts` helper
3. Add route in `src/App.tsx` within `<AdminLayout>` guard
4. Add navigation link in `src/components/layout/AdminLayout.tsx` sidebar
5. Use `useAuth()` to check platform role (e.g., `isFullAdmin`, `isConsultant`)
6. Reuse UI components from `src/components/ui/`

### Adding a Database Model
1. Define the model in `prisma/schema.prisma` (include `legacyFirebaseId`, `createdBy`, `ownerId`, timestamps if it fits the pattern of existing models)
2. Run `npm run db:generate` (and `npm run sql:push` / a migration in prod) to apply it
3. Add the resource name to `KNOWN_RESOURCES` in `server/routes/mongoApi.ts` so the generic `/api/db/:resource` endpoints work, plus any domain-specific query/sort defaults in `server/data/genericApiSql.ts`

## References

- **Tech Stack Documentation**: `docs/architecture/tech-stack-architecture.md`
- **Platform Guide** (business perspective): `docs/guides/platform-guide.md`
- **Documentation index**: `docs/README.md`
- **Security Specification**: `docs/security_spec.md`
- **Firebase Blueprint** (legacy): `docs/archive/firebase-blueprint.json`
