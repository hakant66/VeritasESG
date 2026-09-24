# GovernanceIQ — Changes in Last 5 Days (2026-06-17 to 2026-06-22)

## Summary
Over the last 5 days, the platform has been enhanced with a comprehensive materiality assessment framework, scheduled backup capabilities, improved authentication, and Turkish language documentation.

**Commits:** 10  
**Period:** June 17–22, 2026

---

## 1. Materiality Framework Enhancement (June 22, 2026)

### ✅ Fix Materiality Framework Column Headers
**Commit:** `c0346d7`

**What Changed:**
- Parametrized `GRIMaterialityTab` component to accept framework-specific labels
- Added `framework` prop (`'gri' | 'esrs' | 'issb'`) to control column header text
- Column headers now display:
  - GRI: "GRI Eşlemesi"
  - ESRS: "ESRS Standartı"
  - ISSB: "IFRS Standartı"

**Files Modified:**
- `src/components/customer/GRIMaterialityTab.tsx` — Added framework prop, dynamic label logic
- `src/pages/admin/MaterialityDesignPage.tsx` — Pass framework prop to all three tabs

**Impact:** Admin materiality matrix management now displays framework-specific labels, improving clarity in the MaterialityDesignPage.

---

### ✅ Seed ISSB Materiality Matrix from Excel
**Commit:** `52df5ad`

**What Changed:**
- Updated `scripts/seed-issb-materiality.ts` to correctly parse ISSB Excel file
- Successfully loaded **26 ISSB materiality topics** from `ISSB_IFRS_S1_S2_Materiality_Matrix.xlsx`
- Topics include: GHG Emissions, Air Quality, Energy Management, etc.
- Each topic includes:
  - Subject (e.g., "GHG Emisyonları")
  - Scope definition
  - Applicable IFRS standard (IFRS S2, industry guides)
  - Financial materiality rationale

**Database Updates:**
- 26 rows inserted into `GRIMaterialityMatrixRowModel` with `customerId='_materiality_design_issb'`

**User-Facing Impact:**
- MaterialityDesignPage ISSB card displays 26 topics in editable table format
- DMAPage ISSB (IFRS S1/S2) tab shows topics with 1-5 scoring interface
- Customers can now assess ISSB materiality with framework-specific criteria

---

## 2. Scheduled MongoDB Backup System (June 17, 2026)

### ✅ Implement Scheduled MongoDB Backup Job with UI
**Commit:** `935596c`

**What Changed:**
- Built complete backup scheduling infrastructure:
  - **Backend:** `schedulerService.ts` — node-cron integration, Docker command execution
  - **Database:** `ScheduledJob` Mongoose schema — cron expression, status, log tracking
  - **API:** New endpoints for backup job CRUD, toggle enable/disable, manual run, and polling
  - **Frontend:** Backup settings tab in admin SettingsPage with visual UI

**Features:**
- Three scheduling modes: Hourly (1/2/4/6/8/12/24 hour intervals), Daily, Weekly
- Auto-generated cron expressions
- Next run time calculation and display
- Job status badges with last run details
- Scrollable log output viewer
- Manual run trigger

**Configuration:**
- Installed `node-cron@3.0.0` + `@types/node-cron`
- Docker socket mounted in `docker-compose.yml` for command execution
- Added `BACKUP_HOST_PWD` env var support
- Docker CLI installed in Dockerfile runner stage

**Files Added/Modified:**
- `server/lib/schedulerService.ts` — New backup scheduler service
- `server/routes/schedulerRoute.ts` — New API endpoints
- `src/components/admin/BackupSettingsTab.tsx` — New UI component
- `server/models/index.ts` — Added ScheduledJob schema
- `docker-compose.yml` — Docker socket mount configuration
- `Dockerfile` — docker.io installation
- Localization strings (Turkish + English)

**Impact:** Platform admins can now schedule automated MongoDB backups with visual control panel.

---

### ✅ Improve Backup Settings Tab Error Handling
**Commit:** `bff235b`

**What Changed:**
- Added `loadError` state to capture and display API errors with details
- Added loading spinner during job fetch
- Distinct visual states: loading, error, null job, active job
- Error card with retry button for connectivity/permission issues

**Files Modified:**
- `src/components/admin/BackupSettingsTab.tsx` — Enhanced error handling UX

**Impact:** Better debugging experience when backup scheduler API fails.

---

### ✅ Remove Auto-Create Default Backup Job
**Commit:** `45ada90`

**What Changed:**
- Removed automatic backup job creation on first load
- Users must now explicitly click "Create Default Job" button
- Added setup card explaining what will be created before confirmation
- Shows job details preview (command, path, initial state)

**Files Modified:**
- `src/components/admin/BackupSettingsTab.tsx` — Setup wizard-style flow

**Impact:** Ensures users have full control and awareness before automated infrastructure is created.

---

## 3. Authentication & Security (June 17–18, 2026)

### ✅ Add Authentication Check to Settings Page
**Commit:** `de9c16f`

**What Changed:**
- Settings page now requires `platform_admin` role
- Non-admin users see "Erişim Reddedildi" (Access Denied) message
- Prevents unauthenticated API calls to sensitive endpoints

**Files Modified:**
- `src/pages/admin/SettingsPage.tsx` — Added role check guard

**Impact:** Protects admin-only settings from unauthorized access.

---

### ✅ Fix Scheduled Jobs API Authentication
**Commit:** `4fdc7b9`

**What Changed:**
- Fixed `auth.reason` check in `schedulerRoute.ts` — now checks `auth?.user` instead of non-existent reason field
- Fixed SettingsPage authentication — checks `profile.role` instead of non-existent `user.role`
- Removed test mode UI from ProfilePage (disabled permanently)
- Added `clearTestRoleOverride()` on SettingsPage mount for clean state

**Files Modified:**
- `server/routes/schedulerRoute.ts` — Fixed auth validation
- `src/pages/admin/SettingsPage.tsx` — Fixed role check, cleared test overrides
- `src/pages/admin/ProfilePage.tsx` — Removed test mode simulator

**Impact:** Fixes 401 Unauthorized error on GET `/api/admin/scheduled-jobs` and ensures clean authentication state.

---

## 4. Documentation & Data (June 17, 2026)

### ✅ Add Turkish User Guide Documentation
**Commit:** `217df5d`

**What Changed:**
- Created comprehensive Turkish user guide for GovernanceIQ platform
- Documented all six user roles with workflows and responsibilities
- Step-by-step feature guides and troubleshooting
- Exported to Word (.docx) format for easy distribution
- Added `docx` npm package for markdown-to-word conversion

**Files Added:**
- `docs/Governanceiq-user-guide-tr.md` — Markdown guide
- `docs/Governanceiq-user-guide-tr.docx` — Word format guide

**Impact:** Turkish-speaking users now have official platform documentation.

---

### ✅ Update Local Seed Snapshot and Template Files
**Commit:** `8a3447c`

**What Changed:**
- Refreshed MongoDB dump artifacts in `seed/mongo-dump/`
- Updated Kimya template spreadsheet files to match current governance dataset

**Files Modified:**
- `seed/mongo-dump/governance/*` — Updated BSON artifacts
- `docs/templates/` — Updated template files

**Impact:** Local development environment now reflects current production data.

---

### ✅ Improve Profile Image Upload Resilience
**Commit:** `4344216`

**What Changed:**
- Fall back to inline avatars when S3 is unreachable
- Fixed edit-modal role state synchronization
- Improved error messages in Users page save flow

**Files Modified:**
- Profile image upload handling (S3 fallback)
- Users page UI (error message clarity)

**Impact:** Better resilience when S3 storage is unavailable; clearer error feedback to admins.

---

## Architecture Overview

### New Components
- **BackupSettingsTab.tsx** — Visual backup scheduler UI with cron editor
- **schedulerService.ts** — Backend scheduler using node-cron + Docker

### New Database Schema
- **ScheduledJob** — Stores backup job config, status, cron expression, last run info

### New API Endpoints
- `GET /api/admin/scheduled-jobs` — Fetch all scheduled jobs
- `POST /api/admin/scheduled-jobs` — Create new job
- `PUT /api/admin/scheduled-jobs/:id` — Update job
- `DELETE /api/admin/scheduled-jobs/:id` — Delete job
- `POST /api/admin/scheduled-jobs/:id/run` — Manually trigger job
- `POST /api/admin/scheduled-jobs/:id/toggle` — Enable/disable job
- `GET /api/admin/scheduled-jobs/:id/logs` — Fetch job logs

### Materiality Framework (Full Stack)
- **Frontend:** GRIMaterialityTab, GRIScoringTab, ESRSScoringTab, ISSBScoringTab, MaterialityDesignPage, DMAPage
- **Backend:** griMaterialityRoute.ts, griAssessmentRoute.ts, esrsAssessmentRoute.ts, issbAssessmentRoute.ts
- **Database:** GRIMaterialityMatrixRowModel, GRIAssessmentScoreModel, ESRSAssessmentScoreModel, ISSBAssessmentScoreModel
- **Seed Data:** 24 GRI topics, 57 ESRS topics, 26 ISSB topics

---

## Testing Checklist

- [ ] Backup settings tab loads without errors
- [ ] Create, edit, delete, and run scheduled jobs
- [ ] Cron expression generates correctly for hourly/daily/weekly modes
- [ ] Manual job run displays updated logs
- [ ] Non-admin users cannot access Settings page
- [ ] ISSB materiality topics display in MaterialityDesignPage
- [ ] ISSB scoring works in DMAPage
- [ ] Framework column headers display correctly (GRI/ESRS/ISSB)
- [ ] Profile image upload falls back gracefully when S3 unavailable

---

## Deployment Notes

1. **Environment Variables Required:**
   - `BACKUP_HOST_PWD` — Docker host PWD context (set to `/` in most deployments)
   - Existing: `MONGODB_URI`, `JWT_SECRET`, `BREVO_API_KEY`, etc.

2. **Dependencies Added:**
   - `node-cron@3.0.0` — Job scheduling
   - `@types/node-cron` — TypeScript definitions
   - `docx` — Markdown to Word conversion

3. **Docker Changes:**
   - Socket mount: `/var/run/docker.sock:/var/run/docker.sock`
   - Installed: `docker.io` in runner stage

4. **Database Migrations:**
   - Run seed scripts if materialité data not present:
     - `npm run seed:gri-materiality` (or manual `npx tsx scripts/seed-gri-materiality.ts`)
     - `npm run seed:esrs-materiality`
     - `npm run seed:issb-materiality`

---

**End of Changelog**  
*Document generated on 2026-06-22*
