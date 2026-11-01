// Backend/tests/payrollEngine.test.js
// PatilOne / Shende Industries — Payroll Engine & Statutory Rules Test Suite
// ============================================================================
// Expanded test suite (2026-10-28 audit revision)
// New tests added: ESIC rounding symmetry, EPF negative clamping, CSV injection
// prevention, mid-month joiner/leaver proration, female PT in February,
// female PT above ₹25k, VPF/₹25k compliance flag, ESIC total = 4%.
// ============================================================================

import assert from "node:assert/strict";
import statutoryRulesService from "../src/services/payroll/statutoryRulesService.js";
import payrollEngine from "../src/services/payroll/payrollCalculationEngine.js";
import bankExportService from "../src/services/payroll/bankPaymentExportService.js";
import ctcReconciliationEngine from "../src/services/payroll/ctcReconciliationEngine.js";
import validationService from "../src/services/payroll/payrollValidationService.js";
import pilotService from "../src/services/payroll/payrollPilotService.js";
import * as bulkImportService from "../src/services/payroll/bulkImportService.js";

// Local aliases used in Mode A tests
const statutory  = statutoryRulesService;
const ctcEngine  = ctcReconciliationEngine;

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("🧪 PatilOne Payroll Engine & Statutory Rules Test Suite (v2 — Audit 2026-10-28)\n");

// ═══════════════════════════════════════════════════════════════════
// 1. EPF Statutory Calculations
// ═══════════════════════════════════════════════════════════════════
console.log("▶ EPF Statutory Rules");

test("EPF at statutory ₹15,000 ceiling", () => {
  const epf = statutoryRulesService.calculateEPF(15000, "15000");
  assert.equal(epf.pfWage, 15000);
  assert.equal(epf.employeePF, 1800);   // 12% of 15,000
  assert.equal(epf.employerEPS, 1250);  // 8.33% of 15,000 = 1,249.5 → 1,250
  assert.equal(epf.employerEPF, 550);   // 1,800 − 1,250 = 550
  assert.equal(epf.isCapped, false, "Exactly at ceiling, not capped");
  assert.equal(epf.complianceFlag, null, "No compliance flag on statutory mode");
});

test("EPF capped when basic > ₹15,000 (default statutory mode)", () => {
  const epf = statutoryRulesService.calculateEPF(50000, false);
  assert.equal(epf.pfWage, 15000);
  assert.equal(epf.employeePF, 1800);
  assert.equal(epf.isCapped, true);
});

test("EPF full wage (VPF/ACTUAL mode) — EPS still capped at ₹15,000 wage", () => {
  const epf = statutoryRulesService.calculateEPF(50000, "ACTUAL");
  assert.equal(epf.pfWage, 50000);
  assert.equal(epf.employeePF, 6000);   // 12% of 50,000
  assert.equal(epf.employerEPS, 1250);  // EPS always capped at ₹15,000 wage
  assert.equal(epf.employerEPF, 4750);  // 6,000 − 1,250 = 4,750
  assert.equal(epf.isCapped, false, "ACTUAL mode: not capped");
});

test("EPF employer contribution is NEVER negative (rounding guard)", () => {
  // At very low basic (₹1), rounding could push EPS > employer total
  const epf = statutoryRulesService.calculateEPF(1, "15000");
  assert.ok(epf.employerEPF >= 0, `employerEPF must be >= 0, got ${epf.employerEPF}`);
  assert.ok(epf.totalEmployerPF >= 0, `totalEmployerPF must be >= 0`);
});

test("EPF ₹25,000 mode emits compliance flag (not a legal statutory ceiling)", () => {
  const epf = statutoryRulesService.calculateEPF(30000, "25000");
  assert.equal(epf.pfWage, 25000);
  assert.ok(
    epf.complianceFlag && epf.complianceFlag.includes("[COMPLIANCE_REVIEW_REQUIRED]"),
    "₹25,000 mode must emit COMPLIANCE_REVIEW_REQUIRED flag"
  );
});

// ═══════════════════════════════════════════════════════════════════
// 2. ESIC Statutory Calculations
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ ESIC Statutory Rules");

test("ESIC eligible — gross ₹20,000 (below ₹21,000 threshold)", () => {
  const esic = statutoryRulesService.calculateESIC(20000);
  assert.equal(esic.eligible, true);
  assert.equal(esic.employeeESIC, 150);  // round(20,000 × 0.0075) = 150
  assert.equal(esic.employerESIC, 650);  // round(20,000 × 0.0325) = 650
  assert.equal(esic.totalESIC, 800);     // 4% of 20,000
});

test("ESIC ineligible — gross ₹25,000 (above ₹21,000 threshold)", () => {
  const esic = statutoryRulesService.calculateESIC(25000);
  assert.equal(esic.eligible, false);
  assert.equal(esic.employeeESIC, 0);
  assert.equal(esic.employerESIC, 0);
});

test("ESIC rounding symmetry — both employee and employer use Math.round", () => {
  // At ₹20,000: 0.0075 × 20,000 = 150.0 (exact); 0.0325 × 20,000 = 650.0 (exact)
  // Test with a value that would differ between Math.ceil and Math.round
  // ₹13,333: 0.0075 × 13,333 = 99.9975 → ceil=100, round=100 (same here)
  // ₹1,333:  0.0075 × 1,333  = 9.9975  → ceil=10,  round=10  (same)
  // ₹1,111:  0.0075 × 1,111  = 8.3325  → ceil=9,   round=8  (DIFFERENT)
  const esic = statutoryRulesService.calculateESIC(1111);
  // After fix: employee uses Math.round = 8, employer = round(1111 × 0.0325) = round(36.1075) = 36
  assert.equal(esic.employeeESIC, 8, "Employee ESIC: Math.round(1111 × 0.0075) = 8");
  assert.equal(esic.employerESIC, 36, "Employer ESIC: Math.round(1111 × 0.0325) = 36");
});

test("ESIC total = employeeESIC + employerESIC (always consistent)", () => {
  // Test a variety of gross values to ensure totalESIC = employee + employer
  [5000, 10000, 15000, 20000, 21000].forEach((gross) => {
    const esic = statutoryRulesService.calculateESIC(gross);
    if (esic.eligible) {
      assert.equal(
        esic.totalESIC,
        esic.employeeESIC + esic.employerESIC,
        `ESIC total mismatch at gross ₹${gross}`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Maharashtra Professional Tax
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Maharashtra Professional Tax");

test("PT — nil slab (gross ≤ ₹7,500)", () => {
  assert.equal(statutoryRulesService.calculateProfessionalTax(7000).ptAmount, 0);
  assert.equal(statutoryRulesService.calculateProfessionalTax(7500).ptAmount, 0);
});

test("PT — ₹175 slab (₹7,501 – ₹10,000)", () => {
  assert.equal(statutoryRulesService.calculateProfessionalTax(8500).ptAmount, 175);
  assert.equal(statutoryRulesService.calculateProfessionalTax(10000).ptAmount, 175);
});

test("PT — ₹200 standard slab (gross > ₹10,000, non-February)", () => {
  assert.equal(statutoryRulesService.calculateProfessionalTax(25000, "Male", 1).ptAmount, 200);
  assert.equal(statutoryRulesService.calculateProfessionalTax(100000, "Male", 3).ptAmount, 200);
});

test("PT — February surcharge ₹300 (male, gross > ₹10,000)", () => {
  assert.equal(statutoryRulesService.calculateProfessionalTax(25000, "Male", 2).ptAmount, 300);
});

test("PT — female exemption for gross ≤ ₹25,000 (any month)", () => {
  assert.equal(statutoryRulesService.calculateProfessionalTax(25000, "Female", 1).ptAmount, 0);
  assert.equal(statutoryRulesService.calculateProfessionalTax(22000, "Female", 2).ptAmount, 0);
  assert.equal(statutoryRulesService.calculateProfessionalTax(7500, "Female", 1).ptAmount, 0);
});

test("PT — female above ₹25,000 pays normal PT (including February surcharge)", () => {
  // Gross ₹30,000, female — above exemption limit, pays ₹200 in Jan
  assert.equal(statutoryRulesService.calculateProfessionalTax(30000, "Female", 1).ptAmount, 200);
  // February: female above ₹25,000 pays ₹300
  assert.equal(statutoryRulesService.calculateProfessionalTax(30000, "Female", 2).ptAmount, 300);
});

test("PT — female exactly at ₹25,000 exemption boundary is exempt", () => {
  assert.equal(statutoryRulesService.calculateProfessionalTax(25000, "Female", 2).ptAmount, 0, 
    "Female at exactly ₹25,000 in February should be exempt");
});

// ═══════════════════════════════════════════════════════════════════
// 4. Income Tax TDS (Section 192, New Regime FY 2026-27)
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Income Tax TDS — Section 192 (New Regime FY 2026-27)");

test("TDS — Section 87A rebate (taxable income ₹6,25,000 ≤ ₹7,00,000)", () => {
  // Annual gross ₹7,00,000 − std deduction ₹75,000 = taxable ₹6,25,000
  const tds = statutoryRulesService.calculateTDS(700000);
  assert.equal(tds.taxableIncome, 625000);
  assert.equal(tds.annualTax, 0);
  assert.equal(tds.monthlyTDS, 0);
  assert.equal(tds.rebate87A, true);
});

test("TDS — no tax below basic exemption (taxable ≤ ₹3,00,000)", () => {
  const tds = statutoryRulesService.calculateTDS(350000); // taxable = 275,000
  assert.equal(tds.annualTax, 0);
  assert.equal(tds.rebate87A, false, "87A applies only when taxable > 3L");
});

test("TDS (AY 2026-27) — ₹12,00,000 gross qualifies for Sec 87A rebate (taxable ₹11,25,000 ≤ ₹12,00,000)", () => {
  // AY 2026-27 New Tax Regime (Finance Act 2025/2026):
  // Taxable income <= ₹12 Lakhs has full Section 87A rebate of up to ₹60,000 => Tax = ₹0
  const tds = statutoryRulesService.calculateTDS(1200000);
  assert.equal(tds.taxableIncome, 1125000);
  assert.equal(tds.baseTax, 0);
  assert.equal(tds.cess, 0);
  assert.equal(tds.annualTax, 0);
  assert.equal(tds.monthlyTDS, 0);
  assert.equal(tds.rebate87A, true);
  assert.equal(tds.zeroTaxQualified, true);
});

test("TDS (AY 2026-27) — ₹12,75,000 gross (exactly ₹12,00,000 taxable) has ZERO tax", () => {
  // Salaried gross up to ₹12.75L has zero tax due to ₹75k std deduction + ₹12L rebate
  const tds = statutoryRulesService.calculateTDS(1275000);
  assert.equal(tds.taxableIncome, 1200000);
  assert.equal(tds.annualTax, 0);
  assert.equal(tds.monthlyTDS, 0);
  assert.equal(tds.rebate87A, true);
});

test("TDS (AY 2026-27) — ₹15,00,000 gross (taxable ₹14,25,000 exceeds ₹12L rebate ceiling)", () => {
  // Slabs: 0-4L(0) + 4-8L(5%=20k) + 8-12L(10%=40k) + 12-14.25L(15%=33,750)
  // Base = ₹93,750; Cess 4% = ₹3,750; Total = ₹97,500; Monthly = ₹8,125
  const tds = statutoryRulesService.calculateTDS(1500000);
  assert.equal(tds.taxableIncome, 1425000);
  assert.equal(tds.baseTax, 93750);
  assert.equal(tds.cess, 3750);
  assert.equal(tds.annualTax, 97500);
  assert.equal(tds.monthlyTDS, 8125);
});

test("TDS (AY 2026-27) — ₹20,00,000 gross (taxable ₹19,25,000)", () => {
  // Slabs: 0-4L(0) + 4-8L(5%=20k) + 8-12L(10%=40k) + 12-16L(15%=60k) + 16-19.25L(20%=65k)
  // Base = 20k + 40k + 60k + 65k = ₹1,85,000; Cess 4% = ₹7,400; Total = ₹1,92,400; Monthly = ₹16,033
  const tds = statutoryRulesService.calculateTDS(2000000);
  assert.equal(tds.taxableIncome, 1925000);
  assert.equal(tds.baseTax, 185000);
  assert.equal(tds.cess, 7400);
  assert.equal(tds.annualTax, 192400);
  assert.equal(tds.monthlyTDS, Math.round(192400 / 12)); // 16,033
});

test("TDS (Legacy AY 2025-26) — ₹12,00,000 gross (taxable ₹11,25,000 with legacy ₹7L rebate)", () => {
  // Under AY 2025-26 (Finance (No. 2) Act 2024):
  // 3L–7L(5%) = 20k + 7L–10L(10%) = 30k + 10L–11.25L(15%) = 18,750
  // Base = 68,750; Cess = 2,750; Total = 71,500; Monthly = 5,958
  const tds = statutoryRulesService.calculateTDS({
    grossAnnual: 1200000,
    regime: "New",
    assessmentYear: "AY_2025_26",
  });
  assert.equal(tds.taxableIncome, 1125000);
  assert.equal(tds.baseTax, 68750);
  assert.equal(tds.cess, 2750);
  assert.equal(tds.annualTax, 71500);
  assert.equal(tds.monthlyTDS, 5958);
});

test("TDS Spreading — YTD aware remaining tax spread over remaining months", () => {
  // Gross ₹20,00,000 has annual tax ₹1,92,400. If ₹96,200 already deducted and 6 months remain:
  // Remaining tax = ₹96,200 / 6 = ₹16,033/mo
  const tds = statutoryRulesService.calculateTDS({
    grossAnnual: 2000000,
    regime: "New",
    assessmentYear: "AY_2026_27",
    ytdDeducted: 96200,
    remainingMonths: 6,
  });
  assert.equal(tds.annualTax, 192400);
  assert.equal(tds.remainingTax, 96200);
  assert.equal(tds.remainingMonths, 6);
  assert.equal(tds.monthlyTDS, 16033);
});

// ═══════════════════════════════════════════════════════════════════
// 5. Indian Number-to-Words Converter
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Indian Currency Number-to-Words");

test("Zero", () => assert.equal(payrollEngine.numberToIndianWords(0), "Rupees Zero Only"));
test("Thousands", () => assert.equal(payrollEngine.numberToIndianWords(1500), "Rupees One Thousand Five Hundred Only"));
test("Fifty thousand range", () => assert.equal(
  payrollEngine.numberToIndianWords(54321),
  "Rupees Fifty-Four Thousand Three Hundred Twenty-One Only"
));
test("Lakhs", () => assert.equal(
  payrollEngine.numberToIndianWords(1250000),
  "Rupees Twelve Lakh Fifty Thousand Only"
));

// ═══════════════════════════════════════════════════════════════════
// 6. Full Salary Slip — End-to-End
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Salary Slip — Full Attendance");

const mockEmployee = {
  employee_id: "test-uuid-1",
  employee_code: "SH-TEST-01",
  first_name: "Amit",
  last_name: "Deshmukh",
  gender: "Male",
  tax_regime: "New",
};

const mockAssignment = {
  base_monthly_salary: 50000,
  ctc_annual: 1200000,
};

const mockStructureItems = [
  { code: "BASIC", name: "Basic Salary", type: "EARNING", depends_on_payment_days: true },
  { code: "HRA", name: "House Rent Allowance", type: "EARNING", calculation_type: "PERCENTAGE_OF_BASIC", percentage_or_amount: 50, depends_on_payment_days: true },
  { code: "SPECIAL_ALLOWANCE", name: "Special Allowance", type: "EARNING", calculation_type: "FIXED", percentage_or_amount: 10000, depends_on_payment_days: true },
  { code: "PF_EMPLOYEE", name: "PF", type: "DEDUCTION", is_statutory: true },
  { code: "PT_MAHARASHTRA", name: "PT", type: "DEDUCTION", is_statutory: true },
  { code: "TDS", name: "TDS", type: "DEDUCTION", is_statutory: true },
];

const fullSlip = payrollEngine.calculateSalarySlip({
  employee: mockEmployee,
  assignment: mockAssignment,
  structureItems: mockStructureItems,
  totalWorkingDays: 30,
  lwpDays: 0,
  reimbursements: 2500,
  month: 10,
  year: 2026,
});

test("Full attendance — paymentDays = 30", () => assert.equal(fullSlip.paymentDays, 30));
test("Full attendance — grossPay = ₹87,500 (Basic 50k + HRA 25k + Special 10k + Reimb 2.5k)", () =>
  assert.equal(fullSlip.grossPay, 87500));
test("Full attendance — totalDeductions = ₹2,000 (PF 1,800 + PT 200; TDS is ₹0 due to AY 2026-27 Sec 87A rebate)", () =>
  assert.equal(fullSlip.totalDeductions, 2000));
test("Full attendance — netPay = ₹85,500", () => assert.equal(fullSlip.netPay, 85500));
console.log(`    Net pay: ₹${fullSlip.netPay} (${fullSlip.netPayInWords})`);

// ═══════════════════════════════════════════════════════════════════
// 7. Salary Slip — LOP Proration
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Salary Slip — LOP Proration (6 days)");

const proratedSlip = payrollEngine.calculateSalarySlip({
  employee: mockEmployee,
  assignment: mockAssignment,
  structureItems: mockStructureItems,
  totalWorkingDays: 30,
  lwpDays: 6,
  reimbursements: 0,
  month: 10,
  year: 2026,
});

test("6 LOP — paymentDays = 24", () => assert.equal(proratedSlip.paymentDays, 24));
test("6 LOP — lwpDays = 6", () => assert.equal(proratedSlip.lwpDays, 6));
test("6 LOP — grossPay = ₹68,000 (prorated 24/30)", () => assert.equal(proratedSlip.grossPay, 68000));
test("6 LOP — totalDeductions = ₹2,000 (PF 1,800 + PT 200)", () => assert.equal(proratedSlip.totalDeductions, 2000));
test("6 LOP — netPay = ₹66,000", () => assert.equal(proratedSlip.netPay, 66000));

// ═══════════════════════════════════════════════════════════════════
// 8. Mid-Month Joiner Proration (NEW)
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Mid-Month Joiner / Leaver Proration");

test("Mid-month joiner on Oct 15 in 31-day month — 17 payable days", () => {
  // October has 31 days. Joining on 15th → eligible days = 31 - 15 + 1 = 17
  const slip = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 31,
    lwpDays: 0,
    reimbursements: 0,
    month: 10,
    year: 2026,
    joinDate: "2026-10-15",
  });
  assert.equal(slip.paymentDays, 17, `Expected 17, got ${slip.paymentDays}`);
  // Basic: 50,000 × 17/31 = 27,419 (rounded)
  const expectedBasic = Math.round(50000 * 17 / 31);
  const actualBasic = slip.earnings.find((e) => e.componentCode === "BASIC")?.amount;
  assert.equal(actualBasic, expectedBasic, `Expected basic ₹${expectedBasic}, got ₹${actualBasic}`);
});

test("Mid-month joiner on 1st — full month pay (no proration)", () => {
  const slip = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    lwpDays: 0,
    reimbursements: 0,
    month: 10,
    year: 2026,
    joinDate: "2026-10-01",
  });
  assert.equal(slip.paymentDays, 30, "Joined on 1st should get full 30 days");
});

test("Mid-month leaver on Oct 20 in 31-day month — 20 payable days", () => {
  const slip = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 31,
    lwpDays: 0,
    reimbursements: 0,
    month: 10,
    year: 2026,
    exitDate: "2026-10-20",
  });
  assert.equal(slip.paymentDays, 20, `Expected 20 payable days, got ${slip.paymentDays}`);
});

test("Mid-month joiner + LOP — joiner on 16th, 2 LOP in 30-day month", () => {
  // Joined Oct 16 in 30-day month: eligible = 30 - 16 + 1 = 15; LOP 2 → payable 13
  const slip = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    lwpDays: 2,
    reimbursements: 0,
    month: 10,
    year: 2026,
    joinDate: "2026-10-16",
  });
  assert.equal(slip.paymentDays, 13, `Expected 13, got ${slip.paymentDays}`);
});

// ═══════════════════════════════════════════════════════════════════
// 9. CSV Injection Prevention (NEW)
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Bank CSV Injection Prevention");

const mockRun = { month: 10, year: 2026, run_code: "PR-2026-10" };

test("sanitiseField() — formula injection prefix '=' is quoted", () => {
  const safe = bankExportService.sanitiseField("=SUM(A1:A10)");
  assert.ok(safe.startsWith(`"'=`), `Expected \"'=... got: ${safe}`);
});

test("sanitiseField() — '+' prefix is quoted", () => {
  const safe = bankExportService.sanitiseField("+1234");
  assert.ok(safe.startsWith(`"'+`), `Expected \"'+... got: ${safe}`);
});

test("sanitiseField() — '-' prefix is quoted", () => {
  const safe = bankExportService.sanitiseField("-1234");
  assert.ok(safe.startsWith(`"'-`), `Expected \"'-... got: ${safe}`);
});

test("sanitiseField() — '@' prefix is quoted", () => {
  const safe = bankExportService.sanitiseField("@IMPORTRANGE(\"url\")");
  assert.ok(safe.startsWith(`"'@`));
});

test("sanitiseField() — normal text passes through unmodified (except CSV quoting)", () => {
  const safe = bankExportService.sanitiseField("Amit Deshmukh");
  assert.equal(safe, `"Amit Deshmukh"`);
});

test("sanitiseField() — internal double-quotes are escaped", () => {
  const safe = bankExportService.sanitiseField(`He said "hello"`);
  assert.equal(safe, `"He said ""hello"""`);
});

test("CSV export — malicious name does not appear as formula in output", () => {
  const slips = [{
    rounded_net_pay: 50000,
    bank_account_no: "1234567890",
    ifsc_code: "HDFC0000123",
    month: 10,
    year: 2026,
    employee_code: "SH-001",
    first_name: "=CMD|'/C calc'!A0", // Injection attempt in name
    last_name: "Doe",
    bank_name: "HDFC Bank",
    email: "test@example.com",
  }];
  const result = bankExportService.generateBankPaymentCSV(mockRun, slips);
  // The CSV must prefix the = with ' so spreadsheets treat it as text, not formula.
  // After sanitisation: field appears as "'=CMD|..." inside double-quotes.
  assert.ok(result.content.includes("'=CMD"), "Injection prefix must be quoted with apostrophe");
  // The formula must NOT appear as a raw formula-start (comma then quote then =)
  assert.ok(!result.content.includes(",\"=CMD"), "Formula must not start a CSV field with '=\"");
});

// ═══════════════════════════════════════════════════════════════════
// 10. IFSC & Account Number Validation (NEW)
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Bank Export — IFSC & Account Validation");

test("Valid IFSC — HDFC0000123 passes", () => {
  const r = bankExportService.validateIFSC("HDFC0000123");
  assert.equal(r.valid, true);
});

test("Invalid IFSC — too short", () => {
  const r = bankExportService.validateIFSC("HDFC123");
  assert.equal(r.valid, false);
  assert.ok(r.error);
});

test("Invalid IFSC — 5th char not '0'", () => {
  const r = bankExportService.validateIFSC("HDFC1000123");
  assert.equal(r.valid, false);
});

test("Missing IFSC — returns invalid", () => {
  const r = bankExportService.validateIFSC("");
  assert.equal(r.valid, false);
});

test("Valid bank account — 14-digit numeric", () => {
  const r = bankExportService.validateAccountNumber("50100234567890");
  assert.equal(r.valid, true);
});

test("Invalid bank account — contains letters", () => {
  const r = bankExportService.validateAccountNumber("ABCD123456");
  assert.equal(r.valid, false);
});

test("Bank export emits validationWarnings for invalid IFSC", () => {
  const slips = [{
    rounded_net_pay: 50000,
    bank_account_no: "1234567890",
    ifsc_code: "INVALID",   // Bad IFSC
    month: 10, year: 2026,
    employee_code: "SH-BAD",
    first_name: "Test", last_name: "User",
    bank_name: "Some Bank",
    email: "test@test.com",
  }];
  const result = bankExportService.generateBankPaymentCSV(mockRun, slips);
  assert.ok(result.validationWarnings.length > 0, "Should have validation warnings");
  assert.ok(result.validationWarnings[0].field === "IFSC");
});

test("Bank export totalAmount matches sum of generated rows (not raw slip data)", () => {
  const slips = [
    { rounded_net_pay: 50000, bank_account_no: "1234567890", ifsc_code: "HDFC0000123",
      month: 10, year: 2026, employee_code: "SH-001", first_name: "A", last_name: "B",
      bank_name: "HDFC", email: "a@a.com" },
    { rounded_net_pay: -100, bank_account_no: "1234567890", ifsc_code: "HDFC0000123",
      month: 10, year: 2026, employee_code: "SH-002", first_name: "C", last_name: "D",
      bank_name: "HDFC", email: "c@c.com" },  // Should be excluded (negative)
    { rounded_net_pay: 30000, bank_account_no: "1234567890", ifsc_code: "HDFC0000123",
      month: 10, year: 2026, employee_code: "SH-003", first_name: "E", last_name: "F",
      bank_name: "HDFC", email: "e@e.com" },
  ];
  const result = bankExportService.generateBankPaymentCSV(mockRun, slips);
  assert.equal(result.totalRecords, 2, "Should include 2 records (negative excluded)");
  assert.equal(result.totalAmount, 80000, "Total must be 50,000 + 30,000 = 80,000");
});

// ═══════════════════════════════════════════════════════════════════
// 11. CTC Reconciliation Engine
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ CTC Reconciliation Engine");

test("CTC Decomposition — ₹12,00,000 matches with zero variance", () => {
  const result = ctcReconciliationEngine.decomposeAnnualCtc({
    annualCtc: 1200000,
    pfCeilingMode: "15000",
    hraType: "METRO",
    basicPercent: 50,
  });
  assert.equal(result.isValid, true);
  assert.equal(result.validationStatus, "BALANCED");
  assert.equal(result.approvedAnnualCtc, 1200000);
  assert.ok(result.varianceAmount <= 12, `Variance must be <= ₹12/year, got ${result.varianceAmount}`);
  // Check that employee deductions are NOT in employer costs
  const pfEe = result.employeeDeductionsBreakdown.find((i) => i.code === "PF_EMPLOYEE");
  assert.ok(pfEe, "PF_EMPLOYEE must be in employee deductions");
  assert.ok(!result.employerCostsBreakdown.some((i) => i.code === "PF_EMPLOYEE"), "PF_EMPLOYEE must NOT be in employer costs");
});

test("CTC Decomposition — Low basic warning (< 40%)", () => {
  const result = ctcReconciliationEngine.decomposeAnnualCtc({
    annualCtc: 1200000,
    basicPercent: 35,
  });
  assert.ok(result.policyFlags.some((f) => f.type === "LOW_BASIC_PERCENTAGE"), "Must flag basic < 40%");
});

test("CTC Decomposition — Insufficient CTC deficit error", () => {
  // When Basic % is high (e.g. 70%), Basic (70%) + HRA (35%) alone exceeds 100% of CTC
  const result = ctcReconciliationEngine.decomposeAnnualCtc({
    annualCtc: 1200000,
    basicPercent: 70,
    allowSpecialBalancing: true,
  });
  assert.equal(result.validationStatus, "DEFICIT_ERROR");
  assert.ok(result.discrepancies.some((d) => d.type === "INSUFFICIENT_CTC_DEFICIT"));
});

// ═══════════════════════════════════════════════════════════════════
// 12. Expense Reimbursements & Tax Treatment
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Expense Reimbursements & Tax Treatment");

test("Non-taxable business reimbursements are excluded from TDS taxable income projection", () => {
  // Employee with ₹50,000 basic, no taxable reimbursements
  const slipWithoutReimb = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    lwpDays: 0,
    reimbursements: 0,
    month: 10,
    year: 2026,
  });

  // Employee with ₹50,000 basic + ₹50,000 non-taxable travel reimbursement
  const slipWithNonTaxReimb = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    lwpDays: 0,
    reimbursements: 50000, // Non-taxable travel claim
    month: 10,
    year: 2026,
  });

  // TDS must be IDENTICAL because non-taxable reimbursements do NOT inflate taxable income!
  const tdsWithout = slipWithoutReimb.deductions.find((d) => d.componentCode === "TDS")?.amount || 0;
  const tdsWith = slipWithNonTaxReimb.deductions.find((d) => d.componentCode === "TDS")?.amount || 0;
  assert.equal(tdsWith, tdsWithout, "Non-taxable expense reimbursement must NOT increase income tax TDS");

  // But Net Pay must include the reimbursement payout
  assert.equal(slipWithNonTaxReimb.netPay, slipWithoutReimb.netPay + 50000);
});

// ═══════════════════════════════════════════════════════════════════
// 13. Salaried vs Hourly Proration Policy
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Salaried vs Hourly Attendance Policy");

test("Salaried policy — low timesheet hours do NOT reduce salaried employee pay", () => {
  // Salaried employee who logged only 20 hours in project timesheet (e.g. internal work/unlogged)
  // should receive FULL monthly salary (provided they have 0 approved LOP days)
  const salariedSlip = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    lwpDays: 0,
    timesheetHours: 20, // Only 20 hours logged
    isHourly: false,     // Salaried policy
    month: 10,
    year: 2026,
  });
  assert.equal(salariedSlip.paymentDays, 30, "Salaried employee receives full 30 payment days");
  const basic = salariedSlip.earnings.find((e) => e.componentCode === "BASIC")?.amount;
  assert.equal(basic, 50000, "Salaried basic is not penalized by project timesheet hours");
});

test("Hourly policy — compensation scales proportionally with timesheet hours", () => {
  // Hourly contractor: 80 hours logged out of 160 standard hours = 50% pay
  const hourlySlip = payrollEngine.calculateSalarySlip({
    employee: mockEmployee,
    assignment: mockAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    timesheetHours: 80,
    standardMonthlyHours: 160,
    isHourly: true,
    month: 10,
    year: 2026,
  });
  const basic = hourlySlip.earnings.find((e) => e.componentCode === "BASIC")?.amount;
  assert.equal(basic, 25000, "Hourly basic must be 50% (80/160 hrs)");
});

// ═══════════════════════════════════════════════════════════════════
// 14. Input Validation & Statutory Identifiers
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Input Validation & Identifier Formats");

test("PAN Validation — Valid PAN passes (AAACS1234P)", () => {
  assert.equal(validationService.isValidPAN("AAACS1234P"), true);
  assert.equal(validationService.isValidPAN("aaacs1234p"), true); // Case-insensitive
});

test("PAN Validation — Invalid PANs rejected", () => {
  assert.equal(validationService.isValidPAN("1234567890"), false); // numeric
  assert.equal(validationService.isValidPAN("AAACS123"), false);   // short
  assert.equal(validationService.isValidPAN(""), false);
});

test("UAN Validation — Exactly 12 digits", () => {
  assert.equal(validationService.isValidUAN("101234567890"), true);
  assert.equal(validationService.isValidUAN("10123456789"), false); // 11 digits
  assert.equal(validationService.isValidUAN("1012345678901"), false); // 13 digits
  assert.equal(validationService.isValidUAN("ABCD12345678"), false); // alpha
});

test("ESIC IP Number Validation — Exactly 17 digits", () => {
  assert.equal(validationService.isValidESICNumber("12345678901234567"), true);
  assert.equal(validationService.isValidESICNumber("1234567890"), false); // 10 digits
});

// ═══════════════════════════════════════════════════════════════════
// 15. Payroll Pilot Comparison (Kredily)
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Payroll Pilot Comparison Engine (Kredily vs PatilOne)");

test("Pilot comparison — exact match detected", () => {
  const pSlip = {
    employee_code: "SH-001",
    first_name: "Amit",
    last_name: "Deshmukh",
    gross_pay: 85000,
    total_deductions: 7958,
    rounded_net_pay: 77042,
    employer_contributions: 2800,
    earnings: [{ componentCode: "BASIC", amount: 50000 }],
    deductions: [{ componentCode: "TDS", amount: 5958 }],
  };
  const kRecord = {
    employeeCode: "SH-001",
    basic: 50000,
    gross: 85000,
    totalDeductions: 7958,
    netPay: 77042,
    employerCost: 2800,
    tds: 5958,
  };
  const report = pilotService.comparePayrollRuns([pSlip], [kRecord]);
  assert.equal(report.exactMatchesCount, 1);
  assert.equal(report.materialVarianceCount, 0);
  assert.equal(report.parallelTestingReadiness, "READY_FOR_PARALLEL_TESTING");
});

test("Pilot comparison — material EPF ceiling variance diagnosed", () => {
  const pSlip = {
    employee_code: "SH-001",
    gross_pay: 100000,
    total_deductions: 1800, // PatilOne capped at ₹15k wage = ₹1,800 PF
    rounded_net_pay: 98200,
    employer_contributions: 1950,
    earnings: [{ componentCode: "BASIC", amount: 60000 }],
  };
  const kRecord = {
    employeeCode: "SH-001",
    basic: 60000,
    gross: 100000,
    totalDeductions: 7200, // Kredily full wage 12% of 60k = ₹7,200 PF (diff = ₹5,400)
    netPay: 92800,
    employerCost: 7200,
  };
  const report = pilotService.comparePayrollRuns([pSlip], [kRecord]);
  assert.equal(report.materialVarianceCount, 1);
  assert.equal(report.parallelTestingReadiness, "REQUIRES_VARIANCE_RESOLUTION");
  const employeeResult = report.comparisons[0];
  assert.equal(employeeResult.status, "MATERIAL_VARIANCE");
  assert.ok(employeeResult.fields.employeeDeductions.rootCause);
});

// ═══════════════════════════════════════════════════════════════════
// 16. Post-2014 EPS Exclusion, VPF, and EDLI Statutory Cap
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ EPF Advanced Statutory Rules (Post-2014 EPS Exclusion, VPF, EDLI Cap)");

test("EPF — Post-2014 new joiner with Basic > ₹15,000 has 0% EPS and 100% employer contribution to EPF", () => {
  // Supreme Court ruling (Nov 4, 2022) & GSR 609(E):
  // New employees joining on or after Sept 1, 2014 with Basic > ₹15,000 are ineligible for EPS-95.
  // Full 12% employer share goes to EPF Account No. 1.
  const epf = statutoryRulesService.calculateEPF({
    basicPay: 40000,
    pfCeilingMode: "ACTUAL",
    isPost2014NewMemberAboveCap: true,
  });
  assert.equal(epf.pfWage, 40000);
  assert.equal(epf.employeePF, 4800); // 12% of 40,000
  assert.equal(epf.employerEPS, 0, "EPS must be 0 for post-2014 high-wage joiner");
  assert.equal(epf.employerEPF, 4800, "Full 12% must go to EPF");
  assert.equal(epf.isPost2014NewMemberAboveCap, true);
  assert.equal(epf.employerEDLI, 75, "EDLI is capped at ₹75/mo (0.5% of ₹15,000 max)");
  assert.equal(epf.employerAdmin, 200, "Admin charge is 0.5% of actual PF wage");
});

test("EPF — VPF voluntary deduction without employer matching", () => {
  const epf = statutoryRulesService.calculateEPF({
    basicPay: 20000,
    pfCeilingMode: "15000",
    vpfAmount: 5000,
  });
  assert.equal(epf.employeePF, 1800); // 12% of 15,000 statutory cap
  assert.equal(epf.vpf, 5000);
  assert.equal(epf.totalEmployeeDeduction, 6800);
  assert.equal(epf.employerEPS, 1250); // 8.33% of 15,000
  assert.equal(epf.employerEPF, 550);  // 1,800 - 1,250
  assert.equal(epf.totalEmployerPF, 1800 + 75 + 75); // EPF + EPS + EDLI(75) + Admin(75) = 1950
});

test("EPF — EDLI is strictly capped at ₹75/mo even at ₹1,00,000 basic wage", () => {
  const epf = statutoryRulesService.calculateEPF({
    basicPay: 100000,
    pfCeilingMode: "ACTUAL",
  });
  assert.equal(epf.employerEDLI, 75, "EDLI maximum monthly contribution is ₹75 (0.5% of ₹15,000)");
});

// ═══════════════════════════════════════════════════════════════════
// 17. ESIC Rule 50 Contribution Period Continuity Proviso
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ ESIC Rule 50 Contribution Period Continuity Proviso");

test("ESIC — wage crossing ₹21,000 mid-period continues coverage if covered at period start", () => {
  // Rule 50 of ESI (Central) Rules, 1950:
  // If an employee's wage exceeds ₹21,000 after start of contribution period (Apr-Sep or Oct-Mar),
  // they remain covered until the end of that contribution period on actual gross wage.
  const esic = statutoryRulesService.calculateESIC({
    grossPay: 26000,
    month: 11, // November (part of Oct-Mar period)
    isCoveredInCurrentContributionPeriod: true,
  });
  assert.equal(esic.eligible, true, "Must remain eligible until end of contribution period");
  assert.equal(esic.employeeESIC, Math.round(26000 * 0.0075)); // ₹195
  assert.equal(esic.employerESIC, Math.round(26000 * 0.0325)); // ₹845
  assert.equal(esic.isCoveredInCurrentContributionPeriod, true);
});

test("ESIC — wage exceeding ₹21,000 without prior period coverage is NOT eligible", () => {
  const esic = statutoryRulesService.calculateESIC({
    grossPay: 26000,
    month: 11,
    isCoveredInCurrentContributionPeriod: false,
  });
  assert.equal(esic.eligible, false);
  assert.equal(esic.employeeESIC, 0);
  assert.equal(esic.employerESIC, 0);
});

// ═══════════════════════════════════════════════════════════════════
// 18. Payment of Gratuity Act, 1972 (Costing Accrual vs Statutory Vesting Liability)
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Payment of Gratuity Act, 1972 (Costing Accrual vs Statutory Vesting)");

test("Gratuity — 3 years service: Costing accrual active (4.81%) but statutory liability is UNVESTED (₹0)", () => {
  const basic = 40000;
  const gratuity = statutoryRulesService.calculateGratuity({
    basicPay: basic,
    yearsOfService: 3,
    isCostingOnly: false,
  });
  assert.equal(gratuity.monthlyAccrualCost, Math.round(basic * (15 / (26 * 12)))); // ₹1,923 (4.8077%)
  assert.equal(gratuity.isVested, false, "Gratuity requires 5 years continuous service under Sec 4(1)");
  assert.equal(gratuity.statutoryEntitlement, 0, "No statutory payout due upon separation before 5 years");
});

test("Gratuity — 6 years service: Statutory liability is VESTED", () => {
  const basic = 50000;
  const gratuity = statutoryRulesService.calculateGratuity({
    basicPay: basic,
    yearsOfService: 6,
  });
  assert.equal(gratuity.isVested, true);
  // Formula: (15 / 26) * 50,000 * 6 = 1,73,076.92 => 1,73,077
  assert.equal(gratuity.statutoryEntitlement, Math.round((15 / 26) * basic * 6));
});

test("Gratuity — 25 years service at high wage is capped at ₹20 Lakhs statutory ceiling", () => {
  const basic = 200000;
  const gratuity = statutoryRulesService.calculateGratuity({
    basicPay: basic,
    yearsOfService: 25,
  });
  // Raw formula: (15 / 26) * 200,000 * 25 = ₹28,84,615
  // Capped at Payment of Gratuity Act statutory ceiling: ₹20,00,000
  assert.equal(gratuity.isVested, true);
  assert.equal(gratuity.statutoryEntitlement, 2000000);
});

// ═══════════════════════════════════════════════════════════════════
// 19. High Earner Salary Slip with TDS Withholding
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Salary Slip — High Earner with TDS Withholding");

test("High earner salary slip correctly withholds TDS under AY 2026-27", () => {
  const highEarnerEmployee = {
    employee_id: "test-high-earner",
    employee_code: "SH-EXEC-01",
    first_name: "Rajesh",
    last_name: "Patil",
    gender: "Male",
    tax_regime: "New",
    assessment_year: "AY_2026_27",
  };
  const highEarnerAssignment = {
    base_monthly_salary: 100000,
    ctc_annual: 2400000, // ₹24 Lakhs
  };
  const highEarnerSlip = payrollEngine.calculateSalarySlip({
    employee: highEarnerEmployee,
    assignment: highEarnerAssignment,
    structureItems: mockStructureItems,
    totalWorkingDays: 30,
    lwpDays: 0,
    reimbursements: 0,
    month: 10, // October (fyMonthIndex = 6 => 6 remaining months in FY)
    year: 2026,
  });
  assert.ok(highEarnerSlip.grossPay > 100000);
  const tdsDeduction = highEarnerSlip.deductions.find((d) => d.componentCode === "TDS");
  assert.ok(tdsDeduction, "TDS must be deducted for ₹24L CTC employee");
  assert.ok(tdsDeduction.amount > 0, "TDS amount must be positive");
  assert.equal(
    highEarnerSlip.netPay,
    highEarnerSlip.grossPay - highEarnerSlip.totalDeductions,
    "Net pay must equal gross pay minus total deductions"
  );
});

// ═══════════════════════════════════════════════════════════════════
// 20. Statutory Legal Registry Metadata
// ═══════════════════════════════════════════════════════════════════
console.log("\n▶ Statutory Legal Registry Metadata Verification");

test("Statutory registry returns official citations for all statutory regimes", () => {
  const registry = statutoryRulesService.getStatutoryRegistry();
  assert.ok(registry.epf.legislation.includes("1952"));
  assert.ok(registry.epf.statutoryWageCeiling === 15000);
  assert.ok(registry.esic.legislation.includes("1948"));
  assert.ok(registry.esic.rule50ContinuityProviso);
  assert.ok(registry.ptMaharashtra.legislation.includes("1975"));
  assert.ok(registry.tds.currentAssessmentYear === "AY_2026_27");
  assert.ok(registry.tds.section87ARebateThreshold === 1200000);
  assert.ok(registry.gratuity.statutoryCeiling === 2000000);
  assert.ok(registry.gratuity.vestingPeriodYears === 5);
});

// ═══════════════════════════════════════════════════════════════════
// Mode A: Net → CTC Decomposition Engine (decomposeFromNetSalary)
// ═══════════════════════════════════════════════════════════════════
console.log("\n✦ Mode A: Net-to-CTC Decomposition Engine");

{
  // ── Helper policy builders ──────────────────────────────────────
  // Policy matching generic plant model: Basic=50% of Net, DA=₹3,700, HRA=5% of B+DA
  const plantBetaPolicy = {
    code: "BRANCH-KB",
    name: "Branch KB",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50,
    da_fixed_amount: 3700,
    hra_percent_of_basic_da: 5,
    washing_allowance: 1000,
    education_allowance: 1200,
    conveyance_allowance: 1750,
    medical_allowance: 1000,
    books_periodicals: 1000,
    pf_ceiling_mode: "ACTUAL",
    employee_pf_rate: 0.12,
    employer_pf_rate: 0.13,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
  };

  // Policy with MP state code
  const mpBranchPolicy = { ...plantBetaPolicy, code: "BRANCH-MP", name: "Branch MP", state_code: "MP", da_fixed_amount: 2850 };

  // Policy with zero DA (pure percent-of-net)
  const zeroDaPolicy   = { ...plantBetaPolicy, code: "BRANCH-ZD", name: "Branch ZD", da_fixed_amount: 0 };

  // ── Test 1: Basic decomposition, generic plant policy ──────
  // Net = ₹26,000, MH state, month=3 (not Feb)
  // basic   = 26000 × 50% = ₹13,000
  // B+DA    = 13000 + 3700 = ₹16,700
  // HRA     = 16700 × 5% = ₹835
  // fixedA  = 1000+1200+1750+1000+1000 = ₹5,950
  // otherA  = 26000 - 16700 - 835 - 5950 = ₹2,515
  // pfWage  = 16700 (ACTUAL, no ceiling)
  // empPF   = 16700 × 12% = ₹2,004
  // PT (MH, Male, month 3, gross-proxy=26000) → ₹200 (>₹10,000)
  // gross   = 26000 + 2004 + 200 = ₹28,204
  // emprPF  = 16700 × 13% = ₹2,171
  // bonus   = min(16700,7000) × 8.33% = 7000 × 0.0833 = ₹583.1 → ₹583
  // gratuity= 16700 × 4.81% = ₹803.27 → ₹803
  // monthly = 26000 + 2004 + 2171 + 200 + 583 + 803 = ₹31,761
  // yearly  = 31761 × 12 = ₹381,132
  test("Mode A: Basic decomposition — generic plant policy, net ₹26,000", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 26000, policy: plantBetaPolicy, month: 3, gender: "Male" });
    assert.strictEqual(result.isValid, true, "should be valid");
    assert.strictEqual(result.mode, "NET_TO_CTC", "mode flag");
    assert.strictEqual(result.earnings.basic, 13000, "basic");
    assert.strictEqual(result.earnings.basicPlusDA, 16700, "basic+DA");
    assert.strictEqual(result.earnings.hra, 835, "HRA");
    assert.strictEqual(result.earnings.otherAllowance, 2515, "other allowance");
    assert.strictEqual(result.deductions.employeePF, 2004, "employee PF");
    assert.strictEqual(result.deductions.professionalTax, 200, "PT (MH standard month)");
    assert.strictEqual(result.grossSalary, 28204, "gross salary");
    assert.strictEqual(result.employerCosts.employerPF, 2171, "employer PF");
    assert.strictEqual(result.employerCosts.bonus, 583, "bonus (capped at ₹7,000 base)");
    assert.strictEqual(result.employerCosts.gratuity, 803, "gratuity accrual");
    assert.strictEqual(result.monthlyCtc, 31761, "monthly CTC");
    assert.strictEqual(result.yearlyCtc, 381132, "yearly CTC");
  });

  // ── Test 2: February adjustment (MH PT = ₹300 in Feb) ─────────
  test("Mode A: MH PT February adjustment (₹300 in month=2)", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 26000, policy: plantBetaPolicy, month: 2, gender: "Male" });
    assert.strictEqual(result.deductions.professionalTax, 300, "PT should be ₹300 in February (MH)");
    // Monthly CTC increases by ₹100 due to higher PT
    assert.strictEqual(result.monthlyCtc, 31861, "monthly CTC in February");
  });

  // ── Test 3: MP state, gross > ₹20,000 → PT = ₹208 ─────────────
  test("Mode A: MP state PT (≥₹20,000 → ₹208)", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 40000, policy: mpBranchPolicy, month: 3, gender: "Male" });
    assert.strictEqual(result.deductions.professionalTax, 208, "MP PT at ≥₹20,000 gross");
    assert.strictEqual(result.stateCode, "MP", "state code in result");
  });

  // ── Test 4: MP PT slab ₹15,000–₹19,999 → ₹167 ─────────────────
  test("Mode A: MP state PT (₹15,000–₹19,999 → ₹167)", () => {
    // Net ₹16,000: pfWage proxy = 16000*50%+2850=10850; gross-proxy=net=16000
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 16000, policy: mpBranchPolicy, month: 5, gender: "Male" });
    assert.strictEqual(result.deductions.professionalTax, 167, "MP PT at ₹15k–₹19,999");
  });

  // ── Test 5: MP PT slab ₹10,000–₹14,999 → ₹125 ─────────────────
  test("Mode A: MP state PT (₹10,000–₹14,999 → ₹125)", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 12000, policy: mpBranchPolicy, month: 5, gender: "Male" });
    assert.strictEqual(result.deductions.professionalTax, 125, "MP PT at ₹10k–₹14,999");
  });

  // ── Test 6: MP PT slab < ₹10,000 → ₹0 ────────────────────────
  test("Mode A: MP state PT (< ₹10,000 → ₹0)", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 8000, policy: mpBranchPolicy, month: 5, gender: "Male" });
    assert.strictEqual(result.deductions.professionalTax, 0, "MP PT below ₹10,000");
  });

  // ── Test 7: MH Female PT exemption ≤ ₹25,000 ───────────────────
  test("Mode A: MH Female PT exempt (net ≤ ₹25,000)", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 24000, policy: plantBetaPolicy, month: 6, gender: "Female" });
    assert.strictEqual(result.deductions.professionalTax, 0, "MH female exempt (net ≤₹25k)");
  });

  // ── Test 8: otherAllowance < 0 → INVALID with ERROR validation ─
  test("Mode A: Net too low for fixed allowances → INVALID with ERROR", () => {
    // Net ₹5,000, fixed allowances alone = ₹5,950; other allowance will be deeply negative
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 5000, policy: plantBetaPolicy, month: 3, gender: "Male" });
    assert.strictEqual(result.isValid, false, "should be invalid");
    assert.strictEqual(result.validationStatus, "INVALID", "status = INVALID");
    const err = result.validations.find(v => v.code === "NET_TOO_LOW");
    assert(err, "should have NET_TOO_LOW error");
    assert.ok(err.shortfall > 0, "shortfall should be positive");
  });

  // ── Test 9: PF ceiling = '15000' ───────────────────────────────
  // B+DA = 16700, but PF ceiling = ₹15,000 → pfWage=15000
  // empPF = 15000×12% = ₹1800
  // emprPF = 15000×13% = ₹1950
  test("Mode A: PF ceiling mode '15000' caps PF wage", () => {
    const capped = { ...plantBetaPolicy, pf_ceiling_mode: "15000" };
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 26000, policy: capped, month: 3, gender: "Male" });
    assert.strictEqual(result.deductions.employeePF, 1800, "employee PF with ₹15,000 ceiling");
    assert.strictEqual(result.employerCosts.employerPF, 1950, "employer PF with ₹15,000 ceiling");
  });

  // ── Test 10: PF ceiling = '25000' ──────────────────────────────
  // B+DA = 16700 < 25000 → pfWage = 16700 (ceiling not hit)
  test("Mode A: PF ceiling '25000' (B+DA < 25000 — ceiling not triggered)", () => {
    const cap25k = { ...plantBetaPolicy, pf_ceiling_mode: "25000" };
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 26000, policy: cap25k, month: 3, gender: "Male" });
    assert.strictEqual(result.deductions.employeePF, 2004, "employee PF: ceiling=25000, B+DA=16700 → uncapped");
  });

  // ── Test 11: PF ceiling = '25000', B+DA > 25000 → capped ───────
  // Net = ₹60,000; basic = ₹30,000; B+DA = 33,700 > 25,000 → pfWage = 25,000
  test("Mode A: PF ceiling '25000' caps PF wage when B+DA > ₹25,000", () => {
    const cap25k = { ...plantBetaPolicy, pf_ceiling_mode: "25000" };
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 60000, policy: cap25k, month: 3, gender: "Male" });
    const expectedPfWage = 25000;
    assert.strictEqual(result.deductions.employeePF, Math.round(expectedPfWage * 0.12), "empPF capped at 25000×12%");
    assert.strictEqual(result.employerCosts.employerPF, Math.round(expectedPfWage * 0.13), "emprPF capped at 25000×13%");
  });

  // ── Test 12: Zero DA policy ─────────────────────────────────────
  test("Mode A: Zero DA — basicPlusDA equals basic", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 30000, policy: zeroDaPolicy, month: 3, gender: "Male" });
    assert.strictEqual(result.earnings.da, 0, "DA should be 0");
    assert.strictEqual(result.earnings.basic, result.earnings.basicPlusDA, "B+DA = Basic when DA=0");
  });

  // ── Test 13: CTC internal variance must be 0 ────────────────────
  test("Mode A: Internal CTC reconciliation — zero penny variance", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 35000, policy: plantBetaPolicy, month: 7, gender: "Male" });
    const { grossSalary, employerCosts, monthlyCtc } = result;
    const recomputed = grossSalary + employerCosts.totalEmployerCosts;
    assert.strictEqual(Math.abs(recomputed - monthlyCtc), 0, "zero-penny CTC internal reconciliation");
  });

  // ── Test 14: BONUS_CAPPED info validation present when B+DA > ₹7,000 ──
  test("Mode A: Bonus Act cap info appears when Basic+DA > ₹7,000", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 26000, policy: plantBetaPolicy, month: 3, gender: "Male" });
    const bonusInfo = result.validations.find(v => v.code === "BONUS_CAPPED");
    assert(bonusInfo, "BONUS_CAPPED info validation should be present (B+DA=16700 > 7000)");
    assert.strictEqual(bonusInfo.tier, "INFO", "tier should be INFO");
  });

  // ── Test 15: Invalid input — zero net salary ────────────────────
  test("Mode A: Zero netSalary returns isValid=false", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 0, policy: plantBetaPolicy, month: 3, gender: "Male" });
    assert.strictEqual(result.isValid, false, "zero net salary is invalid");
  });

  // ── Test 16: Missing policy returns isValid=false ───────────────
  test("Mode A: Missing policy returns isValid=false", () => {
    const result = ctcEngine.decomposeFromNetSalary({ netSalary: 26000, policy: null, month: 3, gender: "Male" });
    assert.strictEqual(result.isValid, false, "null policy is invalid");
  });

  // ── Test 17: Multi-state PT — Karnataka ────────────────────────
  test("Multi-state PT: KA, gross ₹32,000 → ₹200", () => {
    const ptResult = statutory.calculateMultiStatePT(32000, "KA", "Male", 5);
    assert.strictEqual(ptResult.ptAmount, 200, "KA PT ≥₹30,000 = ₹200");
    assert.strictEqual(ptResult.stateCode, "KA", "state code preserved");
  });

  // ── Test 18: Multi-state PT — Karnataka lower slab ─────────────
  test("Multi-state PT: KA, gross ₹20,000 → ₹150", () => {
    const ptResult = statutory.calculateMultiStatePT(20000, "KA", "Male", 5);
    assert.strictEqual(ptResult.ptAmount, 150, "KA PT ₹15k–₹29,999 = ₹150");
  });

  // ── Test 19: Multi-state PT — NONE → ₹0 ───────────────────────
  test("Multi-state PT: NONE state → ₹0", () => {
    const ptResult = statutory.calculateMultiStatePT(50000, "NONE", "Male", 5);
    assert.strictEqual(ptResult.ptAmount, 0, "NONE state = no PT");
  });

  // ── Test 20: calculateProfessionalTax still works (backward compat) ──
  test("PT backward compat: calculateProfessionalTax delegates to MH slabs", () => {
    // ₹15,000 gross, Male, month=6 → MH standard ₹200
    const ptResult = statutory.calculateProfessionalTax(15000, "Male", 6);
    assert.strictEqual(ptResult.ptAmount, 200, "backward compat: MH ₹200 for >₹10,000 male");
  });
}

// ═══════════════════════════════════════════════════════════════════
// Bulk Import Parser & 300+ Employee Batch Performance Test
// ═══════════════════════════════════════════════════════════════════
console.log("\n✦ Bulk Import Parser & 300+ Employee Performance");

test("Bulk Import: Template CSV contains required headers", () => {
  const template = bulkImportService.getTemplateCsv();
  assert.ok(template.includes("employee_code"), "must have employee_code header");
  assert.ok(template.includes("first_name"), "must have first_name header");
  assert.ok(template.includes("last_name"), "must have last_name header");
  assert.ok(template.includes("target_net_salary"), "must have target_net_salary header");
  assert.ok(template.includes("location_code"), "must have location_code header");
});

await asyncTest("Bulk Import: parseBulkTemplate parses valid CSV buffer", async () => {
  const csvData = [
    "employee_code,first_name,last_name,target_net_salary,location_code",
    "EMP001,John,Doe,25000,BRANCH-ALPHA",
    "EMP002,Jane,Smith,30000,BRANCH-BETA"
  ].join("\n");
  const buffer = Buffer.from(csvData, "utf-8");
  const { headers, rows } = await bulkImportService.parseBulkTemplate(buffer);
  assert.strictEqual(headers.length, 5, "5 headers parsed");
  assert.strictEqual(rows.length, 2, "2 data rows parsed");
  assert.strictEqual(rows[0].employee_code, "EMP001");
  assert.strictEqual(rows[1].first_name, "Jane");
});

await asyncTest("Bulk Import: parseBulkTemplate rejects empty buffer", async () => {
  const emptyCsv = Buffer.from("", "utf-8");
  await assert.rejects(
    async () => await bulkImportService.parseBulkTemplate(emptyCsv),
    /CSV file must contain a header row/
  );
});

test("300+ Employee Batch Performance & Zero-Variance Stress Test", () => {
  const samplePolicy = {
    code: "BRANCH-PERF",
    name: "Branch Performance",
    state_code: "MH",
    basic_calculation_mode: "PERCENT_OF_NET",
    basic_percent_of_net: 50,
    da_fixed_amount: 3500,
    hra_percent_of_basic_da: 5,
    washing_allowance: 1000,
    education_allowance: 1200,
    conveyance_allowance: 1750,
    medical_allowance: 1000,
    books_periodicals: 1000,
    pf_ceiling_mode: "ACTUAL",
    employee_pf_rate: 0.12,
    employer_pf_rate: 0.13,
    bonus_rate: 0.0833,
    gratuity_rate: 0.0481,
  };

  const startTime = Date.now();
  const count = 350; // test with 350 employees (> 300)
  let totalCalculatedCtc = 0;

  for (let i = 1; i <= count; i++) {
    // Generate varying salaries from ₹22,000 to ₹92,000
    const netSalary = 22000 + (i * 200);
    const result = ctcEngine.decomposeFromNetSalary({
      netSalary,
      policy: samplePolicy,
      month: (i % 12) + 1,
      gender: i % 2 === 0 ? "Female" : "Male",
    });

    assert.strictEqual(result.isValid, true, `Record ${i} should be valid`);
    assert.strictEqual(result.varianceAmount || 0, 0, `Record ${i} should have 0 variance`);
    totalCalculatedCtc += result.monthlyCtc;
  }

  const durationMs = Date.now() - startTime;
  console.log(`    Calculated ${count} employee records in ${durationMs}ms (Avg ${(durationMs / count).toFixed(3)}ms/record, Total Monthly CTC: ₹${totalCalculatedCtc.toLocaleString("en-IN")})`);
  assert.ok(durationMs < 2000, `Execution time ${durationMs}ms must be under 2000ms`);
});

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) FAILED — review output above\n`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${passed} PAYROLL ENGINE & STATUTORY TESTS PASSED!\n`);
  process.exit(0);
}
