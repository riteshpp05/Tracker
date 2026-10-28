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
   * @param {Object} params.employee Employee object (id, code, name, gender, tax_regime, doj, separation_date)
   * @param {Object} params.assignment Employee salary assignment (base_monthly_salary, ctc_annual)
   * @param {Array}  params.structureItems Components linked to salary structure
   * @param {Number} [params.totalWorkingDays=30] Calendar days in month (e.g. 30 or 31)
   * @param {String} [params.prorationBasis='CALENDAR_DAYS'] 'CALENDAR_DAYS' | 'SCHEDULED_WORKING_DAYS'
   * @param {Number} [params.scheduledWorkingDays] Days excluding weekly offs & holidays (e.g. 22 or 26)
   * @param {Boolean} [params.isHourly=false] If true, prorates by timesheet hours vs standard hours
   * @param {Number} [params.standardMonthlyHours=160] Standard target hours for hourly compensation
   * @param {Number} [params.lwpDays=0] Unpaid leave / Loss of Pay days
   * @param {Number} [params.reimbursements=0] Non-taxable approved business expense claims
   * @param {Number} [params.taxableReimbursements=0] Taxable expense reimbursements (no receipt / taxable perquisite)
   * @param {Number} [params.month=1] Payroll month (1-12)
   * @param {Number} [params.year=2026] Payroll year (e.g. 2026)
   * @param {String} [params.joinDate] ISO date string if employee joined mid-month
   * @param {String} [params.exitDate] ISO date string if employee left mid-month
   */
  calculateSalarySlip({
    employee,
    assignment,
    structureItems = [],
    totalWorkingDays = 30,
    prorationBasis = "CALENDAR_DAYS",
    scheduledWorkingDays = null,
    isHourly = false,
    standardMonthlyHours = 160,
    lwpDays = 0,
    timesheetHours = 0,
    timesheetDays = 0,
    reimbursements = 0,
    taxableReimbursements = 0,
    month = 1,
    year = 2026,
    additionalEarnings = [],
    additionalDeductions = [],
    joinDate = null,
    exitDate = null,
  }) {
    const calendarDays = Math.max(1, Number(totalWorkingDays) || 30);
    const denominatorDays = prorationBasis === "SCHEDULED_WORKING_DAYS" && scheduledWorkingDays
      ? Math.max(1, Number(scheduledWorkingDays))
      : calendarDays;

    // ── Mid-month joiner / leaver proration ─────────────────────────────
    let eligibleDays = calendarDays; // default: full month
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd   = new Date(year, month - 1, calendarDays);

    const resolvedJoinDate = joinDate || employee?.doj;
    if (resolvedJoinDate) {
      const jDate = new Date(resolvedJoinDate);
      if (!isNaN(jDate) && jDate > periodStart) {
        const joinDay = Math.min(jDate.getDate(), calendarDays);
        eligibleDays = Math.min(eligibleDays, calendarDays - joinDay + 1);
      }
    }

    const resolvedExitDate = exitDate || employee?.separation_date;
    if (resolvedExitDate) {
      const eDate = new Date(resolvedExitDate);
      if (!isNaN(eDate) && eDate < periodEnd) {
        const exitDay = Math.max(eDate.getDate(), 1);
        eligibleDays = Math.min(eligibleDays, exitDay);
      }
    }

    eligibleDays = Math.max(0, Math.min(eligibleDays, calendarDays));

    const workingDays = denominatorDays;
    const lwp = Math.min(eligibleDays, Math.max(0, Number(lwpDays) || 0));
    const paymentDays = Math.max(0, eligibleDays - lwp);

    // Proration factor: Salaried vs Hourly
    let prorationFactor;
    if (isHourly) {
      // For hourly policy: compensation strictly tracks timesheet hours against target
      const loggedHours = Math.max(0, Number(timesheetHours) || 0);
      const targetHours = Math.max(1, Number(standardMonthlyHours) || 160);
      prorationFactor = loggedHours / targetHours;
    } else {
      // For salaried policy: project timesheet hours do NOT automatically deduct pay.
      // Pay is based purely on calendar/working days minus approved LOP.
      prorationFactor = workingDays > 0 ? (paymentDays / workingDays) : 1;
    }

    // Build proration note for transparency
    const prorationNote = (() => {
      const parts = [];
      if (isHourly) {
        parts.push(`Hourly policy: ${Number(timesheetHours) || 0}/${standardMonthlyHours} hrs`);
      } else {
        if (eligibleDays < calendarDays) {
          if (resolvedJoinDate && new Date(resolvedJoinDate) > periodStart) {
            parts.push(`Joined ${new Date(resolvedJoinDate).getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]}`);
          }
          if (resolvedExitDate && new Date(resolvedExitDate) < periodEnd) {
            parts.push(`Last day ${new Date(resolvedExitDate).getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]}`);
          }
        }
        if (lwp > 0) parts.push(`${lwp} LOP day(s)`);
      }
      return parts.length > 0 ? parts.join(", ") : "Full attendance";
    })();

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
      notes: `Pro-rated ${paymentDays}/${workingDays} days — ${prorationNote}`,
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

    // Add Non-Taxable Approved Expense Reimbursements (Sec 10(14) compliant with receipts)
    const nonTaxReimbAmt = Math.max(0, Number(reimbursements) || 0);
    if (nonTaxReimbAmt > 0) {
      earningsItems.push({
        componentCode: "EXPENSE_REIMBURSEMENT",
        componentName: "Approved Expense Reimbursements (Non-Taxable)",
        type: "EARNING",
        unproratedAmount: nonTaxReimbAmt,
        amount: nonTaxReimbAmt,
        dependsOnPaymentDays: false,
        isTaxApplicable: false,
        isStatutory: false,
        notes: "Approved official business expenses with verified receipts (Sec 10(14) exempt)",
      });
    }

    // Add Taxable Reimbursements / Allowances (unvouchered or personal per diem)
    const taxReimbAmt = Math.max(0, Number(taxableReimbursements) || 0);
    if (taxReimbAmt > 0) {
      earningsItems.push({
        componentCode: "TAXABLE_REIMBURSEMENT",
        componentName: "Taxable Reimbursements / Perquisites",
        type: "EARNING",
        unproratedAmount: taxReimbAmt,
        amount: taxReimbAmt,
        dependsOnPaymentDays: false,
        isTaxApplicable: true,
        isStatutory: false,
        notes: "Reimbursements without supporting bills / taxable perquisites",
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
          isTaxApplicable: addEarning.isTaxApplicable !== false,
          isStatutory: false,
          notes: addEarning.notes || "Approved adjustment",
        });
      }
    }

    // Total Gross Pay (includes all earnings and reimbursements payable to employee)
    const grossPay = earningsItems.reduce((sum, item) => sum + item.amount, 0);

    // Taxable Gross (excludes non-taxable business expense reimbursements)
    const taxableGrossPay = earningsItems
      .filter((i) => i.isTaxApplicable !== false && i.componentCode !== "EXPENSE_REIMBURSEMENT")
      .reduce((sum, item) => sum + item.amount, 0);

    // Statutory Wage for ESIC & PT excludes non-taxable business reimbursements
    const statutoryGrossPay = taxableGrossPay;

    // 2. Calculate Deductions (Statutory & Voluntary)
    // EPF Employee Contribution (supporting ₹15k, ₹25k, or Actual ceiling)
    const pfCeilingMode = assignment?.pf_ceiling_mode || employee?.pf_ceiling_mode || (employee?.opted_full_wage ? 'ACTUAL' : '15000');
    const epfBreakdown = statutoryRulesService.calculateEPF(proratedBasic, pfCeilingMode);
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

    // ESIC Employee Contribution (based on statutory gross, excluding non-taxable expense reimbursements)
    const esicBreakdown = statutoryRulesService.calculateESIC(statutoryGrossPay);
    if (esicBreakdown.eligible) {
      deductionItems.push({
        componentCode: "ESIC_EMPLOYEE",
        componentName: "ESIC (Employee)",
        type: "DEDUCTION",
        amount: esicBreakdown.employeeESIC,
        isStatutory: true,
        notes: `0.75% of Gross Pay (₹${statutoryGrossPay.toLocaleString("en-IN")})`,
      });
    }

    // Maharashtra Professional Tax (PT)
    const gender = employee.gender || "Male";
    const ptBreakdown = statutoryRulesService.calculateProfessionalTax(statutoryGrossPay, gender, month);
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
    // Annual taxable projection based on taxable earnings only (never inflates tax with travel reimbursements)
    const annualEstimatedGross = Math.max(ctcAnnual, taxableGrossPay * 12);
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
      timesheetHours: Number(timesheetHours) || 0,
      timesheetDays: Number(timesheetDays) || 0,
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
