# Shende Industries Enterprise Portal — Technical Audit & Baseline Assessment

**Date:** October 2026  
**Auditor:** Principal Enterprise Software Architect & Security Lead  
**Scope:** Transformation of legacy 3TOne (TimeTrak Pro) baseline into Shende Industries Enterprise Portal (Root Workspace Structure)  

---

## 1. Executive Summary

The existing repository hosts **3TOne** (internally referenced as *TimeTrak* / *TimeTrak Pro*), a role-based timesheet and ticket tracking tool designed for professional services and IT consulting. 

The client requires transforming this base into the **Shende Industries Enterprise Portal**, comprising:
1. **A Public-Facing Corporate Website & Recruitment Portal**: Company landing page, business divisions/manufacturing capabilities, services, career job board, online application submission, and contact forms.
2. **An Authenticated Enterprise Management Portal** (Cloudstine Portal visual design reference): Role-based dashboards and operational workflows for **Super Admin**, **HR Administrator**, **Project/Team Manager**, and **Employee Self-Service**, covering:
   - Employee & Organizational Directory (Departments, Designations, Reporting hierarchies)
   - Project, Task, and Ticket Management
   - Timesheet Logging, Weekly Calculation, Submission & Multi-Tier Approval Workflows
   - Leave Management (Leave Types, Balances, Applications, Approval Queue)
   - Travel Requests & Expense Claims (with category, receipts, reimbursement tracking)
   - Applicant Tracking System (ATS) connecting job postings to candidate applications and 1-click hire-to-employee onboarding
   - Decision-Oriented Reports & Analytics, System Settings, In-App Notifications, and Tamper-Proof Audit Logging

---

## 2. Existing Codebase Inventory

| Layer | Technologies Found | File Count / Size | Status |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, Vite 7, React Router v7, Radix UI Primitives, Tailwind CSS v3.4, Lucide React, Framer Motion, Lenis v1.3, Recharts, Sonner, Axios, date-fns | ~80 files / ~1 MB JS | Working baseline; needs architectural refactoring, dead code excision, design system alignment, and public site addition |
| **Backend** | Node.js (ES Modules), Express v4.18, `pg` (node-postgres), JWT, bcryptjs, exceljs, node-cron, nodemailer, morgan, helmet, compression | ~45 files / ~700 KB JS | Functional business logic for timesheets and tickets; severely bloated controllers, hardcoded CORS, security anti-patterns |
| **Database** | PostgreSQL 16 (Alpine in Docker) | `schema.sql` + 6 patches (`patch.sql` to `patch6.sql`) | Severe schema drift, duplicated patches, missing unified migrations, plaintext seed passwords |

---

## 3. Critical Defects, Architectural Debt & Vulnerabilities

### A. Database & Schema Degradation
1. **Schema Drift via Incremental Patches**:
   - The initial `schema.sql` defined tables (`timesheet_entry`, `activity_master`, `activity_assignments`).
   - Patch scripts (`patch.sql` through `patch6.sql`) altered primary key naming (`id` $\rightarrow$ `employee_id`, `project_id`, `client_id`), renamed columns (`employee_id` $\rightarrow$ `employee_code`, `reporting_manager_id` $\rightarrow$ `module_manager_id`), added `daily_timesheet_entries`, `ticket_master`, `task_master`, and dropped enums in favor of lookup tables.
   - `patch2.sql` and `patch3.sql` are **identical duplicates** mounted sequentially in `docker-compose.yml`.
   - `patch6.sql` uses fragile PostgreSQL database rules (`ON INSERT DO INSTEAD`) over a view `ticket_manager_scope`.
2. **Insecure Password Seeding**:
   - `schema.sql` inserts plaintext passwords (`System@123`, `John@123`) for default employees, while `authController.js` expects bcrypt hashes. Out of the box, logins fail unless a manual script (`hash_passwords.js`) is run manually.

### B. Severe Code Bloat & Dead Code
1. **Thousands of Commented-Out Lines**:
   - `Frontend/.../EmployeeTimesheetEntry.jsx`: **1,328 lines of commented-out code** (over 50% of the file).
   - `Backend/.../timesheetReportController.js`: **3,236 lines of commented-out code** (File size: 247 KB, 6,114 total lines).
   - `Backend/src/server.js`: Contains three different copy-pasted implementations of the Express configuration.
2. **Empty Placeholder Files (0 Bytes)**:
   - `Backend/src/controllers/ticketUpdateHistoryController.js` (0 B)
   - `Backend/src/routes/ticketUpdateHistoryRoutes.js` (0 B)
   - `Frontend/src/services/ticketUpdateHistoryService.js` (0 B)
   - `Frontend/src/components/ui/TicketUpdatesDialog.jsx` (0 B)

### C. Security & Authentication Anti-Patterns
1. **Token Insecurity**: Both `accessToken` and `refreshToken` are stored in browser `localStorage`, creating XSS vulnerability.
2. **403 vs 401 Conflation**:
   - `authMiddleware.js` returns `403 Forbidden` for expired tokens instead of `401 Unauthorized`.
   - `api.js` Axios response interceptor treats all 403 responses as token expiration and attempts a refresh. As a consequence, whenever a user hits a legitimate forbidden resource, the client gets stuck in a refresh loop and boots the user to the login screen.
3. **Hardcoded Secrets & CORS**:
   - `docker-compose.yml` has hardcoded production secrets (`JWT_SECRET`).
   - `server.js` hardcodes CORS origin to `http://timetrack.abhiyantatech.com`.

### D. Frontend Anti-Patterns & Lenis Smooth Scroll Violations
1. **Axios Promise-Rejection Caching Hack**:
   - `api.js` implements GET request caching by rejecting the promise (`Promise.reject({ isCache: true })`) in the request interceptor and catching it in the error response interceptor. This can mask errors and cause race conditions.
2. **CSS Specificity Wars**:
   - `index.css` overrides Tailwind with wildcard selectors (`[class*="CardTitle"]`, `[class*="TabsTrigger"]`, `button[class*="bg-primary"]`).
3. **Smooth Scroll Violations**:
   - `lenis/dist/lenis.css` is never imported at the root level.
   - None of the dialogs or dropdowns have `data-lenis-prevent="true"`, causing outer scroll hijacking over modals.

---

## 4. Preserved Valuable Business Functionality

The following existing capabilities are sound in domain logic and will be refactored, stabilized, and preserved:
1. **Timesheet Calculation Core**: Conversion of time strings (`HH:MM`) to minutes, daily rollups, weekly date calculations (Sunday through Saturday), and billable vs. non-billable categorization.
2. **Ticket & Project Assignment Model**: Hierarchical scoping (Admin assigns to Managers; Managers assign to Employees and self).
3. **Approval State Engine**: State machine (`Draft`/`Saved` $\rightarrow$ `Submitted` $\rightarrow$ `Approved` / `Rejected` with comments $\rightarrow$ `Locked`).
4. **Excel Report Generators**: Formatted workbook generation using `exceljs` and `xlsx`.
5. **Email Notification Templates**: Pre-configured HTML email templates for submission alerts and approval reminders.

---

## 5. Target Architecture: Shende Industries Enterprise Portal

```
                               ┌──────────────────────────────────────────────────────────┐
                               │             SHENDE INDUSTRIES ENTERPRISE PORTAL          │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                     ┌──────────────────────────────────────┴──────────────────────────────────────┐
                     ▼                                                                             ▼
┌──────────────────────────────────────────────┐                             ┌──────────────────────────────────────────────┐
│            PUBLIC CORPORATE WEBSITE          │                             │         AUTHENTICATED WORKSPACE PORTAL       │
│  • Homepage (Hero, Divisions, Capabilities)  │                             │  • Cloudstine Design (#F7F9FC, Navy, Indigo) │
│  • About Shende Industries                   │                             │  • Strict RBAC (Admin, HR, Manager, Employee)│
│  • Engineering & Manufacturing Services      │                             │  • Unified Navigation Shell + Top Bar + Search│
│  • Public Careers Job Board                  │                             │  • Role-Specific Dashboards                  │
│  • Online Job Application & Resume Upload    │                             │  • Employee Self-Service (Timesheets, Leaves)│
│  • Contact Page with Inquiries Form          │                             │  • Manager Queue (Approvals, Team Workload)  │
│  • Privacy Policy & Terms of Service         │                             │  • HR Hub (Directory, Leave Balances, ATS)   │
│  • Employee Sign-In Entry Point              │                             │  • Super Admin Center (Settings, Audit Logs) │
└──────────────────────┬───────────────────────┘                             └──────────────────────┬───────────────────────┘
                       │                                                                            │
                       └────────────────────────────────────┬───────────────────────────────────────┘
                                                            │
                                            ┌───────────────▼──────────────┐
                                            │     REST API (/api/v1)       │
                                            │  Express.js Service Layer    │
                                            └───────────────┬──────────────┘
                                                            │
                                            ┌───────────────▼──────────────┐
                                            │      POSTGRESQL DATABASE     │
                                            │   Consolidated V1 Migration  │
                                            │   (Shende Industries Schema) │
                                            └──────────────────────────────┘
```

---

## 6. Migration & Stabilization Strategy

1. **Consolidated Database Migration**:
   - Merge `schema.sql` and all valid patches into a single, clean, repeatable migration (`01-shende-core-schema.sql`).
   - Add new enterprise tables: `leave_types`, `leave_balances`, `leave_requests`, `travel_requests`, `expense_claims`, `job_postings`, `job_applications`, `company_settings`, and `audit_logs`.
   - Seed default enterprise data with properly bcrypt-hashed passwords.
2. **Backend Service Modularization**:
   - Clean up dead code from `timesheetReportController.js`, `server.js`, and `entryController.js`.
   - Fix `authMiddleware.js` (401 for expired/invalid tokens; 403 for insufficient roles).
   - Introduce clean routes under `/api/v1` with permission-based authorization.
   - Implement storage handling for resume and expense receipt uploads.
3. **Frontend Overhaul & Cloudstine Experience**:
   - Implement public marketing website routes (`/`, `/about`, `/services`, `/careers`, `/careers/:slug`, `/contact`, `/privacy`, `/terms`).
   - Re-skin the authenticated internal portal with the Cloudstine visual reference (`#F7F9FC` background, deep navy `#10172A` active sidebar, `#635BFF` indigo accent, rounded cards, Inter typography).
   - Implement role-specific dashboards with calculated metrics for Employee, Manager, HR, and Admin.
   - Clean up monolithic component code and properly configure Lenis smooth scrolling with `lenis.css` and `data-lenis-prevent`.
