# Payroll Audit Brief — PatilOne / Shende Industries

## Baseline Test Results (2026-10-28)
- payrollEngine.test.js: 14/14 PASS
- payrollApi.test.js: Integration tests (require running server)

## Key Files
- Backend/src/services/payroll/payrollCalculationEngine.js
- Backend/src/services/payroll/statutoryRulesService.js
- Backend/src/services/payroll/payrollInputCollector.js
- Backend/src/services/payroll/payrollValidationService.js
- Backend/src/services/payroll/bankPaymentExportService.js
- Backend/src/services/payroll/payrollMockData.js
- Backend/src/controllers/payrollController.js
- Backend/src/routes/payrollRoutes.js
- Backend/tests/payrollEngine.test.js
- Backend/tests/payrollApi.test.js
- database/03-payroll-schema.sql
- Frontend/src/components/payroll/MonthlyPayrollPage.jsx
- Frontend/src/components/payroll/PayrollDashboard.jsx
- Frontend/src/components/payroll/EmployeeSalariesPage.jsx
- Frontend/src/components/payroll/SalaryStructuresPage.jsx
- Frontend/src/components/payroll/StatutoryReportsPage.jsx
- Frontend/src/components/payroll/EmployeePayslipsPage.jsx
- Frontend/src/components/payroll/PayslipModal.jsx
- Frontend/src/services/payrollService.js

## Defects & Gaps Identified (Pre-Audit)

### Critical Priority
1. **CTC Frontend/Backend Formula Duplication**: `computeCtcBreakup()` is copy-pasted in `EmployeeSalariesPage.jsx` (client-side) and also in `payrollController.js` (server-side). They can diverge silently.
2. **CSV Injection Risk in bankPaymentExportService.js**: Employee names and narrations are not sanitized against spreadsheet formula injection characters (`=`, `+`, `-`, `@`).
3. **Frontend CTC formula does not match backend exactly**: `EmployeeSalariesPage.jsx` line 62 uses a slightly different TDS slab calculation than `statutoryRulesService.js`.
4. **Statutory rule versions not enforced in calculations**: `statutoryRulesService.js` has `getConfig()` from DB but the actual `calculateEPF/ESIC/PT/TDS` methods use hardcoded rates, NOT the DB config. The DB versioned configs are never actually read during calculation.
5. **Negative EPF employer contribution possible**: `employerEPF = Math.round(pfWage * 0.12) - employerEPS` can be negative if EPS rounding rounds up past the employer total.
6. **No REJECTED status in payroll lifecycle**: The workflow only supports DRAFT→SUBMITTED→APPROVED→FINALIZED→PAID. There is no REJECTED state, meaning an approver cannot reject a run for correction without cancelling.
7. **Employee ESIC deduction uses Math.ceil but employer uses Math.round**: Asymmetric rounding breaks the statutory 4% total.
8. **payrollController.js approvePayrollRun**: The maker-checker check `run.submitted_by === req.user?.id` uses string UUIDs from different sources—one from DB (`UUID`), one from JWT payload—which may be different formats, silently allowing self-approval.
9. **No PF wage ceiling validation**: `pfCeilingMode = '25000'` is not a legal EPF ceiling per statute. Only ₹15,000 is the legal statutory cap (EPFO circular). ₹25,000 would need VPF (Voluntary PF) treatment, not EPF ceiling change.
10. **Timesheet hours reduce payment days**: `payrollInputCollector.js` passes `timesheetDays` but the engine doesn't use it for deduction—however the frontend display implies hours affect pay, which is misleading for salaried employees.
11. **Missing IFSC validation in bank export**: Bank export CSV does not validate IFSC format (11 chars, first 4 alpha, 5th '0', last 6 alphanumeric).
12. **No rate-limiting on payroll endpoints**: Sensitive salary endpoints have no rate limiting.
13. **Reimbursements classified as always non-taxable**: All expense reimbursements are added as non-taxable earnings without category-based tax treatment.
14. **No data masking**: Bank account numbers returned in full in API responses (no masking for non-admin roles).
15. **Missing February PT test for female employees above ₹25k**: Edge case not covered.
16. **TDS calculation ignores Year-to-Date**: Monthly TDS is always 1/12 of annual estimate, ignoring tax already deducted in earlier months of the same FY.
17. **No CANCELLED→DRAFT re-entry path**: A cancelled payroll has no recovery path.

### High Priority
18. **No joining/exit date proration**: Mid-month joiners and leavers receive full month pay.
19. **Duplicate payroll run check only on DRAFT/CANCELLED**: A SUBMITTED or higher run blocks new runs but provides no re-run path.
20. **bankPaymentExportService.js total amount calculation is wrong**: `totalAmount` includes slips with `rounded_net_pay` from a different query, not re-summed from the generated rows.

### Medium Priority
21. Missing test coverage for: CSV injection, IDOR, mid-month joining, February PT female, YTD TDS
22. StatutoryReportsPage: No actual ECR download format (just screen display)
23. No gratuity provision in the calculation engine (only in CTC breakup reverse engine)
