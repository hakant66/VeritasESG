# VeritasESG User Guide

A complete, plain-language guide to using VeritasESG, the sustainability and governance (ESG) reporting platform for consultancy firms.

> **Feature catalog:** For a concise module-by-module reference (including **Emission Data**, **Emission Calculation**, **Materiality surveys**, and **Organizational boundary**), see [`application-features-guide.md`](application-features-guide.md).

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Role Reference](#3-role-reference)
4. [Navigation](#4-navigation)
5. [Customer Management](#5-customer-management)
6. [Templates and Sectors](#6-templates-and-sectors)
7. [Projects](#7-projects)
8. [Assignments and Tasks](#8-assignments-and-tasks)
9. [External Contact Response](#9-external-contact-response)
10. [Reports and Exports](#10-reports-and-exports)
11. [Knowledge Base and AI Chat](#11-knowledge-base-and-ai-chat)
12. [Administration](#12-administration)
13. [Tips and Troubleshooting](#13-tips-and-troubleshooting)

---

## 1. Introduction

VeritasESG helps consultancy firms run sustainability and governance reporting engagements for their clients from one place. Instead of juggling spreadsheets and email threads, your firm can keep a directory of client organisations, launch reporting projects from reusable templates, collect structured answers from the right people, track progress, and export finished reports.

**Who uses the platform.** There are two main groups:

- **Internal staff** at the consultancy firm — administrators, engagement managers, consultants, contributors, and auditors. They log in to the admin panel with an email and password (or a one-time code) and do the day-to-day work.
- **External contacts** at the client organisations — the people who actually answer the questionnaires. They usually do not need an account at all: they receive a secure **magic link** by email and respond directly in their browser. Some clients may instead be given a `customer` login so they can see their assigned projects.

**Key concepts you will meet throughout this guide:**

| Term | What it means |
| --- | --- |
| **Customer** | A client organisation your firm reports for. Holds branches, contacts, and an ESG profile. |
| **Contact** | A person at a customer organisation who can be assigned questions. |
| **Template** | A reusable questionnaire blueprint (pages and questions) used to start new projects. |
| **Sector** | A category that groups templates by industry or service line. |
| **Project** | A live reporting engagement created from a template for one customer. |
| **Question** | A single data point to collect, with bilingual text and a defined answer type. |
| **Assignment** | The link between a question (or set of questions) and the person responsible for answering. |
| **Task** | An assigned question as it appears to an internal user on the **Tasks** page. |
| **Evidence** | Supporting files (documents, images) attached to an answer. |

---

## 2. Getting Started

### First login

1. Open the VeritasESG web address provided by your firm. You will land on the **Login** page.
2. Enter your **Email** and **Password** and select **Sign In**.

If you do not have a password yet, use the one-time code (OTP) method instead.

### Logging in with a one-time code (OTP)

1. On the **Login** page, choose the option to receive a code by email and enter your **Email**.
2. Select the button to request a code. Check your inbox for a message containing a numeric **code**.
3. Enter the **code** on the login screen to sign in.

> Note: For security, the platform only confirms that a code was sent. If your email is not yet registered, no code is delivered. Ask an administrator to invite you first (see [Administration](#12-administration)).

### Switching language (English / Turkish)

VeritasESG supports **English (EN)** and **Turkish (TR)**. The login screen language can be set by your firm, and you can override it by adding `?lang=tr` (or `?lang=en`) to the login link, for example `…/#/login?lang=tr`. Question text and several other fields are stored in both languages so the interface can display whichever you prefer.

### Resetting your password

1. From the **Login** page, choose **Forgot password**.
2. Enter your **Email** and submit. If your account exists, you will receive a reset link by email.
3. Open the link, enter a new password, and confirm. You can now sign in with the new password.

> The reset link is tied to the site you requested it from. If your firm runs more than one address, always use the link exactly as received.

### Your profile

Select **Profile** in the sidebar to view and update your own details (such as your display name and avatar image). This is also where you can confirm which email and role your account uses.

---

## 3. Role Reference

Every internal user has one **platform role**. This controls which pages they see and what they may do across the whole platform.

| Platform role | Can do | Cannot do |
| --- | --- | --- |
| **platform_admin** | Everything: manage users, customers, templates, sectors, questions, all projects, knowledge bases, AI chat, audit log, and settings. | — |
| **consultant_manager** | Manage customers and contacts, see the customer directory, run all projects, assign work. | Manage platform users, knowledge bases, or platform settings. |
| **consultant** | Work on assigned projects, build templates/sectors/questions, view the directory, review answers. | Create or edit customers; access user management or settings. |
| **contributor** | Limited edit access on the projects they are added to (answer and update content). | Customer management, template building, administration. |
| **customer** | External client login: see the projects assigned to their organisation and respond. | Anything outside their own assigned projects. |
| **auditor** | Read-only review of project data. | Create, edit, delete, or submit anything. |

### Project-level roles

Separately from the platform role, each person added to a specific project gets a **project role** that scopes what they can do *inside that project*:

| Project role | Meaning |
| --- | --- |
| **admin** | Full control of the project: structure, assignments, status, and answers. |
| **editor** | Edit project content and answers, manage assignments. |
| **contributor** | Answer assigned questions and add comments/evidence. |
| **auditor** | View everything in the project but change nothing. |

### Auditor restrictions

Anyone in an **auditor** role (platform-wide or project-level) sees the same screens as other users but with all editing controls disabled. Save, assign, delete, and status buttons are hidden or greyed out. This lets auditors review work without risk of altering it.

---

## 4. Navigation

After signing in you land on the **Dashboard**. The dark sidebar on the left is your main menu. The items you see depend on your role.

| Sidebar item | Page | Visible to |
| --- | --- | --- |
| **Dashboard** | Overview and shortcuts | All roles |
| **Customers** | Manage client organisations | platform_admin, consultant_manager |
| **Directory** | Searchable customer/contact directory | platform_admin, consultant_manager, consultant |
| **Projects** | Reporting engagements | All roles |
| **Templates** | Questionnaire blueprints | platform_admin, consultant |
| **Sectors** | Industry/service categories | platform_admin, consultant |
| **Questions** | Question library | platform_admin, consultant |
| **Tasks** | Questions assigned to you | All roles |
| **Knowledge Bases** | Document libraries for AI | platform_admin |
| **AI Chat** | Assistant for consultants | platform_admin |
| **Users** | Manage platform users | platform_admin |
| **Profile** | Your own account | All roles |

At the bottom of the sidebar is **Sign Out**. The top bar shows your email address.

**On mobile or a narrow window**, the sidebar is hidden. Tap the menu button (☰) in the top-left to open it, and tap outside the menu to close it.

---

## 5. Customer Management

Customer management is available to **platform_admin** and **consultant_manager** users via the **Customers** page.

### Creating a customer

1. Go to **Customers** and select the option to add a new customer.
2. Enter the organisation's details (name and the fields shown on the form).
3. Save. The new customer now appears in the list and in the **Directory**.

### Editing a customer

Open any customer from the list to edit its details, manage its branches and contacts, and view its profile.

### Branches

A customer can have multiple **branches** (sites or business units). Branches matter for reporting because some questions can be automatically repeated per branch (see [soruCogaltma](#6-templates-and-sectors)). Add, rename, or remove branches from within the customer record.

### Contacts

**Contacts** are the people at the customer organisation. For each contact you typically record a name and email. Contacts are who you assign external questionnaires to and who receive magic-link invitation emails.

### Customer profile (ESG summary and materiality)

Each customer has a profile that holds its ESG context, including the **Double Materiality Assessment** data. This is where the firm records the sustainability topics that are material to the client — both how the client's business affects people and the environment, and how sustainability issues affect the client's business. Keep this profile current; it informs the reporting work done in projects.

### Customer directory

The **Directory** page gives consultants a searchable, read-oriented view of customers and their contacts. Consultants who cannot open the full **Customers** management page still use the directory to find people and organisations.

---

## 6. Templates and Sectors

Templates and sectors are managed by **platform_admin** and **consultant** users. They define the questionnaires you will reuse across projects.

### What a template is

A **template** is a reusable blueprint for a questionnaire. It is organised into **pages**, and each page contains **questions**. When you start a project, VeritasESG copies the template's pages and questions into the project so the original template stays clean for reuse.

### Sectors and service categories

A **sector** groups templates by industry or service line (for example, a manufacturing reporting standard versus a financial-services one). Set up your sectors first on the **Sectors** page, then attach templates to the relevant sector so consultants can find the right starting point quickly.

### Building template pages and questions

1. Go to **Templates** and open (or create) a template.
2. Add **pages** to organise the questionnaire into logical sections.
3. On each page, add **questions**, completing the fields below.
4. Save your changes. The template is ready to launch projects from.

### Bilingual question fields (EN / TR)

Questions store text in both English and Turkish so the questionnaire can be shown in either language:

| Field | What it holds |
| --- | --- |
| **baslik** | The question's short title/heading |
| **soru** | The full question text |
| **aciklama** | An explanation or guidance note |
| **ornekYanit** | A sample answer to guide the respondent |
| **ilgiliBirim** | The responsible unit/department |

### Question types

Each question has an answer type (**cevapTipi**) that controls how the respondent enters data:

| Type | Use it for |
| --- | --- |
| **textarea** | Free-form written answers |
| **integer** | Whole numbers (e.g. headcount) |
| **decimal** | Numbers with decimals (e.g. emissions figures) |

### Branch multiplier (soruCogaltma)

A question can be set to repeat per branch. When **soruCogaltma** is set to branch-based expansion (`sube_bazinda`), one template question becomes several project questions — one for each branch of the customer. Use this for data you need separately from each site, such as energy use per location.

### Template question table — Column management

When editing templates, the question table shows the core fields by default, but you can customize which columns you see and resize them to suit your workflow.

#### Changing which columns are visible

1. Open a template and go to the **VERİSETİ** (dataset) tab.
2. Click the **"3 visible"** button in the header (shows how many columns are currently visible).
3. A dropdown panel opens showing all available columns:
   - **Eye icon (👁️)** — Click to show or hide a column in the table.
   - **Drag handle (⋮⋮)** — Click and drag to reorder columns (for future use).
4. Click **Reset** to return to the default view (Başlık, Soru, Firma Yanıtı).

**Available columns:**
- **Başlık** (Title) — Short heading for the question
- **Soru** (Question) — Full question text  
- **Firma Yanıtı** (Company Answer) — Expected or reference answer
- **Bölüm** (Department/Section) — Organizational unit
- **Kod** (Code) — Question identifier or code
- **İlgili Birim** (Responsible Unit) — Responsible department
- **Veri Doğruluğu** (Data Accuracy) — Accuracy specification
- **Açıklama** (Explanation) — Guidance or notes
- **Örnek Yanıt** (Sample Answer) — Example for respondents
- **Dayanak** (Basis/Reference) — Regulatory or standard reference
- **Onay** (Approval) — Approval status or notes
- **Rapor Yeri** (Report Location) — Where data appears in report
- **Reporting ITR** — Advanced reporting field

Your column preferences are saved to your browser, so your choice will persist when you return to the template.

#### Resizing columns

You can adjust column width by dragging the boundary between column headers:

1. Position your mouse on the border between two column headers.
2. The cursor will change to a resize cursor (↔️).
3. Click and drag left or right to make the column narrower or wider.
4. The new width is applied immediately.

> **Tip:** The detail modal (accessed by clicking the **Detay** button on any row) always shows all fields, so if you hide columns from the table view, you can still access and edit them in the modal.

---

## 7. Projects

A **project** is a live reporting engagement for one customer, created from a template. All roles can see the **Projects** list, but what they see is scoped to the projects they are part of.

### Creating a project from a template

1. Go to **Projects** and start a new project.
2. Choose the **customer** the project is for.
3. Choose the **template** to base it on. Its pages and questions are copied into the project.
4. Save. The project opens, ready for you to assign questions and invite respondents.

### Project status lifecycle

A project moves through stages as work progresses — typically from a draft/setup stage, to active data collection, to review, and finally to a completed/closed state. Use the project's status control to keep everyone aligned on where the engagement stands. Auditors can see the status but not change it.

### Project pages and tabs

Inside a project you will find tabbed areas. Their names may vary by configuration, but they cover these functions:

| Area | Purpose |
| --- | --- |
| **Forms** | The questionnaire itself — view questions, see and edit answers. |
| **Audit** | Review submitted answers, including who answered and when. |
| **Plan** | Organise and schedule the work for the engagement. |
| **Users** | Add internal users to the project and set their project role (admin/editor/contributor/auditor). |
| **Activity** | A timeline of changes and submissions for the project. |

### Rebuilding from the template

If the source template changes after a project has started, you can **rebuild** the project to pull in the updates. Do this carefully: rebuilding re-syncs the project's questions with the template, and questions that no longer exist in the template may be removed. Check existing answers afterward. See [Troubleshooting](#13-tips-and-troubleshooting) for what to do if questions appear to go missing.

---

## 8. Assignments and Tasks

An **assignment** connects a question (or group of questions) to the person responsible for answering it. You can assign to **external contacts** or to **internal platform users**.

### Assigning questions

1. Open a project and go to the questionnaire (**Forms**).
2. Select the question(s) you want to assign.
3. Choose the **contact** or **platform user** to assign them to.
4. Confirm. The assignee is now responsible for those questions.

### Magic-link emails (for external contacts)

When you assign questions to an external **contact**, VeritasESG can email them a secure **magic link**. The contact opens the link and answers directly in their browser — no account or password needed. Links expire after a set period (7 days by default), after which a new link is required. See [External Contact Response](#9-external-contact-response).

### The Tasks page (for internal users)

Internal users answer their assigned questions on the **Tasks** page. It lists **questions assigned to you across projects**. You can:

- Filter by **All**, **Pending**, or **Completed**.
- See each task's **Project**, **Question**, who it was **Assigned by**, and any **Due** date.
- Open a task to type an answer.

### Responding to a task

1. Go to **Tasks** and open a pending item.
2. Enter your answer in the field provided.
3. Add a note under **Add a comment** if you need to explain anything.
4. Use **Upload Evidence** to attach supporting files.
5. Select **Save Answer**. The status shows **Saved**.

### Marking complete

- Use **Mark In Progress** while you are still working on a task.
- Use **Mark Complete** when the answer is final. Completed tasks move to the **Completed** filter.

### On-behalf responses

A consultant can enter an answer **on behalf of** a contact — for example, when the client provides figures over a call. The platform records who actually submitted the answer (the consultant) versus whose assignment it was (the contact), so the audit trail stays accurate.

---

## 9. External Contact Response

This is the experience for an external **contact** who receives a magic-link email and does not log in.

### What the contact sees

Opening the link shows a clean response page with no sidebar. At the top are the **project name**, the **customer (organisation) name**, and the **contact's name**, followed by the list of assigned questions.

### Answering questions

Each question shows its **title**, the **question text**, any **explanation**, and a **sample answer** ("e.g. …") where one was provided. The contact types their response in the box under each question.

1. Read each question and its guidance.
2. Type the answer in the box.
3. Repeat for every question on the page.

### Comments and evidence

Contacts can add comments to clarify their answers, and the page shows how many **Evidence** files are attached to each question. Supporting files can be uploaded to back up the data provided.

### Saving and completing

- Select **Save Answer** to save progress and return later using the same link.
- Select **Mark Complete** when all answers are final. Once completed, the form is locked and shows a confirmation that it has been submitted.

### If the link has expired

If the magic link is past its expiry date, the page shows an **expired** message and the answer fields are disabled. The contact should reply to the consultant who sent it and ask for a fresh link. The previously saved answers are not lost — a new link reopens the same questionnaire.

---

## 10. Reports and Exports

VeritasESG can package project data for sharing and offline review. Export options are available from within a project to users with edit-level access.

| Export | What you get |
| --- | --- |
| **XLSX (Excel)** | A spreadsheet of questions and answers for analysis or sharing. |
| **PDF / Markdown** | A formatted report document suitable for client delivery. |
| **Submissions ZIP** | A bundled archive of submitted responses, including attached evidence. |

To export, open the project, choose the export option for the format you need, and download the generated file. Excel exports can also be used to bring data in, supporting round-trip workflows.

---

## 11. Knowledge Base and AI Chat

These tools support consultants and are available to **platform_admin** users.

### Creating a knowledge base

1. Go to **Knowledge Bases** and create a new knowledge base.
2. Give it a clear name (for example, a reporting standard or a client topic area).

### Uploading documents

Open a knowledge base and upload reference **documents** (such as standards, guidance, or prior reports). These documents give the AI assistant relevant context to draw on.

### Using AI Chat

Select **AI Chat** to open the assistant. Ask questions in natural language to get help drafting content, summarising material, or finding guidance within your knowledge bases. The assistant is a support tool for consultants — always review its output before using it in client deliverables. The AI features are optional; if your firm has not enabled them, these menu items may not appear.

---

## 12. Administration

These functions are reserved for **platform_admin** users.

### User management

Open **Users** to manage internal accounts.

1. Select the option to invite a new user.
2. Enter their **email** and assign a **platform role** (see [Role Reference](#3-role-reference)).
3. Send the invitation. The user receives an email to set up access.
4. To change someone's role or details, open their record and edit it.
5. To remove access, delete or deactivate the user from the same screen.

> The very first user to request a code on an empty system is automatically created as a **platform_admin**. After that, all new users must be invited by an existing administrator.

### Audit log

VeritasESG keeps an **audit log** of important actions and answer submissions, including who submitted each answer and when. Administrators use this to review activity and confirm accountability, which is especially useful for on-behalf responses.

### Translations

Administrators can manage the **translations** that power the bilingual interface, keeping English and Turkish labels consistent and complete.

### App settings

App-wide **settings** (such as email configuration and platform defaults) are managed by administrators. Some display settings, like the login title and tagline, are set by your firm's deployment and require a rebuild to change.

### Platform API key

A **platform API key** can be configured for trusted integrations that talk to VeritasESG programmatically. Treat this key as a secret and share it only with systems that need it.

---

## 13. Tips and Troubleshooting

**A contact's magic link has expired.**
Ask the consultant who sent it to issue a new assignment email. The fresh link reopens the same questionnaire and any previously saved answers are preserved.

**Questions seem to have disappeared after rebuilding a project from its template.**
Rebuilding re-syncs the project with the current template. If a question was removed from the template, it may no longer appear in the project. Check the template first, restore the question there if it was removed by mistake, and rebuild again. Review existing answers after any rebuild.

**A one-time code (OTP) email never arrives.**
Confirm you entered the correct email and check spam/junk folders. Remember the platform does not send a code to an email that is not yet registered — ask an administrator to invite you. If email is misconfigured firm-wide, contact your administrator.

**Evidence upload fails or seems too large.**
Large files (roughly above a few hundred kilobytes) are routed to file storage; very large uploads may be rejected. Compress images or split large documents, and prefer common formats. If uploads consistently fail, your firm's storage may not be configured — raise it with an administrator.

**I cannot see a menu item another colleague has.**
Sidebar items depend on your **platform role**. For example, **Users**, **Knowledge Bases**, and **AI Chat** are admin-only, and **Customers** is limited to administrators and managers. Ask an administrator if you believe your role is incorrect.

**Editing controls are greyed out.**
You may be in an **auditor** role (platform-wide or on that specific project), which is read-only by design. Ask a project admin to change your project role if you need to make edits.

**The interface is in the wrong language.**
Add `?lang=en` or `?lang=tr` to the login link to switch, or ask your administrator about the default language for your deployment.
