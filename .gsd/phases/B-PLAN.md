---
phase: "B"
plan: 1
wave: 1
depends_on: []
files_modified:
  - "Backend/src/services/payroll/statutoryRulesService.js"
  - "Backend/src/services/payroll/payrollCalculationEngine.js"
  - "Backend/src/services/payroll/payrollInputCollector.js"
  - "Frontend/src/components/payroll/EmployeeSalariesPage.jsx"
  - "Frontend/src/components/payroll/PayrollDashboard.jsx"
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Statutory rules engine supports loading versioned configs from DB with graceful fallback to statutory defaults"
    - "ESIC employee deduction uses Math.round instead of Math.ceil, guaranteeing symmetric rounding with employer share"
    - "Employer EPF cannot be negative under any wage or EPS rounding scenario"
    - "Mid-month joiners and leavers have their payable days and earnings prorated based on active calendar days"
    - "₹25,000 PF ceiling is clearly labeled as Voluntary PF (VPF) in both engine output and UI forms"
  artifacts:
    - "Backend/src/services/payroll/statutoryRulesService.js"
    - "Backend/src/services/payroll/payrollCalculationEngine.js"
    - "Backend/src/services/payroll/payrollInputCollector.js"
    - "Frontend/src/components/payroll/EmployeeSalariesPage.jsx"
    - "Frontend/src/components/payroll/PayrollDashboard.jsx"
---

# Plan B.1: Statutory Rules Hardening (DB Configs, Proration & VPF Compliance)

<objective>
Harden the Indian statutory calculation services and attendance collectors:
1. Wire database-versioned statutory configurations into `statutoryRulesService.js` while maintaining synchronous calculation capability and fixing asymmetric ESIC rounding.
2. Implement exact mid-month joiner and leaver calendar proration in `payrollInputCollector.js` and `payrollCalculationEngine.js`.
3. Re-brand the non-statutory ₹25,000 PF limit to "Voluntary PF" (VPF) across calculation flags and UI components to align with EPFO regulations.

Purpose: Eliminate hardcoded statutory calculation drift, ensure mathematically fair ESIC rounding, prorate partial-month tenures accurately, and maintain statutory compliance distinction between mandatory EPF caps and voluntary contributions.
Output: Updated `statutoryRulesService.js`, `payrollCalculationEngine.js`, `payrollInputCollector.js`, `EmployeeSalariesPage.jsx`, and `PayrollDashboard.jsx`.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .gsd/AUDIT_BRIEF.md
- Backend/src/services/payroll/statutoryRulesService.js
- Backend/src/services/payroll/payrollCalculationEngine.js
- Backend/src/services/payroll/payrollInputCollector.js
- Frontend/src/components/payroll/EmployeeSalariesPage.jsx
</context>

<tasks>

<task type="auto">
  <name>Wire DB configs & harden statutory calculations in statutoryRulesService.js</name>
  <files>Backend/src/services/payroll/statutoryRulesService.js</files>
  <action>
    Modify `Backend/src/services/payroll/statutoryRulesService.js`:
    1. Support DB Config Integration:
       - Maintain an in-memory cached config map (`_configCache = {}`) and a helper `async loadActiveConfigs()` that populates cached configs from `payroll_statutory_configs`.
       - Update `calculateEPF`, `calculateESIC`, `calculateProfessionalTax`, `calculateTDS` to check for and apply custom rates/slabs/ceilings from `customConfig` (or cached config) when present, falling back to official statutory constants.
    2. Fix Asymmetric ESIC Rounding:
       - Change `employeeESIC`: change `Math.ceil(gross * 0.0075)` to `Math.round(gross * 0.0075)`.
       - Keep `employerESIC` as `Math.round(gross * 0.0325)`.
       - Set `totalESIC = employeeESIC + employerESIC`.
    3. Ensure Negative EPF Protection:
       - Ensure `employerEPF = Math.max(0, Math.round(pfWage * 0.12) - employerEPS)`.
    4. Compliance Flag for ₹25,000 Ceiling:
       - When `pfCeilingMode === '25000'` or `pfCeilingMode === 'VPF_25000'`: set `isStatutoryCap: false`, `isVPF: true`, and `complianceNote: "₹25,000 limit is a Voluntary PF (VPF) structure; statutory EPF limit is ₹15,000"`.
       - When `pfCeilingMode === '15000'`: set `isStatutoryCap: true`, `isVPF: false`.
    AVOID: Breaking existing synchronous calls from unit tests or controllers by converting calculation methods to async-only; use optional config parameters or synchronous fallbacks.
  </action>
  <verify>node -e "import('./Backend/src/services/payroll/statutoryRulesService.js').then(m => { const esic = m.default.calculateESIC(20000); if (esic.employeeESIC !== 150) process.exit(1); const epf = m.default.calculateEPF(30000, '25000'); if (!epf.isVPF) process.exit(1); console.log('Statutory rules verified:', { esic, epf }); })"</verify>
  <done>ESIC employee deduction uses Math.round, employer EPF is non-negative, and VPF ceiling flags non-statutory status.</done>
</task>

<task type="auto">
  <name>Implement mid-month joiner & leaver proration in engine & input collector</name>
  <files>Backend/src/services/payroll/payrollInputCollector.js, Backend/src/services/payroll/payrollCalculationEngine.js</files>
  <action>
    1. In `Backend/src/services/payroll/payrollInputCollector.js`:
       - In `collectInputs(month, year)`:
         - Compare employee's date of joining (`emp.doj`) and separation date (`emp.separation_date`) against `startDate` (`${year}-${month}-01`) and `endDate` (`${year}-${month}-${lastDay}`).
         - Calculate `effectiveStartDate`: `emp.doj && emp.doj > startDate ? emp.doj : startDate`.
         - Calculate `effectiveEndDate`: `emp.separation_date && emp.separation_date < endDate ? emp.separation_date : endDate`.
         - Calculate `activeCalendarDays`: number of active calendar days between `effectiveStartDate` and `effectiveEndDate` inclusive.
         - Attach `activeCalendarDays`, `isMidMonthJoiner`, `isMidMonthLeaver` to `attendance` packet for each employee.
    2. In `Backend/src/services/payroll/payrollCalculationEngine.js`:
       - In `calculateSalarySlip(params)`:
         - Accept `activeCalendarDays = null` in params.
         - If `activeCalendarDays != null`, effective active days is `Math.min(workingDays, Math.max(0, Number(activeCalendarDays)))`. Otherwise default to `workingDays`.
         - Compute `payableDays = Math.max(0, effectiveActiveDays - lwp)`.
         - Calculate `prorationFactor = workingDays > 0 ? (payableDays / workingDays) : 1`.
         - Record details in line item notes (e.g. `isMidMonthJoiner ? 'Pro-rated for mid-month joining' : ''`).
    AVOID: Charging LOP against days before an employee's hire date or paying full month salary to employees who joined on the 15th or 20th.
  </action>
  <verify>node -e "import('./Backend/src/services/payroll/payrollCalculationEngine.js').then(m => { const slip = m.default.calculateSalarySlip({ employee: { employee_id: '1', first_name: 'Test', last_name: 'User' }, assignment: { base_monthly_salary: 30000 }, totalWorkingDays: 30, activeCalendarDays: 16, lwpDays: 0 }); console.log('Prorated basic:', slip.earnings[0].amount); if (slip.earnings[0].amount !== 16000) process.exit(1); })"</verify>
  <done>Mid-month joiners and leavers are prorated based on active days in the month.</done>
</task>

<task type="auto">
  <name>Rename ₹25,000 ceiling to Voluntary PF (VPF) in UI components</name>
  <files>Frontend/src/components/payroll/EmployeeSalariesPage.jsx, Frontend/src/components/payroll/PayrollDashboard.jsx</files>
  <action>
    1. In `Frontend/src/components/payroll/EmployeeSalariesPage.jsx`:
       - In the PF ceiling mode selector/dropdown:
         - Update option value `25000` text to: `"₹25,000 — Voluntary PF (VPF) [Non-statutory]"`.
         - Update option value `15000` text to: `"₹15,000 — Statutory EPFO Cap"`.
         - Update option value `ACTUAL` text to: `"Actual Basic — Full Wage (Voluntary Opt-in)"`.
       - Add a helper badge or hint text below the selector:
         `"Statutory EPF ceiling is ₹15,000/month under EPFO rules. Amounts above ₹15,000 are treated as Voluntary Provident Fund (VPF)."`
    2. In `Frontend/src/components/payroll/PayrollDashboard.jsx`:
       - Update any modal or quick settings option referencing `25000` to reflect `"₹25,000 (Voluntary PF / VPF)"`.
    AVOID: Misleading payroll administrators into believing ₹25,000 is an official statutory mandate.
  </action>
  <verify>node -e "import fs from 'fs'; const content = fs.readFileSync('./Frontend/src/components/payroll/EmployeeSalariesPage.jsx', 'utf8'); if (!content.includes('Voluntary PF')) process.exit(1); console.log('VPF label present in EmployeeSalariesPage');"</verify>
  <done>Frontend UI displays accurate statutory vs voluntary PF labels with compliance guidance.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `calculateESIC` in `statutoryRulesService.js` returns `Math.round(gross * 0.0075)` for employee contribution.
- [ ] `calculateEPF` returns `isVPF: true` when `pfCeilingMode` is `25000`.
- [ ] `calculateSalarySlip` accurately prorates basic pay when `activeCalendarDays < totalWorkingDays`.
- [ ] `payrollInputCollector.js` calculates `activeCalendarDays` based on employee `doj` and `separation_date`.
- [ ] `EmployeeSalariesPage.jsx` contains the "Voluntary PF (VPF)" option and statutory distinction note.
</verification>

<success_criteria>
- [ ] All 3 tasks executed and verified
- [ ] Zero overlap with Plan A files
- [ ] Mid-month joiner/leaver proration functioning deterministically
- [ ] VPF compliance clear in calculations and UI
</success_criteria>
