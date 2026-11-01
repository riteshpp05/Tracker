# STATE.md — Current Session Memory

**Project:** PatilOne Native Indian Payroll System  
**Current Phase:** Audit & Hardening — Revision 2 Complete  
**Classification:** **Ready for controlled parallel testing**  
**Last Updated:** 2026-10-28

---

## Completed So Far
- [x] Initial Codebase Audit & Fixes (Wave 1 & 2):
  - Fixed CSV / spreadsheet formula injection in `bankPaymentExportService.js`.
  - Enforced symmetric ESIC rounding across frontend and backend.
  - Implemented 3-tier validation in `payrollValidationService.js` (BLOCKING, WARNING, INFORMATIONAL).
  - Added mid-month joiner & leaver proration and decoupled salaried attendance from timesheet hours in `payrollCalculationEngine.js`.
  - Added bidirectional `ctcReconciliationEngine.js` with deficit error detection and minimum basic warnings.
  - Added Kredily parallel pilot comparison engine (`payrollPilotService.js`).
  - Added rejection flow and bank account masking in `payrollController.js`.
  - Added non-negative net pay check constraints and performance indexes in `database/06-payroll-audit-hardening.sql`.
- [x] Independent Second Audit & Legal Hardening:
  - **TDS Section 192:** Implemented AY 2026-27 New Tax Regime (Section 115BAC) with Section 87A rebate up to ₹12,00,000 net taxable income (salaried gross up to ₹12,75,000 has ₹0 income tax), alongside AY 2025-26 legacy support and YTD-aware spreading.
  - **EPF / EPS / EDLI / VPF:** Implemented Post-2014 new-member EPS exclusion (Supreme Court Nov 2022 / GSR 609(E)) where 100% employer contribution goes to EPF (0% to EPS); strictly capped EDLI at ₹75/mo (0.5% of ₹15k); handled VPF independently without employer matching.
  - **ESIC Rule 50 Proviso:** Implemented 6-month contribution period continuity (Apr–Sep and Oct–Mar) where employees crossing ₹21,000 mid-period maintain coverage until period ends.
  - **Reimbursements:** Strictly decoupled tax-exempt official business expenses (Section 10(14) Rule 2BB(1)) from taxable perquisites under Section 115BAC.
  - **Payment of Gratuity Act:** Segregated internal employer budgeting accrual ($4.81\%$) from statutory vesting liability (vests only after $\ge 5$ years continuous service; capped at ₹20,00,000).
  - **Maharashtra PT:** Verified against Maharashtra Act XIX of 2023 Gazette (female exemption $\le$ ₹25,000; February ₹300 adjustment).
  - **Statutory Registry:** Recorded official circular numbers, effective dates, verification status, and unresolved uncertainties in `statutoryRulesService.getStatutoryRegistry()`.
  - **Deterministic Test Suite:** Expanded to **78 automated tests** in `Backend/tests/payrollEngine.test.js` (100% passing).
  - **Frontend Compilation:** Production build verified with Vite 7 (`2,736 modules transformed`, zero errors).

---

## Current Status & Next Phase
- **Classification:** Ready for controlled parallel testing.
- **Pilot Shadow Runs:** Run 2 consecutive monthly shadow cycles against Kredily before final live cutover.

---

## Dynamic Multi-Location Payroll Matching Engine & Bulk Import (Completed 2026-11-01)
- [x] **Database Schema (`database/07-location-policy-schema.sql`):**
  - Created `payroll_location_policies` table for branch-level statutory rules, Dearness Allowance (DA), HRA %, fixed allowances, and cost multipliers.
  - Created `payroll_location_policy_history` for immutable audit logging of policy edits.
  - Created `payroll_import_staging` for decoupled bulk employee onboarding (300+ records) before credential assignment.
  - Linked `employees.location_policy_id` FK.
  - Zero hardcoded location names anywhere in code or database seeds.
- [x] **Core Calculation Engine (`ctcReconciliationEngine.js` & `statutoryRulesService.js`):**
  - Added `decomposeFromNetSalary()` (Mode A: Net-to-CTC) replicating plant Excel logic with zero-rupee internal variance.
  - Added multi-state Professional Tax (`calculateMultiStatePT`):
    - MH: Maharashtra Act XIX of 2023 (≤₹25k female exempt, Feb ₹300 surcharge).
    - MP: Madhya Pradesh PT Act 1995 (≤₹9,999: ₹0, ₹10k-₹14,999: ₹125, ₹15k-₹19,999: ₹167, ≥₹20k: ₹208).
    - GJ: Gujarat PT Act 1976.
    - KA: Karnataka PT Act 1976.
    - TN: No PT (abolished 1988).
- [x] **Backend Services & REST APIs:**
  - `locationPolicyService.js`: Full CRUD with parameter validation, caching, and audit history logging.
  - `locationPolicyController.js`: `/api/payroll/location-policies` and `/simulate` endpoints.
  - `bulkImportService.js` & `bulkImportController.js`: Streaming buffer CSV/XLSX parser and row validator for PAN/UAN/IFSC.
- [x] **Frontend UI Suite:**
  - `LocationPoliciesPage.jsx`: Dynamic HR panel to configure DA, HRA, statutory rates, allowances, and view audit history.
  - `CtcMatchingSimulatorPage.jsx`: Dual-mode live calculator with 3-tier validation (ERROR, WARNING, INFO) and zero-variance audit cards.
  - `BulkImportPage.jsx`: Drag-and-drop CSV/XLSX uploader, validation summary, and staging review table.
  - Integrated into `routes.jsx` and `Layout.jsx` sidebar navigation for ADMIN and HR roles.
- [x] **Deterministic Verification & Benchmarks:**
  - Total automated tests expanded to **102 tests, all passing** (`Backend/tests/payrollEngine.test.js`).
  - Stress benchmark: **350 employee records calculated in 1ms** (0.003ms/record, Total Monthly CTC: ₹2,36,04,589).
  - Production build: Vite 7 `2,739 modules transformed` with exit code 0.
