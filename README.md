# Shende Industries — Enterprise Portal (PatilOne / TimeTrakPro v3.0)

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E%20Verified-green?logo=playwright&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-121%2F121%20Passed-success)
![Status](https://img.shields.io/badge/Production-Grade%20v3.0-blue)

**Unified Enterprise Operations, Workforce Management & Statutory Payroll Platform**  
*Industrial Automation • Multi-Axis CNC Machining • Power & Motion Controls • Aerospace & Defense Engineering*

</div>

---

## 1. Executive Summary

**Shende Industries Enterprise Portal** is a production-grade, commercially deployable enterprise management platform engineered for precision manufacturing, technical consulting, and industrial engineering enterprises. 

The platform merges a public corporate website and recruitment Applicant Tracking System (ATS) with an authenticated, role-governed enterprise workspace supporting four primary operational personas:
1. **Super Admin**: Enterprise system governance, employee access control, client accounts, project masters, ticket assignments, maker-checker payroll finalization, and tamper-evident audit logging.
2. **HR Administrator**: Workforce directory, recruitment ATS pipeline, **1-Click Candidate-to-Employee Payroll Onboarding**, dynamic multi-branch location policies studio, corporate holiday calendar, leave balances, and expense reimbursement reviews.
3. **Engineering Manager**: Team workload balancing, project deliverable scoping, ticket-to-engineer assignments, weekly timesheet verification queues, and team leave approvals.
4. **Employee Self-Service**: Weekly timesheet logging (0.25h increments, billable tracking), active tickets, annual leave applications, business travel expense claims, and downloadable statutory salary slips.

---

## 2. High-Level Architectural Topology

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │          SHENDE INDUSTRIES ENTERPRISE PLATFORM         │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                              ┌───────────────────────────────┴───────────────────────────────┐
                              ▼                                                               ▼
  ┌────────────────────────────────────────────────────────┐      ┌────────────────────────────────────────────────────────┐
  │                 PUBLIC CORPORATE PORTAL                │      │             AUTHENTICATED ENTERPRISE WORKSPACE         │
  │ • Corporate Homepage & Industrial Divisions            │      │ • Role Dashboards: Admin, HR, Manager, Employee        │
  │ • Precision Engineering Capabilities & Certifications   │      │ • Workforce Directory & RBAC Access Matrix             │
  │ • Public Careers Board & Real-Time Job Listings        │      │ • Recruitment ATS & 1-Click Candidate Onboarding       │
  │ • Online Job Application Engine & Resume Uploads       │      │ • Dynamic Multi-Branch Location Policies & PT Slabs    │
  │ • Real-Time Application Tracking with APP-YYYY-NNNN    │      │ • Timesheet Entry Grid (0.25h billable increments)     │
  │ • Corporate Contact & Technical Review Inquiries       │      │ • Multi-Tier Timesheet, Leave & Travel Approvals       │
  │ • Privacy, Legal, ITAR & IP Protection Policies       │      │ • Monthly Payroll Wizard (Draft -> Review -> Finalize) │
  └───────────────────────────┬────────────────────────────┘      │ • Kredily Shadow Run Pilot Comparator & Diagnostics    │
                              │                                   │ • Immutable Point-in-Time Policy Snapshots & Audit     │
                              │                                   └───────────────────────────┬────────────────────────────┘
                              │                                                               │
                              └───────────────────────────────┬───────────────────────────────┘
                                                              │ REST API (/api/v1)
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │      REACT 19 SPA CLIENT      │
                                              │    Vite 7 • Tailwind • Lenis  │
                                              │     Port: http://localhost:3000│
                                              └───────────────┬───────────────┘
                                                              │ REST API (/api/v1)
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │    EXPRESS REST API SERVER    │
                                              │   Node.js • JWT • RBAC Guard  │
                                              │     Port: http://localhost:5000│
                                              └───────────────┬───────────────┘
                                                              │ pg Connection Pool
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │     POSTGRESQL 16 DATABASE    │
                                              │  Sequential Migrations 01-09  │
                                              │     Port: localhost:5435      │
                                              └───────────────────────────────┘
```

---

## 3. Monorepo Directory Architecture

```
Tracker/
├── Backend/                            # Express.js REST API Server
│   ├── src/
│   │   ├── config/                     # Database pool and connection configuration
│   │   ├── controllers/                # Thin HTTP request handlers
│   │   │   └── timesheet/              # Modular timesheet logic (entry, approval, lookup)
│   │   ├── middleware/                 # JWT validation, strict RBAC guard, Multer uploads
│   │   ├── models/                     # Client master Data Access Object (DAO)
│   │   ├── routes/                     # Centralized API routes mounted under /api
│   │   ├── services/
│   │   │   ├── emailService.js         # Nodemailer notification transport
│   │   │   ├── geofenceService.js      # Attendance radius calculation
│   │   │   ├── notificationService.js  # In-app alert dispatch
│   │   │   └── payroll/                # PatilOne Core Statutory Payroll Engine
│   │   │       ├── bankPaymentExportService.js # NEFT/RTGS CSV generator with CSV injection guards
│   │   │       ├── bulkImportService.js        # Bulk 300+ employee batch parser & stress tester
│   │   │       ├── ctcReconciliationEngine.js   # Zero-Rupee Reconciliation invariant & Mode A engine
│   │   │       ├── locationPolicyService.js     # Multi-branch policy snapshots & custom PT evaluator
│   │   │       ├── payrollCalculationEngine.js # Gross-to-net waterfall & proration engine
│   │   │       ├── payrollInputCollector.js     # Timesheets, biometric attendance, and leave proration
│   │   │       ├── payrollPilotService.js       # Side-by-side Kredily shadow run delta analyzer
│   │   │       ├── payrollValidationService.js  # Pre-flight payroll calculation readiness guards
│   │   │       └── statutoryRulesService.js     # FY 2026-27 Sec 87A rebate, EPF, ESIC, Multi-State PT
│   │   ├── utils/                      # Password hashing and time math utilities
│   │   └── server.js                   # Application bootstrap with Helmet, CORS, and routing
│   ├── tests/
│   │   ├── coreModulesApi.test.js      # Core API regression suite
│   │   ├── payrollApiIntegration.test.js# Layer 2 API, RBAC & Maker-Checker integration tests
│   │   └── payrollEngine.test.js       # 102 statutory rule and payroll engine unit tests
│   ├── uploads/                        # Persistent storage for user resumes and receipts
│   ├── Dockerfile                      # Production container build
│   └── package.json                    # Backend dependencies & npm scripts
│
├── Frontend/                           # React 19 Single Page Application
│   ├── public/                         # Public static files and browser favicon
│   ├── src/
│   │   ├── assets/                     # Brand vector graphics and diagrams
│   │   ├── components/
│   │   │   ├── admin/                  # Super Admin panels (Users, Clients, Projects, Logs)
│   │   │   ├── attendance/             # Enterprise attendance master and shift management
│   │   │   ├── common/                 # Layout shell (Sidebar, TopNav, Notifications)
│   │   │   ├── dashboards/             # Dedicated role KPI dashboards (Admin, HR, Manager, Employee)
│   │   │   ├── employee/               # Self-service tools (Weekly timesheets, Leaves, Travel)
│   │   │   ├── enterprise/             # Enterprise suite (CompanyHolidays, NoticeBoard, PolicyDocs)
│   │   │   ├── hr/                     # Recruitment ATS pipeline and 1-click candidate onboarding
│   │   │   ├── manager/                # Manager queues (Approvals, Team assignments)
│   │   │   ├── payroll/                # PatilOne v3.0 Enterprise Payroll Suite
│   │   │   │   ├── BulkImportPage.jsx            # Bulk 300+ employee batch generator
│   │   │   │   ├── CtcMatchingSimulatorPage.jsx  # CTC matching engine & waterfall simulator
│   │   │   │   ├── EmployeePayslipsPage.jsx      # Employee payslip history & downloadable slips
│   │   │   │   ├── EmployeeSalariesPage.jsx      # Employee active salary assignments
│   │   │   │   ├── KredilyPilotPage.jsx          # Kredily shadow run comparison & delta diagnostics
│   │   │   │   ├── LocationPoliciesPage.jsx      # Dynamic multi-branch policy studio & version history
│   │   │   │   ├── MonthlyPayrollPage.jsx        # Monthly payroll processing & Maker-Checker review
│   │   │   │   ├── PayrollDashboard.jsx          # Payroll operational overview & readiness telemetry
│   │   │   │   ├── PayslipModal.jsx              # High-fidelity printable payslip modal
│   │   │   │   ├── SalaryStructuresPage.jsx      # Base salary component configuration
│   │   │   │   └── StatutoryReportsPage.jsx      # EPF ECR, ESIC, and PT statutory challans
│   │   │   ├── public/                 # Corporate website (Home, Careers, Apply, Contact)
│   │   │   ├── ui/                     # Design tokens (Radix UI modals, buttons, badges, tables)
│   │   │   ├── Layout.jsx              # App shell with responsive sidebar navigation
│   │   │   └── Login.jsx               # Side-by-side enterprise login with live telemetry & persona switchers
│   │   ├── context/                    # AuthContext & ThemeContext
│   │   ├── hooks/                      # Custom React hooks (useAuth)
│   │   ├── lib/                        # CSS and class merge utilities (cn)
│   │   ├── services/                   # Axios HTTP client with auto-refresh interceptors
│   │   ├── styles/                     # Tailwind CSS and global styling tokens
│   │   ├── types/                      # Domain constants (UserRoles, TimesheetStatuses, PayrollStatuses)
│   │   ├── utils/                      # Formatting, currency, and date utilities
│   │   ├── App.jsx                     # Top-level application shell
│   │   ├── routes.jsx                  # Centralized React Router v7 route definitions with RBAC guards
│   │   └── main.jsx                    # React entrypoint with Lenis smooth scroll
│   ├── Dockerfile                      # Multi-stage production Nginx container
│   ├── nginx.conf                      # Production Nginx reverse proxy configuration
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── tailwind.config.js              # Enterprise design token theme configuration
│   └── vite.config.js                  # Vite configuration with /api development proxy
│
├── database/                           # PostgreSQL 16 Sequential Migrations
│   ├── 01-shende-core-schema.sql       # Unified core relational schema (13 modules)
│   ├── 02-seed-data.sql                # Base seed dataset with bcrypt-hashed credentials
│   ├── 03-payroll-schema.sql           # Statutory payroll tables (runs, items, structures)
│   ├── 04-cloudstine-enterprise-features.sql # Biometric attendance master, holiday calendars, notices
│   ├── 05-system-settings.sql          # Dynamic system configuration key-value store
│   ├── 06-payroll-audit-hardening.sql  # Point-in-time immutable JSON snapshot columns
│   ├── 07-location-policy-schema.sql   # Multi-branch dynamic location policies & custom PT slabs
│   ├── 08-v3-production-schema.sql     # Production indexes and foreign key cascading constraints
│   ├── 09-recruitment-careers-lifecycle.sql # Public careers jobs and candidate application tracking
│   ├── README.md                       # Database schema documentation & restoration guide
│   └── legacy/                         # Archived historical prototype patches
│
├── docs/                               # Engineering Documentation & Audits
│   ├── IMPLEMENTATION_PLAN.md          # Modernization roadmap
│   ├── PATILONE_END_TO_END_ARCHITECTURE_AND_FEATURES.md # Complete end-to-end architecture guide
│   └── PROJECT_AUDIT.md                # Comprehensive architectural & security audit
│
├── e2e/                                # Playwright Automated E2E & Visual Audit Suite
│   ├── screenshots/                    # 26 high-resolution captured screenshots
│   ├── patilone-full-lifecycle.spec.js # Full lifecycle 7-test verification suite
│   ├── visual-audit-and-screenshots.spec.js # Visual audit & screenshot generator suite
│   └── README.md                       # E2E test execution documentation
│
├── scripts/                            # Operational DevOps & Seeding Utilities
│   ├── backfill-payroll-readiness.js   # Backfill salary structure assignments and bank details
│   ├── init-cloud-db.js                # Cloud database initialization script
│   ├── seed-location-policies.js       # Seed default multi-branch facility policies
│   ├── update-passwords.js             # Re-hash default credentials with bcrypt
│   └── README.md                       # DevOps script documentation
│
├── docker-compose.yml                  # Multi-container orchestration (DB, API, Web)
├── playwright.config.js                # Playwright E2E configuration with auto-webServer spawning
├── PROGRESS.md                         # Engineering execution and progress log
├── README.md                           # Master project documentation (this file)
└── TASKS.md                            # Task checklist and verification tracking
```

---

## 4. Indian Statutory Compliance Matrix (FY 2026-27 / AY 2026-27)

| Statutory Act / Provision | Regulatory Formula / Slab | Implementation Guarantee |
| :--- | :--- | :--- |
| **Income Tax TDS (Section 192)** | New Tax Regime (AY 2026-27):<br>&bull; ₹0 &ndash; ₹3,00,000: Nil<br>&bull; ₹3,00,001 &ndash; ₹7,00,000: 5%<br>&bull; ₹7,00,001 &ndash; ₹10,00,000: 10%<br>&bull; ₹10,00,001 &ndash; ₹12,00,000: 15%<br>&bull; ₹12,00,001 &ndash; ₹15,00,000: 20%<br>&bull; Above ₹15,00,000: 30%<br>**Standard Deduction:** ₹75,000<br>**Section 87A Rebate:** Taxable income up to ₹12,00,000 yields **₹0 tax**. | Fully automated spreading across remaining fiscal months with YTD deduction awareness. |
| **EPF & EPS (EPF Act, 1952)** | **Wage Ceiling:** ₹15,000/mo.<br>&bull; Employee PF: 12% on min(Basic+DA, ₹15k) = ₹1,800/mo.<br>&bull; Employer EPS: 8.33% capped at ₹1,250/mo.<br>&bull; Employer EPF: Remainder (3.67% = ₹550/mo).<br>&bull; **Post-2014 EPS Exclusion:** Joiners with Basic > ₹15k have 0% EPS; 100% employer contribution routes to EPF.<br>&bull; **EDLI:** 0.5% capped at ₹75/mo. | Configurable per branch: `15000` statutory cap, `ACTUAL/VPF` un-capped wage, or `NO_LIMIT`. |
| **ESIC (ESI Act, 1948)** | **Wage Ceiling:** ₹21,000/mo Gross.<br>&bull; Employee: 0.75% of Gross Pay.<br>&bull; Employer: 3.25% of Gross Pay.<br>&bull; **Rule 50 Continuity Proviso:** Wage crossing ₹21k mid-contribution period remains covered until period end.<br>&bull; **Rounding Symmetry:** Both contributions rounded via `Math.round`. | Verified rounding symmetry: `ESIC Total === Employee ESIC + Employer ESIC`. |
| **Professional Tax (State Acts)** | **Maharashtra (MH):**<br>&bull; Gross &le; ₹7,500: Nil<br>&bull; ₹7,501 &ndash; ₹10,000: ₹175/mo<br>&bull; > ₹10,000: ₹200/mo (February surcharge: ₹300)<br>&bull; **Female Exemption:** Gross &le; ₹25,000 is completely exempt.<br>**Madhya Pradesh (MP):** Slabs ₹0, ₹125, ₹167, ₹208.<br>**Karnataka (KA):** Slabs ₹0, ₹150, ₹200. | Evaluates custom state slabs or HR-defined JSON slab overrides from database. |
| **Payment of Gratuity Act, 1972** | Costing Accrual: $4.81\%$ of Basic + DA ($15/26 \times \text{wage}$).<br>Statutory Vesting: Vested only after 5 years continuous service; statutory ceiling capped at ₹20,00,000. | Accrual is clearly separated from legal balance. |
| **Zero-Rupee Invariant** | $$\text{Gross Salary} + \text{Total Employer Contributions} - \text{Monthly Loaded CTC} \equiv 0.00$$ | Strict integer paise precision avoids IEEE-754 floating-point drift. |

---

## 5. Maker-Checker 4-Tier Governance State Machine

```
      ┌──────────────┐
      │    DRAFT     │ <── HR initiates monthly calculation
      └──────┬───────┘
             │ HR Maker clicks "Submit for Approval"
             ▼
      ┌──────────────┐
      │  SUBMITTED   │ <── Immutable snapshot locked; Maker cannot self-approve
      └──────┬───────┘
             │ Admin Checker reviews variance and approves (or rejects with reason)
             ├────────────────────────────────┐
             ▼ (Reject)                       ▼ (Approve)
      ┌──────────────┐                 ┌──────────────┐
      │   REJECTED   │                 │   APPROVED   │
      └──────┬───────┘                 └──────┬───────┘
             │ Reverts to Draft               │ Admin locks and finalizes
             └──────────────┐                 ▼
                            │          ┌──────────────┐
                            └────────> │  FINALIZED   │ <── Generates Bank CSV & ECR
                                       └──────┬───────┘
                                              │ Finance initiates bank transfer
                                              ▼
                                       ┌──────────────┐
                                       │     PAID     │ <── Salary slips published to employees
                                       └──────────────┘
```

---

## 6. Pre-Configured Demo Credentials & 1-Click Persona Switcher

The login console at `/login` provides 1-click **Persona Switcher Pills** that auto-populate tested credentials:

| Operational Persona | Email | Password | Role Badge |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@shendeindustries.com` | `password123` | `ADMIN` (Checker) |
| **HR Specialist** | `hr@shendeindustries.com` | `password123` | `HR` (Maker) |
| **Module Lead** | `manager@shendeindustries.com` | `password123` | `MANAGER` |
| **Staff Member** | `employee@shendeindustries.com` | `password123` | `EMPLOYEE` |

---

## 7. Visual Audit & Screenshot Gallery (26 High-Res Screens)

All 26 screenshots were automatically captured via Playwright browser automation into `e2e/screenshots/`:

| # | Screen / Interaction | Link |
|---|----------------------|------|
| **01** | Side-by-Side Enterprise Login Console | [01-login-screen.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/01-login-screen.png) |
| **02** | Interactive Persona Switcher (Auto-fill HR/Admin/Lead/Staff) | [02-login-persona-switch.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/02-login-persona-switch.png) |
| **03** | Public Careers Portal (Job Board) | [03-public-careers-portal.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/03-public-careers-portal.png) |
| **04** | Job Application Sliding Drawer | [04-public-careers-apply-drawer.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/04-public-careers-apply-drawer.png) |
| **05** | Application Submission Confirmation & Tracking Code | [05-public-careers-submission-success.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/05-public-careers-submission-success.png) |
| **06** | Real-Time Candidate Application Status Timeline | [06-public-careers-tracking-status.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/06-public-careers-tracking-status.png) |
| **07** | HR Operations Mission Control Dashboard | [07-hr-dashboard.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/07-hr-dashboard.png) |
| **08** | Multi-Stage ATS Recruitment Pipeline Board | [08-recruitment-pipeline.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/08-recruitment-pipeline.png) |
| **09** | Live Stage Progression Actions (Shortlist &rarr; Interview &rarr; Offer) | [09-recruitment-advance-stages.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/09-recruitment-advance-stages.png) |
| **10** | 1-Click Candidate-to-Payroll Onboarding Modal | [10-recruitment-1click-onboard-modal.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/10-recruitment-1click-onboard-modal.png) |
| **11** | Enterprise Workforce Directory & User Management | [11-admin-user-management.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/11-admin-user-management.png) |
| **12** | Provision New HR Operations Lead User Modal | [12-admin-create-hr-modal.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/12-admin-create-hr-modal.png) |
| **13** | Enterprise Multi-Branch Corporate Holiday Calendar | [13-corporate-holiday-calendar.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/13-corporate-holiday-calendar.png) |
| **14** | Interactive Add Company Holiday Modal Form | [14-create-holiday-modal.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/14-create-holiday-modal.png) |
| **15** | Newly Created Holiday Verified in Live Calendar Grid | [15-holiday-created-verified.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/15-holiday-created-verified.png) |
| **16** | Dynamic Multi-Branch Location Policies Studio & Matching Engine | [16-location-policies-studio.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/16-location-policies-studio.png) |
| **17** | Point-in-Time Policy Version History Modal (Immutability Log) | [17-location-policy-version-history.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/17-location-policy-version-history.png) |
| **18** | CTC Breakup Matching Simulator & Waterfall Studio | [18-ctc-breakup-simulator.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/18-ctc-breakup-simulator.png) |
| **19** | Bulk 300+ Employee Performance Batch Import Studio | [19-bulk-300-employee-import.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/19-bulk-300-employee-import.png) |
| **20** | Kredily Shadow Run Pilot Comparison Engine (Delta Analysis) | [20-kredily-pilot-comparator.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/20-kredily-pilot-comparator.png) |
| **21** | Monthly Payroll Processing Wizard (Draft Calculations & Readiness) | [21-monthly-payroll-wizard-draft.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/21-monthly-payroll-wizard-draft.png) |
| **22** | HR Maker Submission for Governance Review | [22-maker-checker-submission.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/22-maker-checker-submission.png) |
| **23** | Admin Checker Approval & 1-Click Bank CSV Export | [23-admin-payroll-checker-approval.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/23-admin-payroll-checker-approval.png) |
| **24** | Employee Self-Service My Salary Slips & History | [24-employee-self-service-payslips.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/24-employee-self-service-payslips.png) |
| **25** | Detailed Salary Slip Breakdown Modal with Statutory Deductions | [25-employee-payslip-breakdown-modal.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/25-employee-payslip-breakdown-modal.png) |
| **26** | Enterprise RBAC Guard (Restricted Route Interception & Redirect) | [26-employee-rbac-restriction.png](file:///c:/Users/Ritesh/Downloads/Projects/Tracker/e2e/screenshots/26-employee-rbac-restriction.png) |

---

## 8. Quickstart & Local Setup Guide

### Option A: Standard Local Development (Recommended)

#### Step 1: Start PostgreSQL via Docker Compose
```powershell
docker compose up -d db
```
*PostgreSQL starts on port `5435` with database `timetrakpro`, automatically executing all schema migrations in `database/`.*

#### Step 2: Start the Backend API Server
```powershell
cd Backend
npm install
node src/server.js
```
*API runs on `http://localhost:5000`. Health check: `http://localhost:5000/health`.*

#### Step 3: Start the Frontend Application
```powershell
cd Frontend
npm install
npm run dev
```
*Frontend dev server launches at `http://localhost:3000` with hot module replacement.*

---

### Option B: Full Test Battery Execution

```powershell
# 1. Statutory rules and calculation engine unit tests (102 tests):
node Backend/tests/payrollEngine.test.js

# 2. Layer 2 API, RBAC & Maker-Checker integration tests (12 tests):
node Backend/tests/payrollApiIntegration.test.js

# 3. Full lifecycle Playwright E2E suite (7 tests):
npx playwright test e2e/patilone-full-lifecycle.spec.js

# 4. Visual audit & screenshot suite (9 tests, captures 26 screens):
npx playwright test e2e/visual-audit-and-screenshots.spec.js

# 5. Production build compilation:
cd Frontend
npm run build
```

---

## 9. License & Proprietary Notice

Copyright © 2026 **Shende Industries**. All rights reserved.  
Proprietary software engineered for internal enterprise operations, multi-axis manufacturing coordination, and public corporate governance.
