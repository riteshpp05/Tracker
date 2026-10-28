---
phase: "C"
plan: 1
wave: 2
depends_on: ["A"]
files_modified:
  - "Backend/src/services/payroll/bankPaymentExportService.js"
  - "Backend/src/controllers/payrollController.js"
  - "Backend/src/routes/payrollRoutes.js"
  - "Backend/src/middleware/payrollValidationMiddleware.js"
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Bank export CSV rejects or flags records with malformed IFSC codes or invalid account number lengths"
    - "Bank account numbers in API responses are masked to the last 4 digits for all non-ADMIN roles"
    - "Payroll write endpoints validate month (1-12), year (2000-2100), and UUID route parameters"
    - "Rate-limiting architecture recommendations and TODOs are documented on sensitive calculation and export routes"
  artifacts:
    - "Backend/src/services/payroll/bankPaymentExportService.js"
    - "Backend/src/controllers/payrollController.js"
    - "Backend/src/routes/payrollRoutes.js"
    - "Backend/src/middleware/payrollValidationMiddleware.js"
---

# Plan C.1: Security & Data Integrity (Banking Validation, Masking & Middleware)

<objective>
Strengthen data integrity and security posture for sensitive payroll operations:
1. Enforce strict Indian banking validation (IFSC structure, account number length/digits) in `bankPaymentExportService.js`.
2. Implement role-based data masking so that sensitive bank account numbers are masked (`••••••••1234`) for non-ADMIN users.
3. Introduce input validation middleware for payroll endpoints and document rate-limiting requirements.

Purpose: Prevent rejected NEFT/RTGS batch transfers due to faulty account numbers/IFSC codes, protect employee financial privacy against unauthorized snooping, and shield backend endpoints against invalid or malicious payloads.
Output: Enhanced `bankPaymentExportService.js`, updated `payrollController.js`, new `payrollValidationMiddleware.js`, and documented `payrollRoutes.js`.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .gsd/AUDIT_BRIEF.md
- Backend/src/services/payroll/bankPaymentExportService.js
- Backend/src/controllers/payrollController.js
- Backend/src/routes/payrollRoutes.js
</context>

<tasks>

<task type="auto">
  <name>Enhance IFSC & bank account validation in bankPaymentExportService.js</name>
  <files>Backend/src/services/payroll/bankPaymentExportService.js</files>
  <action>
    In `Backend/src/services/payroll/bankPaymentExportService.js`:
    1. Verify and strengthen `validateIFSC(ifsc)`:
       - Match strictly against `/^[A-Z]{4}0[A-Z0-9]{6}$/`. First 4 alphabetic characters (bank code), 5th character '0', last 6 alphanumeric characters (branch code). Exactly 11 characters.
       - Return `{ valid: true }` or `{ valid: false, error: string }`.
    2. Verify and strengthen `validateAccountNumber(accountNo)`:
       - Match strictly against `/^\d{9,18}$/`. Indian bank account numbers must be 9 to 18 numeric digits with no spaces or symbols.
       - Return `{ valid: true }` or `{ valid: false, error: string }`.
    3. In `generateBankPaymentCSV(run, slips)`:
       - Record `validationWarnings` array for any slip failing IFSC or account number validation.
       - Add a summary property `hasValidationErrors: validationWarnings.length > 0`.
       - Ensure `totalAmount` only sums valid export rows to prevent balance mismatches with bank batch uploads.
    AVOID: Permitting silent export of invalid bank details which could result in batch rejection by corporate banking portals.
  </action>
  <verify>node -e "import('./Backend/src/services/payroll/bankPaymentExportService.js').then(m => { const v1 = m.default.validateIFSC('HDFC0000123'); const v2 = m.default.validateIFSC('SBIN1234567'); const a1 = m.default.validateAccountNumber('123456789012'); const a2 = m.default.validateAccountNumber('1234'); if (!v1.valid || v2.valid || !a1.valid || a2.valid) process.exit(1); console.log('Banking validation verified'); })"</verify>
  <done>IFSC and bank account validation strictly enforce RBI standards with structured error collection.</done>
</task>

<task type="auto">
  <name>Implement sensitive bank account masking in API responses</name>
  <files>Backend/src/controllers/payrollController.js</files>
  <action>
    In `Backend/src/controllers/payrollController.js`:
    1. Add helper method `maskBankAccount(accountNo, userRole)`:
       - If `userRole === 'ADMIN'`, return the raw `accountNo`.
       - If `accountNo` is missing or empty, return `""`.
       - Otherwise, return masked string: `'••••••••' + String(accountNo).slice(-4)`.
    2. Apply masking to sensitive endpoints:
       - `getSalarySlip`: If `req.user?.role !== 'ADMIN'`, mask `slip.bank_account_no` (and within `calculation_snapshot` if present).
       - `getMySalarySlips`: Mask `bank_account_no` so employees only see last 4 digits.
       - `getAssignments`: When returning assignments list to non-admin roles (e.g. HR viewers without Admin rights), mask `bank_account_no`.
       - `getPayrollRunById`: Mask `bank_account_no` in the slips breakdown array unless user has `ADMIN` role.
    3. Ensure `exportBankPaymentFile` continues to supply unmasked account numbers to the bank export service, since the bank requires full account numbers for fund transfers.
    AVOID: Masking data during file export or masking PAN/IFSC when only account number masking is requested.
  </action>
  <verify>node -e "import('./Backend/src/controllers/payrollController.js').then(m => { console.log('payrollController loaded with data masking'); })"</verify>
  <done>Non-admin API responses deliver masked bank account numbers with last 4 digits visible.</done>
</task>

<task type="auto">
  <name>Create payroll input validation middleware & document rate limiting</name>
  <files>Backend/src/middleware/payrollValidationMiddleware.js, Backend/src/routes/payrollRoutes.js</files>
  <action>
    1. Create `Backend/src/middleware/payrollValidationMiddleware.js`:
       - `validatePayrollPeriod(req, res, next)`: Validates that `month` (from query or body) is an integer between 1 and 12, and `year` is an integer between 2000 and 2100. Returns 400 with descriptive error if invalid.
       - `validateUUIDParam(paramName)`: Middleware factory validating that `req.params[paramName]` matches standard UUID regex `/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/` or mock ID format.
       - `validateAssignmentInput(req, res, next)`: Validates `base_monthly_salary` is a positive number.
    2. In `Backend/src/routes/payrollRoutes.js`:
       - Import and attach `validatePayrollPeriod` to `/readiness`, `/runs/draft`, `/reports/statutory`.
       - Attach `validateUUIDParam('id')` to `/runs/:id/submit`, `/runs/:id/approve`, `/runs/:id/reject`, `/runs/:id/finalize`, `/runs/:id/bank-export`.
       - Add documented architectural security comments / TODOs regarding rate-limiting:
         ```javascript
         // SECURITY RECOMMENDATION (Audit Finding #12):
         // Sensitive calculation and export endpoints (/runs/draft, /runs/:id/bank-export)
         // should be protected by express-rate-limit:
         // - Draft Calculation: Max 10 requests per 15 minutes per IP/User to prevent CPU exhaustion.
         // - Bank Export: Max 20 requests per hour per User to throttle bulk data extraction.
         // Note: External dependency express-rate-limit requires architectural sign-off before installation.
         ```
    AVOID: Installing unapproved third-party packages; implement input validation natively using standard Express middleware.
  </action>
  <verify>node -e "import('./Backend/src/middleware/payrollValidationMiddleware.js').then(m => { if (typeof m.validatePayrollPeriod !== 'function') process.exit(1); console.log('Validation middleware verified'); })"</verify>
  <done>Payroll routes validate month, year, and UUID parameters, and rate-limiting requirements are thoroughly documented.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `validateIFSC` and `validateAccountNumber` enforce format specifications.
- [ ] Bank account masking masks to last 4 digits for non-ADMIN users.
- [ ] `payrollValidationMiddleware.js` exists and validates periods and UUID parameters.
- [ ] Rate-limiting security guidance is documented in `payrollRoutes.js`.
</verification>

<success_criteria>
- [ ] All 3 tasks executed and verified
- [ ] Zero overlap with Plan D files
- [ ] Sensitive banking details protected against unauthorized disclosure
- [ ] Input validation blocks malformed requests before controller execution
</success_criteria>
