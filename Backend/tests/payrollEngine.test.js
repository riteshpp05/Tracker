// Backend/tests/payrollEngine.test.js
import assert from "node:assert/strict";
import statutoryRulesService from "../src/services/payroll/statutoryRulesService.js";
import payrollEngine from "../src/services/payroll/payrollCalculationEngine.js";

console.log("🧪 Starting Indian Payroll Engine Test Suite...");

// -----------------------------------------------------------------
// 1. EPF Statutory Calculations
// -----------------------------------------------------------------
console.log("\n▶ Testing EPF Statutory Rules...");

// Case 1A: Basic at statutory cap (₹15,000)
const epf15k = statutoryRulesService.calculateEPF(15000, false);
assert.equal(epf15k.pfWage, 15000, "PF wage should be 15,000");
assert.equal(epf15k.employeePF, 1800, "Employee 12% on 15,000 should be 1,800");
assert.equal(epf15k.employerEPS, 1250, "Employer EPS 8.33% on 15,000 should be 1,250");
assert.equal(epf15k.employerEPF, 550, "Employer EPF remainder should be 550");
assert.equal(epf15k.isCapped, false, "15,000 is not capped");
console.log("  ✓ EPF at ₹15,000 ceiling passed");

// Case 1B: Basic above statutory cap (₹50,000) with default capping
const epf50k = statutoryRulesService.calculateEPF(50000, false);
assert.equal(epf50k.pfWage, 15000, "PF wage should be capped at 15,000");
assert.equal(epf50k.employeePF, 1800, "Employee PF should be capped at 1,800");
assert.equal(epf50k.isCapped, true, "Should flag as capped");
console.log("  ✓ EPF capped above ceiling passed");

// Case 1C: Basic ₹50,000 opted full wage
const epfFull = statutoryRulesService.calculateEPF(50000, true);
assert.equal(epfFull.pfWage, 50000, "PF wage should be full 50,000");
assert.equal(epfFull.employeePF, 6000, "Employee 12% on 50,000 should be 6,000");
assert.equal(epfFull.employerEPS, 1250, "EPS remains capped at 1,250");
assert.equal(epfFull.employerEPF, 4750, "EPF gets remainder: 6,000 - 1,250 = 4,750");
console.log("  ✓ EPF full wage opt-in passed");

// -----------------------------------------------------------------
// 2. ESIC Statutory Calculations
// -----------------------------------------------------------------
console.log("\n▶ Testing ESIC Statutory Rules...");

// Case 2A: Gross ₹20,000 (eligible <= 21,000)
const esicEligible = statutoryRulesService.calculateESIC(20000);
assert.equal(esicEligible.eligible, true, "Gross 20,000 should be ESIC eligible");
assert.equal(esicEligible.employeeESIC, 150, "Employee 0.75% of 20,000 = 150");
assert.equal(esicEligible.employerESIC, 650, "Employer 3.25% of 20,000 = 650");
assert.equal(esicEligible.totalESIC, 800, "Total ESIC should be 800 (4%)");
console.log("  ✓ ESIC eligible (< ₹21,000) passed");

// Case 2B: Gross ₹25,000 (> 21,000)
const esicIneligible = statutoryRulesService.calculateESIC(25000);
assert.equal(esicIneligible.eligible, false, "Gross 25,000 should not be ESIC eligible");
assert.equal(esicIneligible.employeeESIC, 0, "No deduction for ineligible");
console.log("  ✓ ESIC ineligible threshold passed");

// -----------------------------------------------------------------
// 3. Maharashtra Professional Tax
// -----------------------------------------------------------------
console.log("\n▶ Testing Maharashtra Professional Tax...");

// Case 3A: Gross ₹7,000 (<= 7,500)
assert.equal(statutoryRulesService.calculateProfessionalTax(7000).ptAmount, 0, "PT for <= 7,500 is 0");
// Case 3B: Gross ₹8,500 (7,501 - 10,000)
assert.equal(statutoryRulesService.calculateProfessionalTax(8500).ptAmount, 175, "PT for 8,500 is 175");
// Case 3C: Gross ₹25,000 in January
assert.equal(statutoryRulesService.calculateProfessionalTax(25000, "Male", 1).ptAmount, 200, "PT for >10,000 in Jan is 200");
// Case 3D: Gross ₹25,000 in February
assert.equal(statutoryRulesService.calculateProfessionalTax(25000, "Male", 2).ptAmount, 300, "PT in Feb is 300");
// Case 3E: Female exemption (<= 25,000)
assert.equal(statutoryRulesService.calculateProfessionalTax(22000, "Female", 1).ptAmount, 0, "Female under 25,000 is exempt");
console.log("  ✓ Maharashtra PT slabs, February rule & female exemption passed");

// -----------------------------------------------------------------
// 4. Income Tax TDS (Section 192, New Regime)
// -----------------------------------------------------------------
console.log("\n▶ Testing Income Tax TDS Calculations...");

// Case 4A: Gross Annual ₹7,00,000 (taxable ₹6,25,000 after standard deduction ₹75k, rebate 87A applies)
const tdsRebate = statutoryRulesService.calculateTDS(700000);
assert.equal(tdsRebate.taxableIncome, 625000, "Taxable income is 6,25,000");
assert.equal(tdsRebate.annualTax, 0, "Tax is 0 due to 87A rebate");
assert.equal(tdsRebate.monthlyTDS, 0, "Monthly TDS is 0");
console.log("  ✓ Section 87A rebate passed");

// Case 4B: Gross Annual ₹12,00,000
// Standard deduction: 75,000 -> Taxable: 11,25,000
// Slabs:
// 3L - 7L (4L @ 5%) = 20,000
// 7L - 10L (3L @ 10%) = 30,000
// 10L - 11.25L (1.25L @ 15%) = 18,750
// Base tax = 68,750. Cess (4%) = 2,750. Total = 71,500. Monthly TDS ~ 5,958.
const tds12L = statutoryRulesService.calculateTDS(1200000);
assert.equal(tds12L.taxableIncome, 1125000, "Taxable income is 11,25,000");
assert.equal(tds12L.baseTax, 68750, "Base tax matches slabs");
assert.equal(tds12L.cess, 2750, "4% cess is 2,750");
assert.equal(tds12L.annualTax, 71500, "Total annual tax is 71,500");
assert.equal(tds12L.monthlyTDS, 5958, "Monthly TDS is 5,958");
console.log("  ✓ Slabs & Cess for ₹12L gross passed");

// -----------------------------------------------------------------
// 5. Indian Number-to-Words Converter
// -----------------------------------------------------------------
console.log("\n▶ Testing Number to Indian Words...");

assert.equal(payrollEngine.numberToIndianWords(0), "Rupees Zero Only");
assert.equal(payrollEngine.numberToIndianWords(1500), "Rupees One Thousand Five Hundred Only");
assert.equal(
  payrollEngine.numberToIndianWords(54321),
  "Rupees Fifty-Four Thousand Three Hundred Twenty-One Only"
);
assert.equal(
  payrollEngine.numberToIndianWords(1250000),
  "Rupees Twelve Lakh Fifty Thousand Only"
);
console.log("  ✓ Indian currency words converter passed");

// -----------------------------------------------------------------
// 6. End-to-End Deterministic Salary Slip Calculation
// -----------------------------------------------------------------
console.log("\n▶ Testing Salary Slip Calculation with Pro-ration & Deductions...");

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

// Calculation with 30 total days, 0 LOP (Full Attendance)
const fullSlip = payrollEngine.calculateSalarySlip({
  employee: mockEmployee,
  assignment: mockAssignment,
  structureItems: mockStructureItems,
  totalWorkingDays: 30,
  lwpDays: 0,
  reimbursements: 2500, // Approved corporate expense
  month: 10,
  year: 2026,
});

assert.equal(fullSlip.paymentDays, 30, "Payment days should be 30");
// Basic = 50,000, HRA = 25,000, Special = 10,000, Reimbursement = 2,500 => Gross = 87,500
assert.equal(fullSlip.grossPay, 87500, "Gross pay should be 87,500");
// Deductions: PF (1,800 capped) + PT (200) + TDS (5,958) = 7,958
assert.equal(fullSlip.totalDeductions, 7958, "Total deductions should be 7,958");
// Net Pay = 87,500 - 7,958 = 79,542
assert.equal(fullSlip.netPay, 79542, "Net pay should be 79,542");
assert.equal(fullSlip.roundedNetPay, 79542, "Rounded net pay should be 79,542");
console.log(`  ✓ Full attendance slip net pay: ₹${fullSlip.netPay} (${fullSlip.netPayInWords})`);

// Calculation with 30 total days, 6 LOP days (Proration: 24/30 = 0.8)
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

assert.equal(proratedSlip.paymentDays, 24, "Payment days should be 24");
assert.equal(proratedSlip.lwpDays, 6, "LWP days should be 6");
// Prorated Basic: 50,000 * 0.8 = 40,000
// Prorated HRA: 25,000 * 0.8 = 20,000
// Prorated Special: 10,000 * 0.8 = 8,000
// Gross = 68,000
assert.equal(proratedSlip.grossPay, 68000, "Prorated gross pay should be 68,000");
// Deductions: PF on 40k capped = 1,800, PT = 200, TDS = 5,958
assert.equal(proratedSlip.totalDeductions, 7958, "Deductions should be 7,958");
assert.equal(proratedSlip.netPay, 60042, "Net pay should be 60,042");
console.log(`  ✓ Prorated slip net pay (6 LOP): ₹${proratedSlip.netPay} (${proratedSlip.netPayInWords})`);

console.log("\n🎉 ALL 14 PAYROLL ENGINE & STATUTORY TESTS PASSED PERFECTLY!\n");
process.exit(0);
