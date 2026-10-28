---
phase: "A"
plan: 1
wave: 1
depends_on: []
files_modified:
  - "Backend/src/services/payroll/bankPaymentExportService.js"
  - "Backend/src/controllers/payrollController.js"
  - "Backend/src/routes/payrollRoutes.js"
  - "database/04-add-rejected-status.sql"
  - "Frontend/src/services/payrollService.js"
  - "Frontend/src/components/payroll/MonthlyPayrollPage.jsx"
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Bank export CSV sanitizes formula injection characters (=, +, -, @, \\t, \\r) across all exported columns"
    - "Maker-checker self-approval prevents submitter from approving even when UUID representations differ in case or whitespace"
    - "Payroll runs can be rejected via POST /runs/:id/reject transitioning status to REJECTED with audit log and rejection note"
    - "Frontend MonthlyPayrollPage displays rejection option during SUBMITTED status and provides clear feedback on REJECTED runs"
  artifacts:
    - "Backend/src/services/payroll/bankPaymentExportService.js"
    - "database/04-add-rejected-status.sql"
    - "Backend/src/controllers/payrollController.js"
    - "Backend/src/routes/payrollRoutes.js"
    - "Frontend/src/services/payrollService.js"
    - "Frontend/src/components/payroll/MonthlyPayrollPage.jsx"
---

# Plan A.1: Critical Safety Fixes (CSV Injection, Maker-Checker & Rejection Workflow)

<objective>
Fix critical security, access control, and workflow defects in the PatilOne payroll system:
1. Secure the bank payment CSV exporter against CSV/formula injection attacks.
2. Fix maker-checker UUID comparison in `approvePayrollRun` to prevent self-approval.
3. Introduce the `REJECTED` state into the payroll lifecycle across database, backend controller, routes, and frontend UI.

Purpose: Prevent remote formula execution in exported payroll spreadsheets and eliminate unauthorized self-approval while allowing approvers to return erroneous payroll runs for correction.
Output: Hardened `bankPaymentExportService.js`, new migration `04-add-rejected-status.sql`, updated `payrollController.js`, `payrollRoutes.js`, `payrollService.js`, and `MonthlyPayrollPage.jsx`.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .gsd/AUDIT_BRIEF.md
- Backend/src/services/payroll/bankPaymentExportService.js
- Backend/src/controllers/payrollController.js
- Backend/src/routes/payrollRoutes.js
- Frontend/src/components/payroll/MonthlyPayrollPage.jsx
</context>

<tasks>

<task type="auto">
  <name>Harden bankPaymentExportService.js against CSV formula injection</name>
  <files>Backend/src/services/payroll/bankPaymentExportService.js</files>
  <action>
    Review and verify `sanitiseField(value)` in `Backend/src/services/payroll/bankPaymentExportService.js`:
    - Ensure any field whose trimmed string representation begins with `=`, `+`, `-`, `@`, `\t`, or `\r` is prefixed with a single quote `'` and wrapped in quotes with internal quotes escaped (`""`).
    - Verify that ALL row fields in `generateBankPaymentCSV` pass through `sanitiseField` (including `employee_code`, `fullName`, `accountNo`, `ifscRaw`, `bank_name`, `narration`, and `email`).
    - Keep numeric net pay unquoted and formatted strictly as a decimal (`netPay.toFixed(2)`).
    - Ensure `totalAmount` is re-computed from valid exported rows to eliminate discrepancies.
    AVOID: Leaving any text field unescaped or relying on unquoted CSV output where leading operators could be evaluated by Excel or Calc.
  </action>
  <verify>node -e "import('./Backend/src/services/payroll/bankPaymentExportService.js').then(m => { const s = m.default.sanitiseField('=CMD'); if (!s.startsWith(\"\"'=\")) process.exit(1); console.log('CSV injection sanitization verified:', s); })"</verify>
  <done>sanitiseField correctly prefixes formula characters with apostrophe and all string fields are sanitized in CSV export.</done>
</task>

<task type="auto">
  <name>Normalize maker-checker UUID check and add REJECTED payroll run API</name>
  <files>database/04-add-rejected-status.sql, Backend/src/controllers/payrollController.js, Backend/src/routes/payrollRoutes.js</files>
  <action>
    1. Create `database/04-add-rejected-status.sql`:
       - Add columns to `payroll_runs` if they do not exist: `rejection_reason TEXT`, `rejected_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL`, `rejected_at TIMESTAMPTZ`.
       - Document `REJECTED` status in the lifecycle comment: 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FINALIZED', 'PAID', 'CANCELLED'.
    2. In `Backend/src/controllers/payrollController.js`:
       - In `approvePayrollRun`: Normalize UUID comparison:
         `const isMaker = String(run.submitted_by || '').trim().toLowerCase() === String(req.user?.id || '').trim().toLowerCase();`
         If `req.user?.role !== "ADMIN" && isMaker`, return 403 Forbidden with "Maker-Checker Separation Violation: You cannot approve a payroll run that you submitted."
       - Implement `rejectPayrollRun(req, res)`:
         - Extract `{ id } = req.params` and `{ rejectionReason } = req.body`.
         - Verify run exists and `run.status === 'SUBMITTED'`. If not, return 400 with "Run must be in SUBMITTED status to reject."
         - Update `payroll_runs`: `status = 'REJECTED'`, `rejection_reason = $1`, `rejected_by = $2`, `rejected_at = CURRENT_TIMESTAMP WHERE id = $3`.
         - Update `salary_slips`: `status = 'REJECTED' WHERE payroll_run_id = $1`.
         - Insert audit log: action `'REJECT_RUN'`, actor `req.user?.id`, changes `{ previousStatus: 'SUBMITTED', newStatus: 'REJECTED', reason: rejectionReason }`.
         - Provide mock fallback when DB is disconnected: update matching mock run status to `'REJECTED'`.
       - In `calculateDraftRun`: Allow recalculating/overwriting a run if its status is `'DRAFT'` OR `'REJECTED'`.
    3. In `Backend/src/routes/payrollRoutes.js`:
       - Add route: `router.post("/runs/:id/reject", authorizeRoles(["ADMIN", "HR"]), payrollController.rejectPayrollRun);`.
    AVOID: Loose equality or unnormalized string comparisons on UUIDs, and avoid leaving rejected runs locked from recalculation.
  </action>
  <verify>node -e "import('./Backend/src/controllers/payrollController.js').then(m => { if (typeof m.default.rejectPayrollRun !== 'function') process.exit(1); console.log('rejectPayrollRun method exists'); })"</verify>
  <done>approvePayrollRun normalizes UUID comparison to prevent self-approval, rejectPayrollRun handles rejection transitions, and route is registered.</done>
</task>

<task type="auto">
  <name>Implement rejection handling and UI controls in MonthlyPayrollPage</name>
  <files>Frontend/src/services/payrollService.js, Frontend/src/components/payroll/MonthlyPayrollPage.jsx</files>
  <action>
    1. In `Frontend/src/services/payrollService.js`:
       - Add `rejectPayrollRun(id, rejectionReason)`: calls `POST /payroll/runs/${id}/reject` with `{ rejectionReason }`.
    2. In `Frontend/src/components/payroll/MonthlyPayrollPage.jsx`:
       - Add state for rejection reason: `const [rejectionReason, setRejectionReason] = useState("");`.
       - Add handler `handleReject`: Calls `payrollService.rejectPayrollRun(runData.run.id, rejectionReason)`, triggers toast alert, and refreshes run data.
       - In step 4 (Reconciliation / Approval banner) when `runData.run.status === "SUBMITTED"`:
         - Render a "Reject Run" button (red outline or solid red) alongside "Approve Run".
         - Allow entering a rejection comment/reason before rejecting.
       - When `runData.run.status === "REJECTED"`:
         - Render a distinct amber/red alert banner showing "This payroll run was REJECTED: {runData.run.rejection_reason}".
         - Provide a "Recalculate / Re-draft Payroll" button calling `handleCalculateDraft` to reset the run to DRAFT for corrections.
    AVOID: Hiding rejection reason from HR users or leaving the UI stranded without a re-draft path.
  </action>
  <verify>node -e "import('./Frontend/src/services/payrollService.js').then(m => { if (typeof m.default.rejectPayrollRun !== 'function') process.exit(1); console.log('Frontend rejectPayrollRun service verified'); })"</verify>
  <done>Frontend MonthlyPayrollPage supports rejecting submitted runs and provides a recalculation path for rejected runs.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `sanitiseField` in `bankPaymentExportService.js` escapes formula triggers `=, +, -, @, \t, \r` with single apostrophe.
- [ ] `database/04-add-rejected-status.sql` exists and documents `rejection_reason` and `rejected_by`.
- [ ] `approvePayrollRun` uses lowercase-trimmed UUID comparison.
- [ ] `POST /runs/:id/reject` route is active in `payrollRoutes.js` and handled in `payrollController.js`.
- [ ] `payrollService.rejectPayrollRun` exists and is connected in `MonthlyPayrollPage.jsx`.
</verification>

<success_criteria>
- [ ] All 3 tasks executed and verified
- [ ] Zero syntax errors across modified files
- [ ] Maker-checker self-approval loop closed
- [ ] REJECTED state fully supported in API and frontend
</success_criteria>
