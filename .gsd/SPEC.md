# SPEC.md — Native PatilOne Indian Payroll System

**Status: FINALIZED**
**Version:** 1.0.0
**Date:** 2026-10-14
**Author:** Principal Software Architect & Engineering Lead

---

## 1. Executive Summary & Core Constraints

PatilOne is the unified enterprise operations portal for Shende Industries, built with:
- **Frontend:** React 19 SPA, Vite 7, Tailwind CSS, Lucide-react, Radix UI, Framer Motion, Lenis scroll.
- **Backend:** Node.js (ES modules), Express 4, PostgreSQL 16 (`pg` driver, port 5435), JWT auth with RBAC.
- **Database:** `timetrakpro` PostgreSQL database with existing employees, leaves, timesheets, and expense claims.

### Mandatory Architectural Rules
1. **Native Implementation:** Build the payroll system directly into the existing PatilOne backend and frontend.
2. **Zero Frappe Runtime:** Do NOT install Frappe framework, Frappe HR, or any secondary backend/database.
3. **Reference-Only Use:** The supplied reference codebase (`C:\Users\Ritesh\Downloads\Projects\CRM` — Frappe HR / HRMS) is utilized strictly for analyzing payroll structures, formulas, validation rules, edge cases, and Indian statutory logic. No GPL source code is blindly copied.
4. **Preserve Existing Data:** Reuse existing `employees` records, `leave_requests`, `daily_timesheet_entries`, and `expense_claims`. No duplicate profiles or parallel attendance databases.
5. **Deterministic Calculations:** No LLM-based calculations. All payroll numbers are decimal-safe, rounded per legal rules, and stored immutably with rule versions.

---

## 2. Module Specifications

### 2.1 Database Architecture (PostgreSQL)
- **Employee Extensions:**
  - `employees`: Add `pan_number`, `bank_account_no`, `bank_name`, `ifsc_code`, `uan_number`, `pf_number`, `esi_number`, `tax_regime` (DEFAULT 'New').
- **Payroll Master & Configuration:**
  - `payroll_components`: Component code, name, type (`EARNING`, `DEDUCTION`, `EMPLOYER_CONTRIBUTION`), calculation mode, taxable flag, statutory flag, pro-ration flag (`depends_on_payment_days`).
  - `salary_structures`: Predefined structures (e.g., "Executive Full-Time", "Core Engineering", "Contractor/Associate").
  - `salary_structure_items`: Components attached to a structure with percentage of basic or fixed amount formulas.
  - `employee_salary_assignments`: Effective-dated assignments (`from_date`, `to_date`, `base_monthly_salary`, `ctc_annual`, `is_active`).
  - `payroll_statutory_configs`: Versioned statutory configuration for EPF (12% employee, 12% employer split 8.33% EPS + 3.67% EPF + 0.5% EDLI + 0.5% admin, ₹15,000 ceiling), ESIC (0.75% employee, 3.25% employer, ₹21,000 threshold), Maharashtra PT (₹200/mo, ₹300 Feb), and Income Tax TDS slabs.
- **Payroll Transactions:**
  - `payroll_runs`: Period (month, year, start_date, end_date), status (`DRAFT`, `SUBMITTED`, `APPROVED`, `FINALIZED`, `PAID`, `CANCELLED`), aggregates (gross, deductions, employer contributions, net pay), maker-checker audit fields (`approved_by`, `finalized_by`).
  - `salary_slips`: Employee monthly slip, working days, payment days, LOP days, gross pay, deductions, employer contributions, net pay, rounded total, words representation, status.
  - `salary_slip_items`: Line-item breakdown per component for complete transparency.
  - `payroll_audit_logs`: Audit trail for all salary changes, run status transitions, and payments.

### 2.2 Payroll Calculation Engine & Indian Statutory Rules
1. **Working Days & Pro-ration:**
   - Calendar days in month: `N`
   - Loss of pay (LOP) days: Approved unpaid leaves + recorded unexcused absences.
   - Payment days: `P = N - LOP`
   - Pro-rated components: `Amount = BaseComponentAmount * (P / N)`
2. **Statutory Rules:**
   - **EPF:** 12% of PF Wage (Basic) subject to ₹15,000 statutory limit (max ₹1,800/mo employee share) unless full wage opted. Employer contribution of 12% (8.33% EPS capped at ₹1,250 + 3.67% EPF + 0.5% EDLI + 0.5% admin).
   - **ESIC:** Applicable if Gross <= ₹21,000. Employee: 0.75%, Employer: 3.25%.
   - **Maharashtra PT:** Gross <= ₹7,500 (₹0), ₹7,501 - ₹10,000 (₹175), > ₹10,000 (₹200/mo; ₹300 in February).
   - **TDS:** Standard deduction (₹75,000 / year in New Regime) + annual tax estimation divided across payroll months.
3. **Reconciliation & Rounding:**
   - `Net Pay = Gross Pay - Total Employee Deductions`
   - Rounded to nearest whole rupee.
   - Number-to-words generator for Indian currency (Rupees and Paise).

### 2.3 Workflow Lifecycle (Maker-Checker)
1. **Create Draft Run:** HR selects Month, Year, and eligible employees. System verifies duplicate runs are prevented.
2. **Collect Inputs:** Automatically aggregate approved leaves (paid vs LOP), timesheets, approved expense reimbursements, and effective salary structure assignments.
3. **Readiness & Validation:** Detect missing bank details, missing PAN, unassigned salary structures, unapproved leaves, or negative pay.
4. **Calculate Draft:** Compute all slips and totals deterministically.
5. **Review & Reconcile:** Department breakdowns, variance checks, and audit warnings.
6. **Approval & Finalization:** Submit to Admin/Approver. Enforce maker-checker (HR cannot approve their own submission if strict mode is active).
7. **Lock & Payslip Issuance:** Finalize locks records. Generates professional PDF payslips.
8. **Bank Payment File:** Export standard NEFT/RTGS CSV/Excel file with IFSC, account numbers, and net pay.
9. **Employee Self-Service:** Employees securely access and download their own payslips from `/employee/payslips`.

---

## 3. Security, RBAC & Privacy
- Sensitive fields (PAN, Bank Account, Salary figures) are isolated with backend RBAC checks (`ADMIN` and `HR` only; `EMPLOYEE` can access only their own payslip).
- All API routes protected with `authenticateToken` and `authorizeRoles`.
- Audit logs capture all salary revisions, structure updates, and payroll approvals.

---

## 4. Verification Standards
- Database schema migration executes cleanly on PostgreSQL.
- Deterministic calculation unit tests verify EPF, ESIC, PT, LOP, and roundings against hand-computed benchmarks.
- Frontend builds cleanly (`npm run build`) with zero lint/compilation errors.
- End-to-end simulation: Setup employee compensation -> Run October 2026 payroll -> Approve & Lock -> Generate Payslip -> Verify Employee Self-Service.
