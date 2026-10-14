# ROADMAP.md — PatilOne Native Indian Payroll System

**Single Source of Truth for Roadmap & Phases**

---

## Phase Breakdown

### Wave 1: Database Architecture & Domain Core
- [ ] **Phase 1: Database Migration & Schema Creation**
  - Extend `employees` table with statutory & banking columns (`pan_number`, `bank_account_no`, `bank_name`, `ifsc_code`, `uan_number`, `pf_number`, `esi_number`, `tax_regime`).
  - Create `payroll_components`, `salary_structures`, `salary_structure_items`, `employee_salary_assignments`.
  - Create `payroll_runs`, `salary_slips`, `salary_slip_items`, `payroll_statutory_configs`, `payroll_audit_logs`.
  - Seed standard Indian payroll components (Basic, HRA, Special Allowance, PF, ESIC, PT, TDS) and default salary structures.
  - Verify migration script runs idempotently on Postgres (`timetrakpro`).

### Wave 2: Backend Calculation Engine, Rules & API Layer
- [ ] **Phase 2: Calculation Engine & Statutory Service**
  - Implement `payrollCalculationEngine.js` with deterministic rounding and LOP pro-ration.
  - Implement `statutoryRulesService.js` for EPF, ESIC, Maharashtra Professional Tax, and Income Tax TDS.
  - Implement `payrollInputCollector.js` fetching existing approved leaves, attendance, and expense claims.
  - Implement `payrollValidationService.js` checking employee readiness, missing bank info, duplicate periods.
  - Build test suite `tests/payrollEngine.test.js` verifying edge cases against official statutory numbers.
- [ ] **Phase 3: Controller & REST API Routes**
  - Create `payrollController.js` handling:
    - Component CRUD & Structure management
    - Employee salary structure assignment & history
    - Payroll period creation, readiness check, and draft calculation
    - Payroll review, reconciliation, maker-checker approval, and locking
    - Payslip generation and secure employee self-service retrieval
    - Bank payment file generation (NEFT/RTGS CSV export)
  - Mount `/api/payroll` and `/api/v1/payroll` with RBAC middleware (`ADMIN`, `HR`, `EMPLOYEE`).

### Wave 3: Frontend HR Payroll Suite & Employee Self-Service
- [ ] **Phase 4: HR Payroll Module in PatilOne Sidebar**
  - Add Payroll navigation to `Layout.jsx` for HR and ADMIN.
  - Build `PayrollDashboard.jsx`: Month overview, pending actions, payroll cost summary, quick links.
  - Build `SalaryStructuresPage.jsx`: Reusable structures, components, and formula builder.
  - Build `EmployeeSalariesPage.jsx`: Employee compensation, effective dates, revision history, statutory IDs.
  - Build `MonthlyPayrollPage.jsx`: Guided step-by-step monthly run (Select Month -> Check Readiness -> Calculate Draft -> Reconcile -> Submit Approval -> Finalize & Lock).
  - Build `PayslipManagementPage.jsx`: Payslip list, filters, download single/batch.
  - Build `BankPaymentExportPage.jsx`: NEFT payment batch generation & reconciliation.
  - Build `StatutoryReportsPage.jsx`: PF ECR summary, ESIC summary, PT return register, department cost breakdown.
- [ ] **Phase 5: Employee Self-Service Portal**
  - Add "My Payslips" route (`/employee/payslips`) for all employees in `Layout.jsx` and `routes.jsx`.
  - Build `EmployeePayslipsPage.jsx`: View past payslips, preview line items, download branded PDF payslips.

### Wave 4: End-to-End Verification, Security & State Audit
- [ ] **Phase 6: Verification, Integration Testing & Final Cutover**
  - Run synthetic + real seed payroll run for current month (October 2026).
  - Validate maker-checker approval lock and tamper-proof audit log entries.
  - Test employee data isolation (employees cannot see other employees' payslips or salaries).
  - Verify frontend production build (`npm run build`) and backend syntax (`node --check`).
  - Update `TASKS.md` and `PROGRESS.md`.
