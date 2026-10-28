---
phase: "D"
plan: 1
wave: 2
depends_on: ["A", "B"]
files_modified:
  - "Backend/tests/payrollEngine.test.js"
  - "Backend/tests/payrollSecurity.test.js"
autonomous: true
user_setup: []

must_haves:
  truths:
    - "payrollEngine.test.js tests mid-month joiner and leaver proration with exact payment day calculations"
    - "payrollEngine.test.js verifies February PT for females above ₹25k and female exemption <= ₹25k"
    - "payrollEngine.test.js proves ESIC employee + employer sum equals exactly 4% of gross pay"
    - "payrollEngine.test.js proves employer EPF is never negative"
    - "payrollEngine.test.js verifies approved expense reimbursements are included in gross but excluded from PF and ESIC wage bases"
    - "payrollSecurity.test.js verifies CSV injection prevention, maker-checker self-approval blocking, IDOR isolation, and bank account masking"
  artifacts:
    - "Backend/tests/payrollEngine.test.js"
    - "Backend/tests/payrollSecurity.test.js"
---

# Plan D.1: Comprehensive Test Suite (Statutory Edge Cases, Proration & Security Tests)

<objective>
Expand the PatilOne automated payroll test suite to provide rigorous regression coverage across Indian statutory rules, calendar proration, and security controls:
1. Extend `payrollEngine.test.js` with deterministic tests for mid-month joiners, leavers, February female PT, ESIC symmetric rounding, negative EPF immunity, and reimbursement wage base isolation.
2. Create `payrollSecurity.test.js` covering CSV formula injection prevention, maker-checker self-approval rejection, IDOR access protection, and role-based bank account masking without requiring a running database server.

Purpose: Provide empirical proof that all statutory edge cases, proration rules, and security fixes behave according to specification and prevent silent regressions.
Output: Expanded `Backend/tests/payrollEngine.test.js` and newly authored `Backend/tests/payrollSecurity.test.js`.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .gsd/AUDIT_BRIEF.md
- Backend/tests/payrollEngine.test.js
- Backend/src/services/payroll/payrollCalculationEngine.js
- Backend/src/services/payroll/statutoryRulesService.js
- Backend/src/services/payroll/bankPaymentExportService.js
</context>

<tasks>

<task type="auto">
  <name>Expand payrollEngine.test.js with statutory edge cases, proration & reimbursement tests</name>
  <files>Backend/tests/payrollEngine.test.js</files>
  <action>
    Add dedicated test blocks to `Backend/tests/payrollEngine.test.js`:
    1. Mid-Month Joiner Proration:
       - Employee joined on the 15th of a 30-day month (active calendar days = 16: 15th to 30th inclusive).
       - Assert `paymentDays === 16` and `proratedBasic === Math.round(50000 * 16 / 30) === 26667`.
    2. Mid-Month Leaver Proration:
       - Employee separated on the 10th of a 30-day month (active calendar days = 10).
       - Assert `paymentDays === 10` and `proratedBasic === Math.round(50000 * 10 / 30) === 16667`.
    3. Maharashtra PT Edge Cases:
       - Female employee with gross ₹28,000 in February: Assert PT is ₹300 (above ₹25,000 threshold, February surcharge applies).
       - Female employee with gross ₹24,000 in February: Assert PT is ₹0 (exempt under ₹25,000 ceiling).
       - Female employee with gross ₹24,000 in January: Assert PT is ₹0.
    4. ESIC Rounding Consistency:
       - Test gross salary of ₹15,555:
         - `employeeESIC = Math.round(15555 * 0.0075) = 117`
         - `employerESIC = Math.round(15555 * 0.0325) = 506`
         - Assert `employeeESIC + employerESIC === Math.round(15555 * 0.04) === 622` (or within 1 rupee due to integer rounding, but employee must use `Math.round`, NOT `Math.ceil`).
    5. Negative EPF Prevention:
       - Test basic wage boundaries (e.g. ₹100, ₹1,000, ₹15,000, ₹25,000) asserting that `employerEPF >= 0` and `employerEPS + employerEPF <= Math.round(pfWage * 0.12)`.
    6. Reimbursement Wage Base Isolation:
       - Test slip with Basic ₹30,000 and Reimbursement ₹15,000:
       - Assert `grossPay === 45000 + allowances`.
       - Assert `epfBreakdown.pfWage === 15000` (reimbursement NOT included in PF wage base).
       - Assert ESIC eligibility checks exclude reimbursements or gross pay exceeds ESIC threshold.
    AVOID: Modifying any existing 14 tests; append new test blocks so total test count grows cleanly.
  </action>
  <verify>node Backend/tests/payrollEngine.test.js</verify>
  <done>All statutory edge cases, proration calculations, and rounding tests execute and pass cleanly.</done>
</task>

<task type="auto">
  <name>Author payrollSecurity.test.js for CSV injection, maker-checker & IDOR protection</name>
  <files>Backend/tests/payrollSecurity.test.js</files>
  <action>
    Create `Backend/tests/payrollSecurity.test.js` using Node's native `assert` module:
    1. CSV Formula Injection Prevention:
       - Test `bankPaymentExportService.sanitiseField`:
         - Strings starting with `=`: `=SUM(A1:B10)` -> `"\"'=SUM(A1:B10)\""`
         - Strings starting with `+`: `+12345678` -> `"\"'+12345678\""`
         - Strings starting with `-`: `-12345678` -> `"\"'-12345678\""`
         - Strings starting with `@`: `@HYPERLINK(...)` -> `"\"'@HYPERLINK(...)\""`
         - Strings starting with `\t` (Tab) and `\r` (Carriage return)
         - Plain safe strings: `SH-001` -> `"\"SH-001\""`
       - Test `generateBankPaymentCSV`: Include an employee whose name or code starts with `=MALICIOUS` and assert that the CSV row outputs `"'=MALICIOUS"`.
    2. Maker-Checker Self-Approval Prevention Logic:
       - Simulate `isMaker` check with varying UUID representations:
         - Identical UUIDs: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` vs `a1b2c3d4-e5f6-7890-abcd-ef1234567890` -> Blocked (403)
         - Case differences: `A1B2C3D4-...` vs `a1b2c3d4-...` -> Blocked (403)
         - Surrounding whitespace: `  a1b2c3d4-...  ` vs `a1b2c3d4-...` -> Blocked (403)
         - Distinct submitter and approver -> Allowed (proceeds to approval)
         - Admin role -> Allowed regardless of maker status.
    3. IDOR Payslip Access Prevention Logic:
       - Non-admin employee with `req.user.id = 'emp-001'` accessing slip where `slip.employee_id = 'emp-002'` -> Assert returns 403 Forbidden.
       - Employee accessing own slip (`emp-001` === `emp-001`) -> Assert allowed.
       - Admin accessing any slip -> Assert allowed.
    4. Sensitive Bank Account Data Masking:
       - Account number `50100123456789`:
         - Role `EMPLOYEE` -> Returns `••••••••6789`
         - Role `HR` -> Returns `••••••••6789`
         - Role `ADMIN` -> Returns full `50100123456789`
    AVOID: Relying on database connections; use isolated unit testing with mocks.
  </action>
  <verify>node Backend/tests/payrollSecurity.test.js</verify>
  <done>Security test suite runs with 100% passing assertions across CSV sanitization, maker-checker, IDOR, and data masking.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `node Backend/tests/payrollEngine.test.js` passes with all edge case tests.
- [ ] `node Backend/tests/payrollSecurity.test.js` passes with all security assertions.
- [ ] Mid-month joiner and leaver payment day formulas match hand-calculated benchmarks.
- [ ] CSV injection triggers are verified to be rendered inert with apostrophe prefix.
</verification>

<success_criteria>
- [ ] Both test suites pass with 0 errors
- [ ] Zero overlap with Plan C files
- [ ] Empirical proof captured for all audit requirements
</success_criteria>
