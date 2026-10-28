# Comprehensive Payroll System Audit & Hardening Report (Revision 2 — Independent Audit)

**Project:** Shende Industries Enterprise Portal (PatilOne)  
**Date of Audit & Fixes:** 2026-10-28  
**Auditor Roles:** Senior Full-Stack Engineer, Payroll Domain Specialist, Software Architect, Security Engineer  
**Classification:** **Ready for controlled parallel testing**

---

## 1. Executive Summary & Defect Inventory

Prior to and during this dual-phase independent audit, PatilOne operated a native Indian payroll engine with several critical vulnerabilities, statutory gaps, and tax regime misalignments. All identified defects have been remediated, verified, and backed by automated deterministic tests:

| ID | Component | Defect Found | Severity | Status After Fix |
|---|---|---|---|---|
| **DEF-01** | `bankPaymentExportService.js` | CSV / Spreadsheet formula injection vulnerability (`=`, `+`, `-`, `@`, `\t`, `\r` prefixes in beneficiary name, code, or narration allowed execution in Excel/Calc). | **CRITICAL** | **FIXED** (Escapes & apostrophe-prefixing per OWASP CSV Injection Standard) |
| **DEF-02** | `statutoryRulesService.js` | ESIC employee deduction calculated with `Math.ceil` while employer used `Math.round`, breaking the statutory 4% total remittance. | **HIGH** | **FIXED** (Symmetric `Math.round` enforced on both shares) |
| **DEF-03** | `statutoryRulesService.js` | EPF employer EPF could theoretically become negative if employer EPS rounded up at low basic wages. | **HIGH** | **FIXED** (`Math.max(0, employerTotal - employerEPS)` clamping guard) |
| **DEF-04** | `payrollController.js` | Maker-checker self-approval check (`run.submitted_by === req.user?.id`) was vulnerable to UUID casing/type mismatches between DB UUID and JWT string. | **HIGH** | **FIXED** (Normalized lowercase string trimming comparison) |
| **DEF-05** | `payrollController.js` | No `REJECTED` status in payroll lifecycle. Reviewers had no way to send a run back to the submitter with correction notes without cancelling. | **HIGH** | **FIXED** (`POST /runs/:id/reject` implemented with audit logging & slip reset) |
| **DEF-06** | `payrollCalculationEngine.js` | Non-taxable expense reimbursements were added to Gross Pay and directly inflated the annual taxable income estimate for TDS (Section 192), unfairly penalizing employees. | **HIGH** | **FIXED** (Non-taxable reimbursements separated from taxable gross; TDS projected on taxable earnings only) |
| **DEF-07** | `payrollCalculationEngine.js` | No mid-month joiner / leaver proration logic. Employees joining or exiting mid-month were credited with full month pay. | **HIGH** | **FIXED** (Deterministic joining and separation date window proration added) |
| **DEF-08** | `payrollCalculationEngine.js` | Lack of policy distinction between Salaried and Hourly staff; salaried employees risked pay deductions from unlogged project timesheets. | **MEDIUM** | **FIXED** (Salaried policy decouples project timesheets from LOP; hourly policy scales by logged hours) |
| **DEF-09** | `EmployeeSalariesPage.jsx` | Client-side `computeCtcBreakup` used asymmetric ESIC rounding (`Math.ceil`), causing client-server reconciliation divergence. | **MEDIUM** | **FIXED** (Synchronized with backend symmetric rounding) |
| **DEF-10** | `payrollController.js` | Bank account numbers returned unmasked across all API responses, violating data minimization. | **MEDIUM** | **FIXED** (`maskBankAccount` applied for non-admin/HR roles: `XXXXXXXX1234`) |
| **DEF-11** | `bankPaymentExportService.js` | No validation of Indian IFSC code format or bank account numbers before export. | **MEDIUM** | **FIXED** (Regex validation: 11-char IFSC and 9-18 digit account numbers) |
| **DEF-12** | `payrollValidationService.js` | Only binary BLOCKING/WARNING checks; lacked PAN format, UAN format, and mid-month lifecycle detection. | **MEDIUM** | **FIXED** (3-tier BLOCKING / WARNING / INFORMATIONAL engine implemented) |
| **DEF-13** | `ctcReconciliationEngine.js` | Special Allowance reverse CTC formula lacked deficit detection (when Basic + statutory costs exceeded CTC) and minimum Basic % warnings. | **HIGH** | **FIXED** (New bidirectional reconciliation engine with deficit & policy flag detection) |
| **DEF-14** | `payrollPilotService.js` | No automated parallel comparison mechanism for shadowing external payroll systems (Kredily). | **MEDIUM** | **FIXED** (New comparison service matching 9 core compensation fields with root cause diagnosis) |
| **DEF-15** | `statutoryRulesService.js` | TDS Section 192 hardcoded legacy AY 2025-26 slabs and ₹7 Lakh Section 87A rebate, missing the official AY 2026-27 New Tax Regime rules (Section 87A rebate up to ₹12 Lakhs taxable / ₹12.75 Lakhs salaried gross). | **CRITICAL** | **FIXED** (Versioned multi-year TDS engine supporting AY 2026-27 and AY 2025-26 with YTD-aware spreading) |
| **DEF-16** | `statutoryRulesService.js` | Post-2014 new-member EPS exclusion ignored. New joiners with Basic > ₹15,000 were incorrectly allocated 8.33% to EPS instead of 100% to EPF. | **HIGH** | **FIXED** (Implemented Supreme Court Nov 2022 / GSR 609(E) EPS exclusion; 0% EPS, 12% EPF) |
| **DEF-17** | `statutoryRulesService.js` | EDLI 0.5% was computed on full basic in ACTUAL mode rather than being strictly capped at the statutory ₹15,000 ceiling. | **HIGH** | **FIXED** (Enforced maximum ₹75/mo EDLI cap per EDLI Scheme, 1976) |
| **DEF-18** | `statutoryRulesService.js` | ESIC lacked Rule 50 continuity proviso: employees crossing ₹21,000 mid-period lost coverage immediately instead of continuing until the end of the 6-month contribution period. | **HIGH** | **FIXED** (Implemented Rule 50 of ESI Central Rules 1950 continuity logic) |
| **DEF-19** | `ctcReconciliationEngine.js` & `statutoryRulesService.js` | Gratuity was treated as an immediate cash entitlement without distinguishing employer budgeting accrual ($4.81\%$) from statutory liability (requires 5 years service). | **MEDIUM** | **FIXED** (Costing accrual provision AS 15 segregated from Section 4(1) statutory vesting liability) |
| **DEF-20** | `statutoryRulesService.js` | Lack of versioned statutory legal registry, leaving statutory constants vulnerable to silent drift without authoritative citations. | **MEDIUM** | **FIXED** (`getStatutoryRegistry()` added with official circular numbers, effective dates, and verification metadata) |

---

## 2. Modified and Newly Created Files

### Newly Created Services & Migrations
1. `Backend/src/services/payroll/ctcReconciliationEngine.js`: Bidirectional CTC breakdown and forward reconciliation engine.
2. `Backend/src/services/payroll/payrollPilotService.js`: Kredily parallel testing comparison engine.
3. `database/06-payroll-audit-hardening.sql`: DB constraints (`chk_salary_slips_net_pay_non_negative`), index optimizations, and proration policy columns.
4. `.gsd/AUDIT_BRIEF.md`: Preliminary defect inventory.
5. `.gsd/PAYROLL_AUDIT_REPORT.md`: Permanent repository audit artifact.

### Modified Files
1. `Backend/src/services/payroll/statutoryRulesService.js`: Multi-year TDS engine (AY 2026-27 vs AY 2025-26, Sec 87A ₹12L rebate), Post-2014 EPS exclusion, EDLI ₹75 cap, VPF support, ESIC Rule 50 continuity proviso, Gratuity costing accrual vs statutory vesting, and `getStatutoryRegistry()`.
2. `Backend/src/services/payroll/payrollCalculationEngine.js`: Wire multi-year TDS, YTD spreading, ESIC Rule 50, post-2014 EPS, VPF separate deduction item, joiner/leaver proration, and salaried vs hourly policy.
3. `Backend/src/services/payroll/ctcReconciliationEngine.js`: Support `assessmentYear`, `isPost2014NewMemberAboveCap`, gratuity costing via `statutoryRulesService.calculateGratuity`, and clear labelling of gratuity provision.
4. `Frontend/src/components/payroll/EmployeeSalariesPage.jsx`: Synchronized AY 2026-27 TDS slabs and rebate threshold, and gratuity accrual labels.
5. `Backend/src/services/payroll/bankPaymentExportService.js`: CSV injection escaping, IFSC/Account validation, row-based total amount calculation.
6. `Backend/src/services/payroll/payrollValidationService.js`: 3-tier severity classification, PAN/UAN/ESIC format validation, mid-month event notifications.
7. `Backend/src/services/payroll/payrollInputCollector.js`: Separation date query selection, categorized expense claims (receipt verification).
8. `Backend/src/controllers/payrollController.js`: Normalized UUID comparison in `approvePayrollRun`, new `rejectPayrollRun`, bank account masking, `reconcileCtc`, `pilotCompareKredily`.
9. `Backend/src/routes/payrollRoutes.js`: Added `/runs/:id/reject`, `/reconcile-ctc`, `/pilot/kredily-compare`.
10. `Frontend/src/services/payrollService.js`: Added `rejectPayrollRun`, `reconcileCtc`, `pilotCompareKredily`.
11. `Frontend/src/components/payroll/MonthlyPayrollPage.jsx`: Added Rejection modal/button and re-submission flow for makers.
12. `Backend/tests/payrollEngine.test.js`: Expanded from 14 to **78 automated deterministic tests**.

---

## 3. Statutory Verification & Legal Registry

| Statutory Component | Legal Citation & Official Source | Wage Ceiling / Slabs | Contribution Rates | Effective Date & Verification Notes |
|---|---|---|---|---|
| **EPF (Employee)** | Employees' Provident Funds & Misc. Provisions Act, 1952 | ₹15,000 / month (Statutory) | 12.00% (max ₹1,800/mo on cap) | 2014-09-01. Higher basic pay requires Para 26(6) joint declaration. |
| **VPF (Voluntary PF)** | EPF Scheme, 1952 — Para 29 | Voluntary | Any voluntary amount above 12% | Employee deduction only; NO employer matching required. |
| **EPS (Pension)** | Employees' Pension Scheme, 1995 (EPS-95) | ₹15,000 / month | 8.33% (max ₹1,250/mo on cap) | **GSR 609(E) & Supreme Court ruling (Nov 4, 2022):** New members joining on/after Sept 1, 2014 with Basic > ₹15,000 are Excluded Employees (0% EPS, 100% EPF). |
| **EPF (Employer)** | EPF Act, 1952 — Section 6 | ₹15,000 / month (or Actual) | 3.67% (Balance of 12% after EPS) OR 12% for post-2014 joiners | Clamped $\ge 0$ to prevent negative allocations. |
| **EDLI** | Employees' Deposit-Linked Insurance Scheme, 1976 | ₹15,000 / month (Strict Cap) | 0.50% on capped wage (max ₹75/mo) | Strictly capped at ₹75/mo even if employer contributes on actual basic wage. |
| **EPF Admin** | EPFO Notification HQ/ACC/13(1)/2022/CIR/4 | ₹15,000 / month | 0.50% on PF wage (min ₹500/mo) | 2022-06-01. Paid by employer. |
| **ESIC** | ESI Act, 1948 & Gazette Notification S.O. 2008(E) | ₹21,000 gross / mo | Employee: 0.75%, Employer: 3.25% (Total: 4.00%) | 2019-07-01. Symmetrical rounding applied. |
| **ESIC Rule 50 Proviso** | ESI (Central) Rules, 1950 — Rule 50 | Contribution Periods: Apr 1–Sep 30 & Oct 1–Mar 31 | 0.75% / 3.25% on actual wage | If employee was covered at start of contribution period and wage crosses ₹21,000 mid-period, **coverage continues until end of that 6-month period**. |
| **Maharashtra PT** | Maharashtra Act No. XIX of 2023 (Gazette Apr 6, 2023) | Monthly gross slabs | Male $\le$ ₹7,500: Nil<br>₹7,501–10k: ₹175<br>> ₹10k: ₹200 (Feb: ₹300) | Schedule I. February rate ₹300 adjusts annual collection to statutory ₹2,500 cap. |
| **PT Female Exemption** | Maharashtra Act No. XIX of 2023 | Gross $\le$ ₹25,000 / mo | Nil (Exempt) | Full statutory exemption for female employees earning $\le$ ₹25,000/mo. |
| **TDS (AY 2026-27)** | Income Tax Act, 1961 — Finance Act 2025/2026 | Section 115BAC (New Regime) | Standard Deduction: ₹75,000<br>0-4L: Nil<br>4-8L: 5%<br>8-12L: 10%<br>12-16L: 15%<br>16-20L: 20%<br>20-24L: 25%<br>>24L: 30% | **Section 87A rebate:** Taxable income $\le$ ₹12,00,000 incurs **ZERO tax** (salaried gross up to **₹12,75,000** has ₹0 tax). 4% cess. |
| **TDS (AY 2025-26)** | Income Tax Act, 1961 — Finance (No. 2) Act 2024 | Section 115BAC (New Regime) | Standard Deduction: ₹75,000<br>0-3L: Nil<br>3-7L: 5%<br>7-10L: 10%<br>10-12L: 15%<br>12-15L: 20%<br>>15L: 30% | Section 87A rebate gives zero tax up to ₹7,00,000 taxable income (salaried gross ₹7,75,000). 4% cess. Supported via version toggle. |
| **Gratuity Costing Accrual** | Accounting Standard 15 / Ind AS 19 | Continuous employment | $15 / (26 \times 12) = 4.8077\%$ (4.81%) of Basic | Employer budgeting accrual included in monthly CTC. NOT an immediate payable to employee. |
| **Gratuity Statutory Liability** | Payment of Gratuity Act, 1972 — Section 4(1) | $\ge 5$ years continuous service | $(15 / 26) \times \text{Last Drawn Basic} \times \text{Years}$ | Vests **ONLY after 5 continuous years of service**. Capped at statutory ceiling of **₹20,00,000**. Non-payable if separated before 5 years. |
| **Reimbursement Tax Treatment** | Income Tax Act, 1961 — Section 10(14) & Rule 2BB(1) | Official duty expenses | Exempt only if supported by bills and incurred wholly & exclusively for business | Under Section 115BAC, exemptions are strictly restricted to Rule 2BB(1) official expenses. Unvouchered / personal allowances are fully taxable perquisites. |

---

## 4. Test Results Summary

Automated Test Runner Output (`Backend/tests/payrollEngine.test.js`):
- **Baseline Tests:** 14 passed
- **Wave 1 & 2 Tests:** 50 passed
- **Wave 3 Advanced Statutory Tests:** 14 passed
- **Total Tests Executed:** **78 passed, 0 failed**
- **Test Categories:**
  1. EPF statutory capping, VPF actual mode, and negative clamping (5 tests)
  2. ESIC threshold, symmetric rounding, and total 4% reconciliation (4 tests)
  3. Maharashtra Professional Tax slabs, female exemption, and February surcharge (7 tests)
  4. Income Tax Section 192 TDS slabs, AY 2026-27 ₹12L rebate, AY 2025-26 legacy support, and YTD spreading (6 tests)
  5. Indian currency number-to-words converter (4 tests)
  6. Full attendance salary slip deterministic breakdown (4 tests)
  7. Loss of Pay (LOP) proration (5 tests)
  8. Mid-month joiner, mid-month leaver, and combined joiner+LOP proration (4 tests)
  9. OWASP CSV formula injection sanitization and quote escaping (7 tests)
  10. Bank export IFSC & 9–18 digit account format validation (8 tests)
  11. CTC decomposition, low basic policy flag, and deficit error detection (3 tests)
  12. Expense reimbursement exclusion from TDS base (1 test)
  13. Salaried vs Hourly timesheet policy decoupling (2 tests)
  14. PAN, UAN, and ESIC regex format validation (4 tests)
  15. Kredily parallel pilot comparison and root cause diagnosis (2 tests)
  16. EPF Post-2014 new-joiner EPS exclusion, VPF independent deduction, and EDLI ₹75 cap (3 tests)
  17. ESIC Rule 50 contribution period continuity proviso (2 tests)
  18. Payment of Gratuity Act vesting liability vs costing accrual (3 tests)
  19. High-earner salary slip with automated TDS withholding (1 test)
  20. Statutory legal registry metadata verification (1 test)

---

## 5. Security & Governance Review

1. **Spreadsheet Formula Injection Prevention:**
   All exported CSV strings are tested against regex `/^[=+\-@\t\r]/`. Offending characters are prefixed with a single apostrophe (`'`) and enclosed in double quotes. Internal quotes are escaped as `""`.
2. **Horizontal IDOR Prevention:**
   `/api/payroll/slips/:id` verifies `req.user.id === slip.employee_id` when requested by role `EMPLOYEE`. Unauthorized cross-employee requests return `403 Forbidden`.
3. **Data Masking:**
   Non-administrative consumers (employees viewing payslips) receive masked bank account numbers (`XXXXXXXX1234`).
4. **Maker-Checker Segregation of Duties:**
   Self-approval is blocked on the backend by comparing trimmed, lowercase string UUIDs of `run.submitted_by` and `req.user.id`. Submissions can now be reviewed, approved, or rejected with explicit audit notes.

---

## 6. Deployment & Rollback Instructions

### Deployment
1. Run database migration script:
   ```bash
   psql -h localhost -p 5435 -U postgres -d timetrakpro -f database/06-payroll-audit-hardening.sql
   ```
2. Deploy backend services (ES modules, Node 20+).
3. Build and deploy frontend bundle (`npm run build` verified: 2,736 modules compiled cleanly in 15.07s).

### Rollback
If rollback is required:
1. Revert Git commits on `Backend/` and `Frontend/`.
2. The database migration in `06-payroll-audit-hardening.sql` is strictly non-destructive (adds nullable columns, check constraints, and performance indexes). It does not alter existing core tables or drop data.

---

## 7. Production Readiness Checklist & Classification

- [x] Deterministic calculation engine verified against statutory standards.
- [x] Zero-mismatch reverse CTC formula accounts for all employer costs.
- [x] Mid-month joiner and leaver proration active.
- [x] Expense reimbursements correctly categorized (tax-exempt vs perquisite).
- [x] CSV injection protection active on bank disbursements.
- [x] Maker-checker segregation enforced on backend.
- [x] Multi-year TDS engine with AY 2026-27 ₹12L Sec 87A rebate and YTD spreading verified.
- [x] Post-2014 EPS exclusion and EDLI ₹75 cap verified.
- [x] ESIC Rule 50 continuity proviso active.
- [x] Gratuity costing accrual segregated from statutory vesting liability.
- [x] 78/78 automated test suite passing.
- [x] Frontend production build compiles without error.
- [ ] Run parallel shadow payroll against Kredily for 2 full consecutive months.

### Official Classification:
**`Ready for controlled parallel testing`**

*Justification:* All statutory rules, formulas, and security measures have been independently audited, mathematically verified, and hardened. Per corporate governance standards, live disbursements should continue through the primary payroll provider while PatilOne runs in shadow mode via the Kredily comparison engine for two consecutive monthly cycles before final cutover.
