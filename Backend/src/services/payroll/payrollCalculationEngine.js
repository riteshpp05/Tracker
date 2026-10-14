// Backend/src/services/payroll/payrollCalculationEngine.js
import statutoryRulesService from "./statutoryRulesService.js";

/**
 * Deterministic Payroll Calculation Engine
 * Pure math & rule application. Isolated from database and HTTP layers.
 */
class PayrollCalculationEngine {
  /**
   * Safe round to nearest whole rupee
   */
  round(amount) {
    return Math.round(Number(amount) || 0);
  }

  /**
   * Safe decimal to 2 decimal places
   */
  toDecimal2(amount) {
    return Number((Number(amount) || 0).toFixed(2));
  }

  /**
   * Convert number to Indian Currency words (Rupees & Paise)
   * Handles Lakhs, Crores, Thousands natively.
   */
  numberToIndianWords(num) {
    const n = Math.round(Number(num) || 0);
    if (n === 0) return "Rupees Zero Only";
    if (n < 0) return "Minus " + this.numberToIndianWords(Math.abs(n));

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    function convertGroup(val) {
      let str = "";
      if (val >= 100) {
        str += ones[Math.floor(val / 100)] + " Hundred ";
        val %= 100;
      }
      if (val >= 20) {
        const t = Math.floor(val / 10);
        const u = val % 10;
        if (u > 0) {
          str += tens[t] + "-" + ones[u] + " ";
        } else {
          str += tens[t] + " ";
        }
      } else if (val > 0) {
        str += ones[val] + " ";
      }
      return str.trim();
    }

    let remaining = n;
    let parts = [];

    // Crores (10,000,000)
    if (remaining >= 10000000) {
      const crore = Math.floor(remaining / 10000000);
      parts.push(convertGroup(crore) + " Crore");
      remaining %= 10000000;
    }

    // Lakhs (100,000)
    if (remaining >= 100000) {
      const lakh = Math.floor(remaining / 100000);
      parts.push(convertGroup(lakh) + " Lakh");
      remaining %= 100000;
    }

    // Thousands (1,000)
    if (remaining >= 1000) {
      const thousand = Math.floor(remaining / 1000);
      parts.push(convertGroup(thousand) + " Thousand");
      remaining %= 1000;
    }

    // Hundreds & units
    if (remaining > 0) {
      parts.push(convertGroup(remaining));
    }

    return "Rupees " + parts.join(" ").replace(/\s+/g, " ").trim() + " Only";
  }

  /**
   * Calculate single employee's monthly salary slip
   *
   * @param {Object} params
   * @param {Object} params.employee Employee object (id, code, name, gender, tax_regime)
   * @param {Object} params.assignment Employee salary assignment (base_monthly_salary, ctc_annual)
   * @param {Array}  params.structureItems Components linked to salary structure
   * @param {Number} params.totalWorkingDays Calendar / standard working days in month (e.g. 30 or 31)
   * @param {Number} params.lwpDays Unpaid leave / Loss of Pay days
   * @param {Number} params.reimbursements Approved reimbursement amount from expense claims
   * @param {Number} params.month Payroll month (1-12)
   * @param {Number} params.year Payroll year (e.g. 2026)
   */
  calculateSalarySlip({
    employee,
    assignment,
    structureItems = [],
    totalWorkingDays = 30,
    lwpDays = 0,
    reimbursements = 0,
    month = 1,
    year = 2026,
    additionalEarnings = [],
    additionalDeductions = [],
  }) {
    const workingDays = Math.max(1, Number(totalWorkingDays) || 30);
    const lwp = Math.min(workingDays, Math.max(0, Number(lwpDays) || 0));
    const paymentDays = Math.max(0, workingDays - lwp);
    const prorationFactor = workingDays > 0 ? (paymentDays / workingDays) : 1;

    const baseMonthlySalary = Number(assignment?.base_monthly_salary) || 0;
    const ctcAnnual = Number(assignment?.ctc_annual) || (baseMonthlySalary * 12 * 2);

    // Track computed line items
    const earningsItems = [];
    const deductionItems = [];
    const employerContributionItems = [];

    // 1. Calculate Earnings
    let unproratedBasic = baseMonthlySalary;
    let proratedBasic = this.round(unproratedBasic * prorationFactor);

    // Add Basic line item
    earningsItems.push({
      componentCode: "BASIC",
      componentName: "Basic Salary",
      type: "EARNING",
      unproratedAmount: unproratedBasic,
      amount: proratedBasic,
      dependsOnPaymentDays: true,
      isStatutory: false,
      notes: lwp > 0 ? `Pro-rated for ${paymentDays}/${workingDays} days (${lwp} LOP)` : "Full attendance",
    });

    // Process other earnings defined in structure
    for (const item of structureItems) {
      if (item.type !== "EARNING" || item.code === "BASIC") continue;

      let unproratedAmount = 0;
      if (item.calculation_type === "PERCENTAGE_OF_BASIC") {
        const pct = Number(item.percentage_or_amount) || 0;
        unproratedAmount = Math.round(unproratedBasic * (pct / 100));
      } else {
        unproratedAmount = Number(item.percentage_or_amount) || 0;
      }

      const amount = item.depends_on_payment_days !== false
        ? this.round(unproratedAmount * prorationFactor)
        : unproratedAmount;

      earningsItems.push({
        componentId: item.component_id,
        componentCode: item.code,
        componentName: item.name,
        type: "EARNING",
        unproratedAmount,
        amount,
        dependsOnPaymentDays: item.depends_on_payment_days !== false,
        isStatutory: Boolean(item.is_statutory),
        notes: item.code === "HRA" ? "50% of Basic salary" : item.description || "",
      });
    }

    // Add Approved Expense Reimbursements if any
    const reimbursementAmt = Math.max(0, Number(reimbursements) || 0);
    if (reimbursementAmt > 0) {
      earningsItems.push({
        componentCode: "EXPENSE_REIMBURSEMENT",
        componentName: "Approved Expense Reimbursements",
        type: "EARNING",
        unproratedAmount: reimbursementAmt,
        amount: reimbursementAmt,
        dependsOnPaymentDays: false,
        isStatutory: false,
        notes: "Approved corporate expense claims",
      });
    }

    // Add Additional Earnings if any
    for (const addEarning of additionalEarnings) {
      const amt = Number(addEarning.amount) || 0;
      if (amt > 0) {
        earningsItems.push({
          componentCode: addEarning.code || "BONUS",
          componentName: addEarning.name || "Incentive / Bonus",
          type: "EARNING",
          unproratedAmount: amt,
          amount: amt,
          dependsOnPaymentDays: false,
          isStatutory: false,
          notes: addEarning.notes || "Approved adjustment",
        });
      }
    }

    // Total Gross Pay
    const grossPay = earningsItems.reduce((sum, item) => sum + item.amount, 0);

    // 2. Calculate Deductions (Statutory & Voluntary)
    // EPF Employee Contribution
    const epfBreakdown = statutoryRulesService.calculateEPF(proratedBasic, false);
    if (structureItems.some((i) => i.code === "PF_EMPLOYEE") || true) {
      deductionItems.push({
        componentCode: "PF_EMPLOYEE",
        componentName: "Provident Fund (Employee)",
        type: "DEDUCTION",
        amount: epfBreakdown.employeePF,
        isStatutory: true,
        notes: `12% of PF Wage (₹${epfBreakdown.pfWage.toLocaleString("en-IN")})`,
      });
    }

    // ESIC Employee Contribution (if gross <= 21,000)
    const esicBreakdown = statutoryRulesService.calculateESIC(grossPay);
    if (esicBreakdown.eligible) {
      deductionItems.push({
        componentCode: "ESIC_EMPLOYEE",
        componentName: "ESIC (Employee)",
        type: "DEDUCTION",
        amount: esicBreakdown.employeeESIC,
        isStatutory: true,
        notes: `0.75% of Gross Pay (₹${grossPay.toLocaleString("en-IN")})`,
      });
    }

    // Maharashtra Professional Tax (PT)
    const gender = employee.gender || "Male";
    const ptBreakdown = statutoryRulesService.calculateProfessionalTax(grossPay, gender, month);
    if (ptBreakdown.ptAmount > 0) {
      deductionItems.push({
        componentCode: "PT_MAHARASHTRA",
        componentName: "Professional Tax",
        type: "DEDUCTION",
        amount: ptBreakdown.ptAmount,
        isStatutory: true,
        notes: `Maharashtra PT: ${ptBreakdown.slab}`,
      });
    }

    // Income Tax TDS (Section 192)
    // Approximate annual projection based on gross pay and CTC
    const annualEstimatedGross = Math.max(ctcAnnual, grossPay * 12);
    const regime = employee.tax_regime || "New";
    const tdsBreakdown = statutoryRulesService.calculateTDS(annualEstimatedGross, regime);
    if (tdsBreakdown.monthlyTDS > 0) {
      deductionItems.push({
        componentCode: "TDS",
        componentName: "Income Tax TDS",
        type: "DEDUCTION",
        amount: tdsBreakdown.monthlyTDS,
        isStatutory: true,
        notes: `Sec 192 TDS (Annual taxable ₹${tdsBreakdown.taxableIncome.toLocaleString("en-IN")})`,
      });
    }

    // Add Additional Custom Deductions if any
    for (const addDed of additionalDeductions) {
      const amt = Number(addDed.amount) || 0;
      if (amt > 0) {
        deductionItems.push({
          componentCode: addDed.code || "OTHER_DEDUCTION",
          componentName: addDed.name || "Authorized Recovery",
          type: "DEDUCTION",
          amount: amt,
          isStatutory: false,
          notes: addDed.notes || "Authorized adjustment",
        });
      }
    }

    const totalDeductions = deductionItems.reduce((sum, item) => sum + item.amount, 0);

    // 3. Calculate Employer Contributions
    // Employer EPF
    employerContributionItems.push({
      componentCode: "PF_EMPLOYER",
      componentName: "Provident Fund (Employer)",
      type: "EMPLOYER_CONTRIBUTION",
      amount: epfBreakdown.totalEmployerPF,
      isStatutory: true,
      notes: `EPS: ₹${epfBreakdown.employerEPS}, EPF: ₹${epfBreakdown.employerEPF}, EDLI & Admin: ₹${epfBreakdown.employerEDLI + epfBreakdown.employerAdmin}`,
    });

    // Employer ESIC
    if (esicBreakdown.eligible) {
      employerContributionItems.push({
        componentCode: "ESIC_EMPLOYER",
        componentName: "ESIC (Employer)",
        type: "EMPLOYER_CONTRIBUTION",
        amount: esicBreakdown.employerESIC,
        isStatutory: true,
        notes: `3.25% of Gross Pay`,
      });
    }

    const totalEmployerContributions = employerContributionItems.reduce((sum, item) => sum + item.amount, 0);

    // 4. Net Salary Calculation
    const netPay = Math.max(0, grossPay - totalDeductions);
    const roundedNetPay = this.round(netPay);
    const netPayInWords = this.numberToIndianWords(roundedNetPay);

    return {
      employeeId: employee.employee_id,
      employeeCode: employee.employee_code,
      employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
      month,
      year,
      totalWorkingDays: workingDays,
      paymentDays,
      lwpDays: lwp,
      grossPay,
      totalDeductions,
      employerContributions: totalEmployerContributions,
      netPay,
      roundedNetPay,
      netPayInWords,
      earnings: earningsItems,
      deductions: deductionItems,
      employerBreakdown: employerContributionItems,
      statutoryDetails: {
        epf: epfBreakdown,
        esic: esicBreakdown,
        pt: ptBreakdown,
        tds: tdsBreakdown,
      },
    };
  }
}

export default new PayrollCalculationEngine();
