# Full Codebase Scan & Quality/Security Hardening - TASKS.md

## Iteration Checklist

- [x] Task 1: Audit Backend Security & Access Control
  - [x] 1.1 Review JWT generation, expiration, secret handling, and cookie/header auth
  - [x] 1.2 Inspect Auth Controller & Employee Controller for RBAC and IDOR vulnerabilities
  - [x] 1.3 Check SQL parameterized queries in all critical controllers to eliminate SQL injection
  - [x] 1.4 Audit File Upload middleware for file type verification, size limit, and path traversal protection
  - [x] 1.5 Audit Error handling middleware to prevent leaking stack traces and DB internal errors to clients

- [x] Task 2: Implement Backend Security & Logic Fixes
  - [x] 2.1 Patch Manager horizontal privilege escalation (IDOR) on leave approvals/rejections (`leaveController.js`)
  - [x] 2.2 Patch Manager horizontal privilege escalation (IDOR) on expense claims (`expenseController.js`)
  - [x] 2.3 Patch Manager horizontal privilege escalation (IDOR) on travel requests (`travelController.js`)
  - [x] 2.4 Fix dynamic role lookup for HR in recruitment candidate submission (`publicController.js`)
  - [x] 2.5 Fix missing `employeeId` alias in `authMiddleware.js` and align `recipient_id` in `notificationService.js` and `notificationController.js`

- [x] Task 3: Audit & Harden Frontend Security & UX
  - [x] 3.1 Audit API client interceptors for secure token handling and error response sanitization
  - [x] 3.2 Audit Lenis scroll isolation (`data-lenis-prevent="true"`) across all modals, dialogs, drawers, and popovers
  - [x] 3.3 Eliminate raw `<Separator />` components and misplaced borders in `SystemSettings.jsx` and `EmployeeDashboard.jsx`
  - [x] 3.4 Fix `NotificationPopover.jsx` line bugs by replacing container `divide-y` with targeted item borders
  - [x] 3.5 Clean up public routes (`/about`, `/services`, `/contact` redirected to root; keep Careers and Sign In portals)

- [x] Task 4: Empirical Verification
  - [x] 4.1 Backend health check & API integrity verification (`HEALTH_CHECK: 200 OK`)
  - [x] 4.2 Frontend build compilation check (`npm run build` completed in 28.76s with exit code 0)
  - [x] 4.3 Log and summarize all changes and security enhancements

- [x] Task 5: Sidebar & Global Layout Polish (`Layout.jsx`)
  - [x] 5.1 Standardize sidebar width to 256px (`w-64` / `lg:ml-64`) and align brand header (logo + title + role badge)
  - [x] 5.2 Render 16px Lucide icons in nav items with 40px active pill (`h-10 px-3.5 rounded-xl font-medium text-[13px] bg-[#111827] text-white`)
  - [x] 5.3 Add uppercase eyebrow section header ("WORKSPACE") and clean support link at bottom

- [x] Task 6: Employee Dashboard Complete Visual Elevation (`EmployeeDashboard.jsx`)
  - [x] 6.1 Standardize 4 metric cards to uniform min-height with balanced icon tile and status badge on top row
  - [x] 6.2 Overhaul Weekly Time Distribution chart with 8h/4h dashed guidelines, soft backdrop column, and refined "Today" indicator
  - [x] 6.3 Transform quick action links in Project Allocation into elegant interactive rows with dedicated icon tiles

- [x] Task 7: Cross-Role UI Symmetry & Final Verification
  - [x] 7.1 Confirm Admin, Manager, and HR dashboards match the 256px sidebar and design tokens
  - [x] 7.2 Run frontend production build check (`npm run build` completed in 27.67s with exit code 0)
  - [x] 7.3 Update progress log in `PROGRESS.md`

- [x] Task 8: Project Restructuring, Double Folder Elimination & Master README
  - [x] 8.1 Identify and eliminate nested double folder structure (`3TOne/3TOne-ali-dev`)
  - [x] 8.2 Move all project files and directories cleanly to the workspace root (`Tracker/`)
  - [x] 8.3 Archive loose legacy SQL patches (`patch*.sql`, `schema.sql`) into `database/legacy/`
  - [x] 8.4 Add `Frontend/.env.example` and configure `.gitignore` for `uploads` and `.gitkeep`
  - [x] 8.5 Update export report naming in `ExportButton.jsx` to Shende Portal branding
  - [x] 8.6 Write modular `Frontend/README.md`, `Backend/README.md`, and `database/README.md`
  - [x] 8.7 Author comprehensive, production-grade root `README.md`
  - [x] 8.8 Verify frontend production build (`npm run build` completed in 26.66s with 0 errors) and backend syntax

- [x] Task 9: Phase 1 — Database Migration & Payroll Schema
  - [x] 9.1 Create `database/03-payroll-schema.sql` with employee extensions, master tables, transactions, and audit logs
  - [x] 9.2 Execute migration against local Postgres `timetrakpro`
  - [x] 9.3 Seed initial Indian salary components, default structures, statutory configs, and employee salary assignments
  - [x] 9.4 Verify database tables and constraints with SQL checks

- [x] Task 10: Phase 2 — Deterministic Payroll Engine & Statutory Services
  - [x] 10.1 Build `payrollCalculationEngine.js` (pro-ration, earnings, deductions, rounding, words generator)
  - [x] 10.2 Build `statutoryRulesService.js` (EPF, ESIC, Maharashtra PT, TDS slabs with versioning)
  - [x] 10.3 Build `payrollInputCollector.js` (gather approved leaves, LOP, timesheets, expense claims)
  - [x] 10.4 Build `payrollValidationService.js` (readiness checks, missing PAN/bank info, duplicate prevention)
  - [x] 10.5 Author and run comprehensive test suite `Backend/tests/payrollEngine.test.js`

- [x] Task 11: Phase 3 — Backend Payroll Controller & REST API
  - [x] 11.1 Create `Backend/src/controllers/payrollController.js` with full lifecycle endpoints
  - [x] 11.2 Create `Backend/src/routes/payrollRoutes.js` with RBAC protection
  - [x] 11.3 Mount payroll routes in `Backend/src/routes/index.js`
  - [x] 11.4 Verify all endpoints via automated API tests (`Backend/tests/payrollApi.test.js`)

- [ ] Task 12: Phase 4 & 5 — Frontend HR Payroll Suite & Employee Self-Service
  - [ ] 12.1 Add Payroll navigation links in `Layout.jsx` for HR and ADMIN, and Payslips for EMPLOYEE
  - [ ] 12.2 Create `PayrollService.js` frontend API client
  - [ ] 12.3 Build `PayrollDashboard.jsx` (Overview, pending approvals, total payroll cost, quick stats)
  - [ ] 12.4 Build `SalaryStructuresPage.jsx` (Structures & components manager)
  - [ ] 12.5 Build `EmployeeSalariesPage.jsx` (Employee compensation, banking & statutory IDs, revision history)
  - [ ] 12.6 Build `MonthlyPayrollPage.jsx` (Guided 6-step monthly payroll processing wizard)
  - [ ] 12.7 Build `PayslipManagementPage.jsx` & Printable Payslip modal/PDF
  - [ ] 12.8 Build `BankPaymentExportPage.jsx` (NEFT/RTGS batch file export & reconciliation)
  - [ ] 12.9 Build `StatutoryReportsPage.jsx` (PF ECR, ESIC, PT register, department breakdown)
  - [ ] 12.10 Build `EmployeePayslipsPage.jsx` (Employee self-service portal)
  - [ ] 12.11 Register all new routes in `Frontend/src/routes.jsx`

- [ ] Task 13: Phase 6 — Integration Testing, Production Build & Empirical Verification
  - [ ] 13.1 Run end-to-end payroll test cycle for October 2026
  - [ ] 13.2 Verify maker-checker approval locks and audit trail
  - [ ] 13.3 Test employee self-service data isolation
  - [ ] 13.4 Run frontend production build (`npm run build`) and backend checks
  - [ ] 13.5 Document system in `PROGRESS.md` and update `STATE.md`

