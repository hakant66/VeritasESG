# GovernanceIQ Platform Workflow Guide

## Overview

GovernanceIQ is a sustainability and governance reporting platform that enables organizations to manage sustainability assessments, track progress, and maintain governance compliance. This document maps the complete workflow across all major features and modules.

---

## Table of Contents

1. [Platform Initialization & User Management](#platform-initialization--user-management)
2. [Customer & Organization Management](#customer--organization-management)
3. [Project Lifecycle](#project-lifecycle)
4. [Sustainability Reporting Workflow](#sustainability-reporting-workflow)
5. [Materiality Assessment (DMA) Workflow](#materiality-assessment-dma-workflow)
6. [Emissions Module Workflow](#emissions-module-workflow)
7. [Assignment & Task Management](#assignment--task-management)
8. [Knowledge Base & Chat Support](#knowledge-base--chat-support)
9. [Audit & Compliance](#audit--compliance)
10. [Administrative Functions](#administrative-functions)

---

## Platform Initialization & User Management

### User Registration & Login

**Entry Point:** Login page (`/login`)

**Flow:**
1. **First User Auto-Bootstrap**
   - When platform has 0 users: User can request OTP with any email
   - Backend auto-creates account as `platform_admin`
   - Send OTP confirmation
   - User sets password and logs in

2. **Subsequent User Registration**
   - Existing users cannot create new accounts via OTP
   - New users must be invited by platform admin
   - Admin creates platform user with role (platform_admin, consultant_manager, consultant, contributor, customer, auditor)
   - System sends invitation email with account setup link

3. **Login Flow**
   - User enters email + password
   - Backend validates credentials (scrypt hashing)
   - Issues JWT token (default expiry: 1 day)
   - Frontend stores token in LocalStorage
   - `/api/auth/me` called on app boot to restore session (via AuthContext)

4. **Password Reset**
   - User requests password reset → backend sends email link
   - Link includes token (default expiry: varies by deployment)
   - User sets new password via token-gated form
   - Supports multi-domain deployments via `PASSWORD_RESET_ORIGIN_ALIASES`

### Role & Permission Model

**Platform Roles:**
- `platform_admin` — Full access to all features, user management, settings
- `consultant_manager` — Manage consultants, customers, all projects
- `consultant` — Create/edit assigned projects only
- `contributor` — Limited edit access within assigned scope
- `customer` — External user, sees assigned projects in portal view
- `auditor` — Read-only access to assigned projects

**Authorization Checks:**
- JWT validation on all authenticated endpoints
- Role-based access via `useAuth()` hook (frontend)
- Resource-level checks in routes (backend)
- NOTE: Current checks are generic/requester-aware; should add granular resource authorization

---

## Customer & Organization Management

### Customer Directory

**Entry Point:** Customers page (`/customers`)

**Access:** Consultant Manager, Consultant, Platform Admin

**Workflows:**

#### 1. Create Customer
1. Click "Add Customer" button
2. Fill form:
   - Organization name
   - Contact person details (optional)
   - Sector IDs (sustainability classification)
   - Branches (multi-location organizations)
3. Save → Customer created in MongoDB
4. Activity logged in audit trail

#### 2. Manage Customer Details
1. Click customer row to expand
2. Edit:
   - Organization name
   - Contact information
   - Sector classification
   - Branch structure
3. Changes saved immediately to database
4. Affects which templates are available for projects

#### 3. Customer Branches
- Customers can have multiple branches (e.g., regional offices)
- Used for question expansion in projects
  - When `soruCogaltma: 'sube_bazinda'` is set on a question
  - One template question expands to N project questions (one per branch)
- Branch-specific metrics collection (e.g., emissions by facility)

#### 4. Contact Management
- Each customer can have multiple contacts
- Contacts can be assigned to projects (external respondents)
- Contact magic links enable token-gated questionnaire access
  - Contact receives email with unique link (7-day token, configurable)
  - No account required—direct form submission
  - Responses tracked as "contact response" in audit log

### Customer Portal View

**Entry Point:** Customers Directory (`/customers`)

**Two Views:**
1. **Directory View** (Consultant/Manager)
   - List of all assigned customers
   - Quick actions: View projects, manage contacts, edit details
   - Search and filter by sector, name

2. **Customer Detail View**
   - Overview: Basic info, sector, branches
   - Projects tab: All projects for this customer
   - Contacts tab: External respondents, email templates
   - Activity log: Changes and submissions

---

## Project Lifecycle

### Project Creation & Templates

**Entry Point:** Customers page → "Launch Project" button

**Flow:**
1. Click customer → "Launch Project"
2. Select:
   - **Template** (e.g., "Emisyon Verileri", "Custom Assessment")
   - **Project Name**
   - **Category** (Standard or Service)
   - **Optional:** Project-specific settings

3. Backend:
   - Creates `Project` document with template ID
   - Clones template pages → `ProjectPage` records
   - Clones template questions → `Question` records for the project
   - If `soruCogaltma: 'sube_bazinda'`: expands questions per branch
   - Sets initial project status to "Draft"

4. **Template Auto-Selection (NEW)**
   - After DMA assessment is approved with material topics (e.g., E1):
   - If creating new project and no template selected:
     - System suggests loading corresponding template (e.g., "Emisyon Verileri")
   - Template can be auto-loaded via "Yükle" button or manually selected
   - Template can be changed anytime in project settings

### Project Overview & Settings

**Entry Point:** Project Detail page (`/projects/:projectId`)

**Overview Tab:**
- Project status (Draft, In Progress, Completed)
- Basic info: Name, customer, template, dates
- Progress bars: Overall completion, per-page breakdown
- Key metrics: Questions sent, responses received, approval rate

**Project Settings:**
- Edit project name, start/end dates
- Change template (rebuild questionnaire)
- Add/modify domains (assessment categories)
- Manage stakeholders (internal team members)
- Clear project data (admin only, dangerous)

### Project Status Workflow

**Status Lifecycle:**
1. **Draft** — Initial state, questionnaires not yet sent
2. **In Progress** — Questions sent to respondents, waiting for answers
3. **Completed** — All questions answered and approved
4. (Note: States may differ; check actual implementation in Project model)

---

## Sustainability Reporting Workflow

### Template Management

**Entry Point:** Admin settings (if available) or backend access

**Template Concept:**
- Reusable questionnaire blueprints
- Organized by sector (e.g., Energy, Manufacturing)
- Contain pages (logical groupings) and questions
- Questions have multilingual fields (TR/EN), guidance, video embeds
- Questions can have `soruCogaltma: 'sube_bazinda'` for branch expansion

**Template Usage:**
- Select when creating a project
- Clone into project with customizations
- Can rebuild project questionnaire from a different template

### Project Questions & Pages

**Structure:**
- Project → Pages (sections of the questionnaire)
  - Each page can be filtered by kind: 'customer' or 'audit'
  - Each page → Questions
  - Each question → Multiple answers (per respondent or revision)

**Question Workflow:**
1. Questions cloned from template at project creation
2. Can be reordered, hidden, or modified after cloning
3. Question status workflow:
   - `not_sent` → `sent_pending` → `customer_responded` → `approved` or `sent_back`
4. Questions track:
   - Respondent assignment
   - Submission history
   - Approval status
   - Comments and feedback
   - Audit trail of changes

**Question Types & Fields:**
- Text, textarea, multiple choice, file upload
- Multi-language fields: `baslik` (title), `soru` (question text), `aciklama` (explanation)
- Guidance materials: links, videos, sample answers
- Branching logic: `soruCogaltma` (multiplier for branch-based expansion)

### Guidance & Support Materials

**Per-Question Guidance:**
- Sample answers (`ornekYanit`)
- Explanation (`aciklama`)
- Video embeds (configurable per platform)
- Reference links (external resources)
- Uploaded documents (images, PDFs)

**Creation/Editing:**
- Consultant can add/edit guidance in project
- Edit modal with markdown support
- Guidance can include links to knowledge base docs
- Video embeds via YouTube/Vimeo

---

## Materiality Assessment (DMA) Workflow

**Entry Point:** Materiality Assessment page (`/dma`)

### Complete Workflow

**Phase 1: Topic Scoring**
1. Select customer and year
2. Platform loads fixed ESRS topic list (E1-G1, 10 topics):
   - E1: Climate Change (Emissions)
   - E2: Pollution
   - E3: Water & Marine
   - E4: Biodiversity
   - E5: Circular Economy
   - S1: Own Workforce
   - S2: Value Chain Workers
   - S3: Affected Communities
   - S4: Consumers/End-users
   - G1: Business Conduct

3. For each topic, assess 4 dimensions (1-5 scale each):
   - **Finansal Etki** (Financial Impact): Risk to business
   - **Etki Şiddeti** (Impact Severity): Severity of harm to stakeholders
   - **Olasılık** (Probability): Likelihood of occurrence
   - **Paydaş Endişesi** (Stakeholder Concern): External pressure/expectations

4. Add optional notes per topic

**Phase 2: Materiality Calculation**
- Server applies ESRS double-materiality heuristic:
  - Topic is material if ANY of:
    - Any dimension ≥ 4
    - Financial score (impact × probability) ≥ 12
    - Impact score (severity × probability) ≥ 12
    - Stakeholder concern ≥ 4

**Phase 3: Review & Approval**
1. Assessment locked in DRAFT status while editing
2. View summary:
   - Material topics (marked with "ÖNEMLİ" badge)
   - Non-material topics
   - Impact matrix (financial impact vs. severity)
   - Topic-to-module mapping (which DMA topics map to which data modules)

3. Only Consultant Manager/Admin can approve
4. Click "Onayla" to lock assessment as APPROVED
5. Approval tracked: `approvedBy`, `approvedAt` timestamp

### DMA → Project Integration

**Phase 4: Template Auto-Suggestion (NEW)**
1. After approval, if material topics exist:
   - DMA page shows "Önerilen Şablonlar" section
   - Maps material topics to templates:
     - E1 material → suggests "Emisyon Verileri (Kapsam 1/2/3)"
     - E2 material → suggests "Kirlilik Metrikleri" (coming soon)
     - S1 material → suggests "Çalışan Metrikleri" (coming soon)
     - G1 material → suggests "Yönetişim Raporlaması" (coming soon)
   - User can create project using suggested template

2. In Project Detail view:
   - If DMA approved with E1 material + project has no template:
     - Blue banner appears: "Önerilen Şablon"
     - Shows: "E1 konusu önemli olarak işaretlenmiş. Emisyon Verileri şablonunu yüklemek önerilir."
     - Buttons: "Yükle" (load) or "Sonra" (later)
   - Clicking "Yükle":
     - Updates project with template ID
     - Reloads project data
     - Questions from template added to project
   - Clicking "Sonra": Dismisses suggestion (can be shown again on reload)
   - Template can be changed manually anytime

### DMA Config & Downstream Usage

**API Endpoint:** `/api/materiality/config`
- Returns: `{ isApproved, materialTopics, isE1Material, isDMAComplete }`
- Used by other modules to gate behavior:
  - Emissions module: Only available if E1 is material
  - May expand to other modules as features are added

**Note:** Currently E1 is primary integration; extensible for other topics as modules are built.

---

## Emissions Module Workflow

**Entry Point:** Emissions page (within project)

**Purpose:** Collect Scope 1, 2, 3 emissions data when E1 is marked material in DMA

### Emissions Data Collection

**Prerequisites:**
- DMA approved with E1 marked as material
- Project template includes emissions questions/pages

**Workflow:**

1. **Project Setup**
   - Facility/Location breakdown (e.g., HQ, Factory A, Warehouse B)
   - Year of reporting
   - Emission calculation method (market-based vs location-based for Scope 2)

2. **Scope Breakdown**
   - **Scope 1:** Direct emissions (fuel combustion, process emissions)
   - **Scope 2a (Market-based):** Purchased electricity (using supplier emission factors)
   - **Scope 2b (Location-based):** Purchased electricity (using grid averages)
   - **Scope 3:** Value chain (supply chain, employee commute, waste, etc.)

3. **Data Entry**
   - Facility-level data input
   - Automatic calculations (activity × emission factor)
   - Unit support: tCO₂e, kWh, liters, etc.
   - Can upload data via Excel

4. **Intensity Metrics**
   - Emissions per revenue (tCO₂e / €M)
   - Emissions per employee (tCO₂e / FTE)
   - Emissions per production unit (industry-specific)

5. **Visualization & Export**
   - Breakdown by scope (stacked bar chart)
   - Trend over time (line chart)
   - Facility comparison
   - Export to PDF/Excel

---

## Assignment & Task Management

### Creating Assignments

**Entry Point:** Project Detail → Forms/Questions tab

**Flow:**
1. Select question(s) to assign
2. Click "Quick Assign" or use assignment modal
3. Select assignee (contact or internal stakeholder)
4. Set deadline
5. Add custom message (email template)
6. Send → Backend generates unique token for contact access

### Assignment Email & Access

**Email Content:**
- Question context (title, guidance)
- Deadline
- Instructions (form link)
- Custom message from consultant
- Token-gated link (7-day default expiry)

**Token-Gated Access:**
- Link includes JWT token specific to the assignment
- Contact opens link → pre-filled form with question
- No authentication required
- Submission tracked as "contact response" with token info

**Submission Workflow:**
1. Contact receives email with link
2. Clicks link → Form page (no login required)
3. Fills responses
4. Submits → Answer recorded in database
5. Submitter tracked in audit log (`submissionActors`)
6. Consultant notified (if configured)

### Internal Assignment & Approval

**Internal Team Assignments:**
- Assign to platform users (consultants, colleagues)
- Users see task in Tasks tab
- Can submit responses directly (authenticated)
- Submission tracked with user ID

**Approval Workflow:**
1. Question assigned to consultant A (data entry)
2. Consultant A submits response
3. Status moves from `sent_pending` → `customer_responded`
4. Can be sent back for revision with comments
5. Eventually approved → status `approved`

### Task Management

**Entry Point:** Tasks page (`/tasks`)

**View:**
- All tasks assigned to current user
- Filter by status (pending, in progress, completed)
- Grouped by project or deadline
- Quick actions: Open form, mark complete, extend deadline

**Workflow:**
1. Assigned question appears in task list
2. Click to open form
3. Submit response
4. Task marked as complete
5. Available for review/approval by manager

---

## Knowledge Base & Chat Support

**Entry Point:** Knowledge Chat page (`/knowledge-chat`)

**Purpose:** Optional AI-powered support for consultants to answer questions

### Knowledge Base Setup

**Admin Workflow:**
1. Upload documents to knowledge base (PDF, text, markdown)
2. Each document tagged with keywords, topics
3. System indexes documents for search/retrieval

### Chat Workflow

**Consultant Workflow:**
1. Open Knowledge Chat page
2. Ask question in natural language
3. System:
   - Searches knowledge base for relevant documents
   - Uses Google Gemini API to generate contextual answer
   - Cites sources from knowledge base
4. Chat history persisted for session
5. Can export answer as markdown for sharing

**Requirements:**
- `GEMINI_API_KEY` env var (optional; feature disabled if missing)
- Knowledge base documents uploaded
- Lazy initialization on first use

**Note:** Feature is optional; platform works without it.

---

## Audit & Compliance

### Answer Audit Trail

**Tracked Information:**
- Question submission history
- Who submitted (user ID or contact via token)
- When submitted (timestamp)
- What was submitted (answer version)
- Revisions and change log
- Comments/feedback from reviewers

**Access:**
- Project Detail → Audit tab
- View submission timeline
- See approval chain
- Track response actors

### Activity Log

**Entry Point:** Project Detail → Activity tab

**Logged Events:**
- Project created/updated
- Questions assigned/submitted
- Answers approved/rejected
- Comments added
- Template rebuilt
- User role changes
- Data exports

**Uses:**
- Compliance documentation
- Audit trail for governance
- Investigation of data changes

---

## Administrative Functions

### Platform Settings

**Entry Point:** Admin Settings (if available in navigation)

**Configurations:**
- **Email:** Brevo API key, sender details
- **Authentication:** JWT secret, OTP expiry, session duration
- **API:** Platform API key (if applicable)
- **UI:** Login page customization (title, tagline, language)
- **Multi-domain:** Password reset aliases, CORS origins

### User Management

**Entry Point:** Platform Admin Settings

**Admin Functions:**
1. **Create User**
   - Email
   - Name
   - Role (platform_admin, consultant_manager, consultant, contributor, customer, auditor)
   - Trigger invitation email

2. **Edit User**
   - Change role
   - Reset password
   - Enable/disable account

3. **View Users**
   - List all platform users
   - Filter by role
   - See last login, status

### Database Migrations

**One-time Operations:**
- `npm run migrate:import` — Import Firestore export (legacy)
- `npm run migrate:validate` — Validate data integrity
- `npm run migrate:platform-roles` — Normalize legacy roles
- `npm run migrate:soru-cogaltma` — Backfill question multiplier field
- `npm run seed:dump` / `npm run seed:restore` — Backup/restore MongoDB

### Data Exports & Backups

**Backup Workflows:**
1. **Manual export** (via CLI script)
   - Dump MongoDB to seed/mongo-dump
   - Can be restored for local development

2. **Automatic daily** (deployment-specific)
   - Depends on infrastructure setup
   - Not built-in; external script/job required

### S3 Storage Configuration

**When Enabled:**
- Large profile images (> ~350KB) upload to S3
- MinIO for local dev, AWS S3 for production
- Public URLs stored in database
- Configuration via env vars:
  - `S3_BUCKET`, `S3_REGION`
  - `S3_ENDPOINT` (MinIO or AWS)
  - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

---

## Features & Workflows Not Yet Fully Clarified

### 🔶 Module Expansion Points

**Emissions Module:** ✅ Clear
- Launched, integrates with DMA E1 topic

**Future Modules (Planned but not implemented):**
- **E2: Pollution Metrics** — When available, auto-suggest when E2 material
- **E3: Water Management** — When available, auto-suggest when E3 material
- **E4: Biodiversity Assessment** — When available, auto-suggest when E4 material
- **E5: Circular Economy** — When available, auto-suggest when E5 material
- **S1: Workforce Metrics** — When available, auto-suggest when S1 material
- **S2: Supply Chain Audit** — When available, auto-suggest when S2 material
- **S3: Community Impact** — When available, auto-suggest when S3 material
- **S4: Consumer Complaints** — When available, auto-suggest when S4 material
- **G1: Governance Reporting** — When available, auto-suggest when G1 material

**Integration Pattern:**
- DMA config endpoint checks each topic
- Downstream modules gate behind topic materiality
- Template auto-suggestion extends as modules are built

### 🔶 Question Workflow Status Transitions

**Current Flow:** ✅ Clear
- `not_sent` → `sent_pending` → `customer_responded` → `approved` or `sent_back`

**Questions:**
- Can questions be `sent_back` → `sent_pending` again? (Yes, implementation supports)
- Are all transitions possible or only specific paths? (Check question update logic)
- What triggers status auto-transitions vs. manual? (Mostly manual; some based on submission)

### 🔶 Comment & Feedback System

**Location:** Project Detail → Forms tab

**Scope:**
- Consultants can add comments to questions
- Comments can be used for feedback on submissions
- Are comments threaded or flat? (Implementation uses `CommentMessage` schema — appears flat)
- Who can see comments? (Consultant, assigned reviewer, admin)

**Status:** Implemented but workflow not fully documented.

### 🔶 Rebuild Questionnaire Feature

**Entry Point:** Project Detail → Overview or Admin panel

**Purpose:**
- Load questions from a different template into existing project
- Useful for changing assessment scope mid-project

**Workflow:**
1. Select new template from dropdown (filtered by sector)
2. System replaces ProjectPage/Question records
3. Previous answers kept? (Need to verify — likely archived/versioned)
4. Status reset to Draft?

**Status:** Implemented but not fully clear whether it's destructive or versioned.

### 🔶 Template Rebuild vs. Template Change

**Difference:**
- **Template Change** (Project Settings) — Metadata only; which template is associated
- **Rebuild Questionnaire** — Load new questions from template; replaces or appends?

**Status:** Need to clarify whether these are separate operations or linked.

### 🔶 Stakeholder Management

**Entry Point:** Project Detail → Users tab

**Features:**
- Add internal stakeholders (consultants, reviewers)
- Define roles: project lead, reviewer, contributor
- Assign specific responsibilities

**Questions:**
- Can stakeholders be assigned specific questions or pages?
- Are there sub-roles within projects (e.g., "Page Lead")?
- How does stakeholder role differ from platform role?

**Status:** Feature exists but role hierarchy not fully documented.

### 🔶 Payment & Subscription Model

**Status:** Not mentioned in codebase
- Is this a B2B SaaS with subscriptions? (Not visible in implementation)
- Who manages billing? (Likely external, not in platform)
- Does usage tier affect feature availability? (No evidence in code)

### 🔶 White-Labeling & Multi-Tenant Support

**Current Model:** Single-tenant per deployment
- `CORS_ALLOWED_ORIGINS` suggests multi-domain, same instance
- Database is per-deployment, not per-customer

**Questions:**
- Can one instance serve multiple independent organizations?
- Can branding be customized per customer? (Yes, via VITE_LOGIN_* env vars)
- Tenant isolation? (Not implemented; all data in one DB)

**Status:** Single-tenant design; multi-tenancy would require significant refactoring.

### 🔶 Offline Mode / Sync

**Status:** Not implemented
- App requires active connection to MongoDB backend
- No offline queue, local-first sync, or conflict resolution
- PWA features? (Not evident)

---

## Technical Workflow Details

### API Request Flow

**Frontend → Backend:**
1. `apiClient.ts` wrapper adds JWT token to all requests
2. `Authorization: Bearer <token>` header
3. Backend validates JWT in `requestAuth.ts`
4. Resolves `PlatformUser` from token
5. Routes check role/permissions
6. Returns 401 if unauthorized, 403 if forbidden

### Data Model Relationships

```
PlatformUser → Project → ProjectPage → Question → Answer
    ↓                                        ↓
  OtpCode                              AnswerVersion
                                      WorkflowStatusLog
                                      CommentMessage

Customer → Branch
    ↓
Contact → Assignment
    ↓
DMA → MaterialityTopic → MaterialityAssessment
    ↓
Template → TemplatePage → TemplateQuestion → Domain
```

### Caching & Performance

**Frontend:**
- Template list cached by sector (`cache.templatesBySegment`)
- Cache TTL: Configurable (default 30 min)
- Manual invalidation on save

**Backend:**
- No explicit caching layer
- MongoDB indexes on frequently queried fields
- Possible: Redis for session management (not implemented)

---

## Deployment Checklist

**Before Production:**
- ✅ Move `JWT_SECRET` to secrets management (not source control)
- ✅ Use HttpOnly cookies + CSRF instead of LocalStorage JWT (XSS risk)
- ✅ Review resource-level authorization (current checks generic)
- ✅ Configure S3 bucket policy (don't allow anonymous download)
- ✅ Set `DISABLE_HMR=true` to disable Vite dev features
- ✅ Configure Brevo API key, sender email
- ✅ Set CORS origins to allowed domains
- ✅ Backup/restore strategy for MongoDB

---

## Glossary

| Term | Definition |
|------|-----------|
| **DMA** | Double Materiality Assessment (ESRS E1-G1 topics) |
| **ESRS** | European Sustainability Reporting Standards |
| **Scope 1, 2, 3** | GHG Protocol emission categories |
| **Template** | Reusable questionnaire blueprint |
| **Project** | Customer-specific assessment instance |
| **Page** | Logical section within a questionnaire |
| **Question** | Individual survey item (with options) |
| **Answer** | Response to a question (versioned) |
| **Contact** | External respondent (no account, token-gated) |
| **Assignment** | Task to respond to specific question(s) |
| **Platform User** | Internal team member (authenticated) |
| **Materiality** | Topic relevance to business/stakeholders |
| **Guidance** | Supporting materials (samples, videos, links) |

---

## Document Status

**Last Updated:** June 3, 2026

**Coverage:**
- ✅ Platform initialization and user management
- ✅ Customer and contact management
- ✅ Project lifecycle and templates
- ✅ Sustainability reporting workflow
- ✅ Materiality assessment (DMA) with auto-template selection
- ✅ Emissions module integration
- ✅ Assignment and task management
- ✅ Knowledge base and chat
- ✅ Audit and compliance
- ✅ Administrative functions
- 🔶 Areas needing clarification (documented above)

**Future Additions:**
- API endpoint reference guide
- Database schema documentation
- Frontend component library
- Deployment & operations runbook
- Multi-language (Turkish/English) support details
- Performance optimization tips

