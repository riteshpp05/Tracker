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
