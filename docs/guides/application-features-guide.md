# VeritasESG — Application Features Guide

Practical guide to every major feature in the VeritasESG web application. For narrative walkthroughs and troubleshooting, see also [`user-guide.md`](user-guide.md) (English) and [`user-guide-tr.md`](user-guide-tr.md) (Turkish).

**Audience:** consultants, engagement managers, platform administrators, and customer contacts.

**Languages:** The UI supports **English** and **Turkish**. Add `?lang=en` or `?lang=tr` to the login URL (HashRouter: `#/login?lang=tr`).

---

## Quick start (first 30 minutes)

1. **Sign in** at your firm’s URL with email + password, or request a one-time code (OTP).
2. Open **Customers** (admin/manager) or **Customer directory** (consultant) and confirm the client exists.
3. Create a **Project** from a **Template** for that customer.
4. On the project **Forms** tab, **assign** questions to contacts or internal users.
5. Track responses on **Tasks** (internal) or via contact **magic links** (external).
6. Export answers when the cycle is ready (Excel, PDF/Markdown, or ZIP).

---

## Feature map

| Module | Menu path | Who can use it | Purpose |
|--------|-----------|----------------|---------|
| Dashboard | Dashboard | All (role-scoped) | Overview and shortcuts |
| Customer directory | Customers | Admin, manager, consultant | Find clients and contacts |
| Customer management | Administration → Customers | Admin, manager | Create/edit clients, branches, contacts, ESG profile |
| Organizational boundary | Onboarding flow | Admin, manager | Define reporting boundary for emissions |
| Templates & sectors | Administration | Admin, consultant | Reusable questionnaires |
| Projects | Projects | All (scoped) | Live reporting engagements |
| Tasks | Tasks | All internal | Answer assigned questions |
| Materiality (DMA) | Materiality | Admin, manager, consultant | Double materiality scoring |
| Materiality surveys | Önemlilik Anketleri | Admin, manager, consultant | Send stakeholder surveys (token links) |
| Materiality design | Önemlilik Yönetimi | Admin, manager | Configure materiality matrix templates |
| Emission data | Emission Data | Admin, manager, consultant | Enter activity metrics with approval workflow |
| Emission calculation | Emission Calculation | Admin, manager, consultant | Calculate tCO₂e from factors |
| Knowledge base | Administration → Knowledge Base | Admin | Document libraries for RAG |
| AI chat | AI Chat | Admin (if enabled) | Ask questions against KB content |
| Users & audit | Administration | Admin | Accounts, roles, audit log |
| Platform guide | Account → Platform guide | All | In-app help |

Some menu items are hidden when modules are turned off in **Settings** (platform administrator).

---

## 1. Authentication

### Password login
1. Go to **Login**.
2. Enter email and password → **Sign In**.

### OTP login
1. Choose **Login with OTP**.
2. Enter email → **Send Code**.
3. Enter the 6-digit code → **Verify & Login**.

> Only the **first user** on an empty system can self-register via OTP (becomes platform admin). After that, an administrator must invite users.

### Password reset
1. **Forgot Password?** on the login screen.
2. Submit email → open the link from your inbox → set a new password.

---

## 2. Customers and contacts

### Create a customer (admin / consultant manager)
1. **Administration → Customers** → add customer.
2. Fill organisation details: name, sector, NACE/SASB classification, workforce, turnover, reporting frameworks.
3. Save.

### Branches
Open the customer → **Branches** tab. Add sites or business units. Branch-based question expansion (`soruCogaltma: sube_bazinda`) duplicates template questions per branch inside projects.

### Contacts
Add people with name, email, role, and optional branch. Contacts receive **assignment magic links** and do not need platform accounts.

### Customer profile & ESG summary
The customer record holds ESG context, framework keys, CSRD scope indicators, and materiality settings used across projects and emissions.

### Customer directory
Read-only searchable view for consultants who cannot edit the master customer list.

### Organizational boundary onboarding
Use when setting up **emissions** reporting scope: define which entities and facilities belong in the inventory before entering emission data.

---

## 3. Templates, sectors, and questions

### Sectors and service categories
**Administration → Sectors** and **Categories** group templates by industry or service line.

### Templates
1. **Templates** (from a sector) → create or open a template.
2. Add **pages** (sections) and **questions**.
3. Configure bilingual fields (`baslik`, `soru`, `aciklama`, `ornekYanit`, `ilgiliBirim`).
4. Set answer type (textarea, integer, decimal) and optional branch multiplier.

### Template dataset (VERİSETİ) tab
- Toggle visible columns with the column picker.
- Drag column borders to resize.
- Open **Detay** on any row for the full field set.

---

## 4. Projects

### Create a project
1. **Projects** → new project.
2. Select **customer** and **template**.
3. Save — pages and questions are copied from the template.

### Project tabs (typical)
| Tab | Use |
|-----|-----|
| Forms | Questionnaire, answers, assignments |
| Audit | Submission history |
| Plan | Scheduling |
| Users | Project team roles |
| Activity | Change timeline |

### Project team roles
| Role | Access |
|------|--------|
| admin | Full project control |
| editor | Edit content and answers |
| contributor | Answer assigned items |
| auditor | Read-only |

### Rebuild from template
Syncs project questions with the current template. **Warning:** questions removed from the template may disappear from the project — review answers after rebuild.

---

## 5. Assignments and tasks

### Assign questions (consultant)
1. Open project → **Forms**.
2. Select question(s).
3. Choose **contact** or **platform user**.
4. Set deadline, urgency, optional approver, and message.
5. Send — external contacts receive a **magic link** email.

### Internal tasks
**Tasks** lists all questions assigned to you across projects.

1. Filter: All / Pending / Completed.
2. Open a task → enter answer, comment, evidence.
3. **Save Answer** → **Mark Complete** when finished.

### On-behalf submission
Consultants can submit answers for a contact (phone interview, workshop). The audit trail records who actually submitted vs. who was assigned.

### Assignment approval & reminders
Assignments support approver workflow and automated deadline reminders (`before_3d`, `on_due`, `overdue_*`).

---

## 6. External contact response (magic link)

1. Contact opens the emailed link (no login).
2. Sees project name, organisation, and assigned questions.
3. Enters answers, optional comments and evidence.
4. **Save Answer** to continue later (same link).
5. **Mark Complete** to lock submission.

Links expire (default **7 days**). Request a new link from the consultant if expired — saved drafts are kept.

---

## 7. Materiality

### Double Materiality Assessment (DMA)
**Materiality** → select customer and year.

- Score ESRS topics: financial impact, impact severity, probability, stakeholder concern.
- System computes **material** topics.
- Approve the assessment when the matrix is final.

### GRI / ESRS / ISSB assessment modules
Project and customer flows integrate framework-specific scoring (see in-app **Materiality** and customer ESG tabs).

### Materiality surveys
**Önemlilik Anketleri** → create a survey → share the **public token link** (`#/materiality-survey/:token`).

Stakeholders respond without logging in. Results feed materiality analysis.

### Materiality design (admin)
**Önemlilik Yönetimi** — configure design templates and matrix rows used across customers.

---

## 8. Emissions

Two related modules:

### Emission Data (`/emission-data`)
Enter **activity metrics** (energy, fuel, travel, etc.) per customer and year.

1. Select customer and reporting year.
2. For each metric definition, enter value and notes.
3. Move through approval stages: **Data Entry → Manager Review → Horizon Review → Approved**.
4. Metrics can be scoped **per facility** (branch) or **company-wide** (no facility selected).

> You may hold both company-wide consolidated figures and separate per-facility rows for the same metric code.

### Emission Calculation (`/emissions`)
Calculate **tCO₂e** from emission factors.

1. Select customer, year, and optional facility filter.
2. Use **Calculate** with activity values and emission factors.
3. Review scope 1/2/3 totals, facility breakdown, and optional market-based Scope 2.
4. Intensity metrics (per revenue, production, employee) when intensity inputs exist.

---

## 9. Knowledge base and AI chat

### Knowledge base (admin)
1. **Knowledge Base** → create KB (scoped to customer, project, or domain).
2. Upload documents (PDF, etc.).
3. Wait for ingest/processing to complete.

### AI chat
**AI Chat** → select knowledge bases → ask natural-language questions.

Answers cite document chunks when RAG is configured. Always review AI output before client use.

Requires `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` and vector storage (pgvector or Qdrant).

---

## 10. Exports and reporting

From a project (users with edit access):

| Export | Contents |
|--------|----------|
| Excel (XLSX) | Questions and answers for analysis |
| PDF / Markdown | Formatted report preview |
| Submissions ZIP | Answers plus evidence files |

---

## 11. Administration

### Users (platform admin)
**Users** → invite by email, assign platform role, deactivate accounts.

### Audit log
Tracks sign-ins, answer submissions, on-behalf actors, and administrative actions.

### Translations
Manage EN/TR UI strings.

### Settings
Toggle modules (projects, tasks, materiality, emissions, AI chat), email branding, and help links.

### In-app help
**Platform guide** and **Platform presentation** in the Account section of the sidebar.

---

## 12. Roles at a glance

| Platform role | Typical access |
|---------------|----------------|
| platform_admin | Full platform |
| consultant_manager | Customers, all projects, materiality, emissions |
| consultant | Projects, tasks, templates, directory, emissions |
| contributor | Tasks (+ profile) only |
| customer | Assigned projects only |
| auditor | Read-only projects |

---

## 13. Running UI tests (developers)

Client UI tests live under `tests/client/`:

```bash
npm run test:client -- tests/client/adminShell.ui.test.tsx tests/client/loginPage.ui.test.tsx
```

- **`adminShell.ui.test.tsx`** — sidebar navigation and role/module gating.
- **`loginPage.ui.test.tsx`** — login, forgot password, and OTP mode switching.

Shared render helpers: `tests/client/helpers/renderWithAppShell.tsx`.

---

## Related documentation

| Document | Focus |
|----------|--------|
| [`user-guide.md`](user-guide.md) | Detailed end-user guide (English) |
| [`user-guide-tr.md`](user-guide-tr.md) | Turkish user guide |
| [`platform-guide.md`](platform-guide.md) | Business overview for consultants |
| [`COMPLETE_SYSTEM_WORKFLOW.md`](COMPLETE_SYSTEM_WORKFLOW.md) | End-to-end workflow |
| [`../operations/smoke-checklist.md`](../operations/smoke-checklist.md) | Post-deploy checks |
