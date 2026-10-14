# Shende Industries Enterprise Portal — Phased Implementation Plan

**Product:** Shende Industries Enterprise Portal  
**Target:** Production-Grade Corporate Website + ATS + Internal Operations Portal  

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       IMPLEMENTATION PHASES TIMELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Repository Audit & Technical Baseline (Completed)                  │
│ Phase 2: Consolidated Database Schema & Safe Migration Engine               │
│ Phase 3: Backend API Architecture, Security & RBAC Modernization            │
│ Phase 4: Public Corporate Website (Marketing, Divisions, Careers & Contact) │
│ Phase 5: Cloudstine Portal Design System & Unified Responsive Shell         │
│ Phase 6: Role-Specific Dashboards (Employee, Manager, HR, Super Admin)      │
│ Phase 7: Core Work Management (Projects, Tasks, Tickets, Timesheets)        │
│ Phase 8: Employee Self-Service (Leaves, Travel, Expenses Claims)            │
│ Phase 9: Recruitment ATS & Hire-to-Onboard Pipeline                         │
│ Phase 10: Reports, Notifications, Audit Logging & Company Settings          │
│ Phase 11: End-to-End Verification, Performance & Deployment Readiness       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phase Breakdown & Acceptance Criteria

### Phase 1: Repository Audit & Technical Baseline (Completed)
- **Deliverables**: Comprehensive audit in `docs/PROJECT_AUDIT.md`.
- **Criteria**: Complete catalog of existing code, dead code identified, dependencies verified.

---

### Phase 2: Consolidated Database Schema & Migration Engine
- **Deliverables**:
  - `database/01-shende-core-schema.sql`: Unified PostgreSQL schema replacing `schema.sql` and patches 1–6.
  - New schema tables:
    - Organization & Users: `organizations`, `employees` (with roles: `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`), `departments`, `designations`.
    - Work Management: `client_master`, `project_master`, `ticket_master`, `task_master`, `ticket_assignments`, `daily_timesheet_entries`.
    - Self-Service: `leave_types`, `leave_balances`, `leave_requests`, `travel_requests`, `expense_claims`.
    - Recruitment: `job_postings`, `job_applications`, `interview_stages`.
    - System & Audit: `audit_logs`, `company_settings`, `notifications`.
  - `database/02-seed-data.sql`: Seed data with valid bcrypt-hashed passwords for default accounts:
    - Admin: `admin@shendeindustries.com` / `Admin@Shende2026`
    - HR: `hr@shendeindustries.com` / `HR@Shende2026`
    - Manager: `manager@shendeindustries.com` / `Manager@Shende2026`
    - Employee: `employee@shendeindustries.com` / `Employee@Shende2026`
- **Acceptance Criteria**: Schema creates cleanly without missing relations or syntax errors. Seed accounts log in successfully without manual intervention.

---

### Phase 3: Backend API Architecture, Security & RBAC Modernization
- **Deliverables**:
  - Modernized `authMiddleware.js`: Proper `401 Unauthorized` on expired/invalid token; `403 Forbidden` on role/permission violation.
  - Safe token handling with configurable cookie/header support.
  - REST endpoints under `/api/v1/`:
    - `/auth`: Login, logout, current user `/me`, password change.
    - `/public`: Public jobs listing, job detail, public application submission with resume upload, public contact inquiries.
    - `/employees`: Employee directory, profile updates, department/designation management.
    - `/projects`: Project list, creation, status, manager assignments.
    - `/tickets` & `/tasks`: Tickets and tasks assignment and tracking.
    - `/timesheets`: Logging, weekly rollups, submission, approval, rejection with comments, locking.
    - `/leaves`: Leave balances, requests, manager/HR approvals.
    - `/travel`: Travel requests and approvals.
    - `/expenses`: Expense claim filing with receipt uploads and approvals.
    - `/recruitment`: ATS pipeline, applicant status transitions, candidate-to-employee onboarding.
    - `/reports`: Utilization, billable hours, project burn rates, export to Excel/CSV.
    - `/settings`: Company branding, contact information, working days, holiday calendar.
    - `/audit`: Security and workflow audit log queries.
  - File upload engine with MIME-type and size validation (resumes, expense receipts).
- **Acceptance Criteria**: All routes validate inputs, enforce permissions, and return standard JSON formats `{ success, data, message }` or `{ success: false, error }`.

---

### Phase 4: Public Corporate Website
- **Deliverables**:
  - `/` — Homepage: Hero with company headline and value proposition, business divisions (Industrial Automation, Precision Engineering, Energy Solutions), core strengths, statistics, call-to-actions.
  - `/about` — About Shende Industries: Vision, leadership overview, manufacturing capabilities, quality standards.
  - `/services` — Services & Solutions: Comprehensive view of engineering capabilities.
  - `/careers` — Public Careers Portal: Searchable job listings, department/location filters.
  - `/careers/:slug` — Job Details & Application Form: Responsive form with resume upload and consent check.
  - `/contact` — Contact & Inquiries Page: Office locations, business inquiry form.
  - `/privacy` & `/terms` — Legal compliance pages.
  - Corporate Header & Footer with navigation and "Employee Portal" entry button.
- **Acceptance Criteria**: Polished corporate marketing UI, responsive on mobile and desktop, working careers filter, successful application submission to database.

---

### Phase 5: Cloudstine Portal Design System & Unified Responsive Shell
- **Deliverables**:
  - Cloudstine visual token styling:
    - Base canvas: `#F7F9FC`
    - Card surfaces: `#FFFFFF` with subtle 1px border (`#E2E8F0`) and soft elevation
    - Navigation sidebar: Deep navy `#10172A` with active item indicators
    - Primary accent: Restrained indigo `#635BFF`
    - Professional typography: Inter / sans-serif with accessible contrast
  - Unified Application Shell:
    - Left Navigation Sidebar with role-filtered navigation items, badge indicators, and collapsible state.
    - Top Navigation Bar with global search, breadcrumbs, quick notifications dropdown, theme toggle, and user profile avatar.
    - Lenis Smooth Scroll properly configured with `lenis/dist/lenis.css` imported at root level and `data-lenis-prevent="true"` applied to all modals, dialogs, and overlays.
- **Acceptance Criteria**: Visual parity with Cloudstine reference, zero scroll hijacking on modals, smooth responsive transitions.

---

### Phase 6: Role-Specific Dashboards
- **Deliverables**:
  - **Employee Self-Service Dashboard**:
    - Hours logged today & this week vs. target (e.g. 40h).
    - Missing timesheet days alert.
    - Active assigned tickets & tasks.
    - Leave balance summary.
    - Weekly activity chart using Recharts.
    - Quick actions: "Log Time", "Apply for Leave", "Submit Expense".
  - **Manager Workspace Dashboard**:
    - Timesheets pending approval count.
    - Team workload and missing timesheet alerts.
    - Project progress and overdue tickets.
    - Leave requests awaiting review.
  - **HR Control Center Dashboard**:
    - Active headcount, new joiners this month, employees on leave today.
    - Open job postings and applicants by recruitment stage.
    - Pending employee requests.
  - **Super Admin Dashboard**:
    - System health, total users, organizational statistics, recent audit log events.
- **Acceptance Criteria**: All dashboard metrics calculate dynamically from real database records; no hardcoded fake statistics.

---

### Phase 7: Core Work Management (Projects, Tasks, Tickets, Timesheets)
- **Deliverables**:
  - Unified Projects view with client associations, budget hours, and status tracking.
  - Tickets and Tasks management with priority, assignees, and due dates.
  - Timesheet Entry: Weekly calendar/grid view, `HH:MM` time tracking, billable vs. non-billable categorization, draft saving, weekly submission.
  - Approval Queue: Manager/Admin view to approve or reject with comments, and automatic timesheet locking.
- **Acceptance Criteria**: 3TOne timesheet calculations preserved and stabilized; strict locking enforced on approved entries.

---

### Phase 8: Employee Self-Service (Leaves, Travel, Expenses)
- **Deliverables**:
  - Leave Management: Leave policy types (Annual, Sick, Casual), balance cards, application modal with date calculations, manager approval workflow.
  - Travel Requests: Destination, travel dates, budget estimate, business justification, status workflow.
  - Expense Claims: Category, amount, currency, receipt file attachment, reimbursement status tracking.
- **Acceptance Criteria**: Balances validated server-side; managers and HR can review, approve, or reject requests with audit logging.

---

### Phase 9: Recruitment ATS & Hire-to-Onboard Pipeline
- **Deliverables**:
  - HR Job Postings Management: Create, edit, publish, close jobs.
  - Candidate Pipeline (Kanban / Table view): Stages: `Applied` $\rightarrow$ `Screening` $\rightarrow$ `Interview` $\rightarrow$ `Assessment` $\rightarrow$ `Offer` $\rightarrow$ `Hired` (or `Rejected`).
  - Resume viewer & interview notes.
  - **1-Click Onboard**: When a candidate reaches `Hired`, an "Onboard Employee" action auto-populates the employee creation form, creates user credentials, and adds them to the directory.
- **Acceptance Criteria**: Full lifecycle from public career application to hired employee account creation.

---

### Phase 10: Reports, Notifications, Audit Logging & Company Settings
- **Deliverables**:
  - Reports module: Employee utilization, billable ratios, project hours summary, missing timesheets, export to XLSX / CSV.
  - In-App Notifications: Notification bell with unread count, mark-as-read, link to relevant action items.
  - Audit Logs: Immutable log viewer capturing actor, action, target entity, timestamp, and details.
  - Company Settings: Configurable company profile, logo, timezone, working hours, public website content.
- **Acceptance Criteria**: Export files generate valid Excel workbooks; audit records are written on all critical actions.

---

### Phase 11: End-to-End Verification, Performance & Documentation
- **Deliverables**:
  - Verify complete navigation, public site, and authenticated portal.
  - Verify security permissions across roles.
  - Verify responsive mobile layout.
  - Update README and provide startup instructions and deployment guide.
- **Acceptance Criteria**: Zero broken links, passes lint and production build, clear step-by-step developer instructions.
