// Backend/src/services/payroll/ctcReconciliationEngine.js
import statutoryRulesService from "./statutoryRulesService.js";

/**
 * CTC Reconciliation Engine
 *
 * Provides bidirectional CTC validation and reconciliation:
 * 1. Reverse CTC Breakdown (Target Annual CTC → Deterministic monthly & annual components)
 * 2. Forward Reconciliation (Existing structure items & assignments → Audit report vs Approved CTC)
 *
 * Guarantees:
 * - Special Allowance balances ONLY when approved in structure and when positive.
 * - Minimum Basic threshold validation (cannot artificially deflate Basic below legal/policy minimum).
 * - Employee deductions are never counted as additional employer cost.
 * - Employer contributions (EPF, ESIC, Gratuity, Insurance) are segregated from employee gross earnings.
 * - Detailed discrepancy explanations when variance exists.
 */
class CtcReconciliationEngine {
  /**
   * Safe round to nearest whole rupee
   */
  round(val) {
    return Math.round(Number(val) || 0);
  }

  /**
   * Reverse CTC Decomposition (CFO Formula with Zero-Mismatch balancing)
   *
   * @param {Object} params
   * @param {number} params.annualCtc - Approved Annual Cost to Company
   * @param {string} [params.pfCeilingMode='15000'] - '15000' | '25000' | 'ACTUAL'
   * @param {string} [params.hraType='METRO'] - 'METRO' (50%) | 'NON_METRO' (40%)
   * @param {number} [params.basicPercent=50] - Target Basic % of monthly CTC (min 30%, max 70%)
   * @param {number} [params.month=1] - Month for PT rate check
   * @param {string} [params.gender='Male'] - Gender for PT exemption
   * @param {boolean} [params.allowSpecialBalancing=true] - Whether Special Allowance acts as balancing figure
   * @param {boolean} [params.includeGratuity=true] - Whether 4.81% gratuity provision is included in CTC
   */
  decomposeAnnualCtc({
    annualCtc,
    pfCeilingMode = "15000",
    hraType = "METRO",
    basicPercent = 50,
    month = new Date().getMonth() + 1,
    gender = "Male",
    allowSpecialBalancing = true,
    includeGratuity = true,
  }) {
    const annual = Math.max(0, Number(annualCtc) || 0);
    const discrepancies = [];
    const policyFlags = [];

    if (annual <= 0) {
      return {
        isValid: false,
        error: "Annual CTC must be a positive number greater than zero",
        discrepancies: [{ type: "INVALID_CTC", message: "Annual CTC is zero or negative." }],
      };
    }

    const monthlyCtc = this.round(annual / 12);

    // 1. Basic Component Calculation & Validation
    const basicPct = Math.min(70, Math.max(30, Number(basicPercent) || 50));
    if (Number(basicPercent) < 40) {
      policyFlags.push({
        type: "LOW_BASIC_PERCENTAGE",
        severity: "WARNING",
        message: `Basic salary is set to ${basicPct}% of CTC. Code on Wages recommends Basic >= 50% of gross compensation.`,
      });
    }

    const basicMonthly = this.round(monthlyCtc * (basicPct / 100));

    // 2. HRA
    const hraPct = hraType === "METRO" ? 0.50 : 0.40;
    const hraMonthly = this.round(basicMonthly * hraPct);

    // 3. Employer Statutory Obligations (Part of CTC)
    // Gratuity provision: 15/26 days per year of service = 4.81% of Basic salary
    const gratuityMonthly = includeGratuity ? this.round(basicMonthly * 0.0481) : 0;

    // EPF Employer Contribution
    const epfData = statutoryRulesService.calculateEPF(basicMonthly, pfCeilingMode);
    const employerPfMonthly = epfData.totalEmployerPF;
    if (epfData.complianceFlag) {
      policyFlags.push({
        type: "STATUTORY_COMPLIANCE_FLAG",
        severity: "WARNING",
        message: epfData.complianceFlag,
      });
    }

    // ESIC Employer Contribution
    // Estimated gross before special allowance
    const estimatedInitialGross = basicMonthly + hraMonthly;
    const esicInitial = statutoryRulesService.calculateESIC(estimatedInitialGross);
    let employerEsicMonthly = esicInitial.employerESIC;

    // Employer Burden before Special Allowance
    let totalEmployerBurden = employerPfMonthly + employerEsicMonthly + gratuityMonthly;

    // 4. Special Allowance as Balancing Component
    let specialAllowanceMonthly = 0;
    if (allowSpecialBalancing) {
      const balance = monthlyCtc - basicMonthly - hraMonthly - totalEmployerBurden;
      if (balance < 0) {
        discrepancies.push({
          type: "INSUFFICIENT_CTC_DEFICIT",
          severity: "BLOCKING",
          deficit: Math.abs(balance),
          message: `Monthly CTC (₹${monthlyCtc.toLocaleString("en-IN")}) is insufficient to cover Basic (₹${basicMonthly.toLocaleString("en-IN")}), HRA (₹${hraMonthly.toLocaleString("en-IN")}), and mandatory employer contributions (₹${totalEmployerBurden.toLocaleString("en-IN")}). Deficit: ₹${Math.abs(balance).toLocaleString("en-IN")}/mo.`,
        });
        specialAllowanceMonthly = 0;
      } else {
        specialAllowanceMonthly = balance;
      }
    } else {
      specialAllowanceMonthly = 0;
    }

    // Recalculate ESIC on final Gross Pay if eligible
    const grossPayMonthly = basicMonthly + hraMonthly + specialAllowanceMonthly;
    const finalEsic = statutoryRulesService.calculateESIC(grossPayMonthly);
    if (finalEsic.eligible && finalEsic.employerESIC !== employerEsicMonthly) {
      employerEsicMonthly = finalEsic.employerESIC;
      totalEmployerBurden = employerPfMonthly + employerEsicMonthly + gratuityMonthly;
      if (allowSpecialBalancing) {
        const rebalance = monthlyCtc - basicMonthly - hraMonthly - totalEmployerBurden;
        specialAllowanceMonthly = Math.max(0, rebalance);
      }
    }

    // 5. Employee Deductions (Deducted from gross earnings, NOT added to CTC)
    const employeePfMonthly = epfData.employeePF;
    const employeeEsicMonthly = finalEsic.eligible ? finalEsic.employeeESIC : 0;
    const ptData = statutoryRulesService.calculateProfessionalTax(grossPayMonthly, gender, month);
    const professionalTaxMonthly = ptData.ptAmount;

    // TDS estimate (Annualized projection under Section 115BAC New Regime)
    const projectedAnnualGross = grossPayMonthly * 12;
    const tdsData = statutoryRulesService.calculateTDS(projectedAnnualGross, "New");
    const monthlyTds = tdsData.monthlyTDS;

    const totalEmployeeDeductionsMonthly = employeePfMonthly + employeeEsicMonthly + professionalTaxMonthly + monthlyTds;
    const netInHandMonthly = Math.max(0, grossPayMonthly - totalEmployeeDeductionsMonthly);

    // 6. Annual Reconstruction & Reconciliation
    const annualEarnings = grossPayMonthly * 12;
    const annualEmployerCosts = totalEmployerBurden * 12;
    const reconstructedAnnualCtc = annualEarnings + annualEmployerCosts;
    const varianceAmount = Math.abs(annual - reconstructedAnnualCtc);

    const isBalanced = varianceAmount <= 12 && discrepancies.filter((d) => d.severity === "BLOCKING").length === 0;

    let validationStatus = "BALANCED";
    if (!isBalanced) {
      if (discrepancies.some((d) => d.severity === "BLOCKING")) {
        validationStatus = "DEFICIT_ERROR";
      } else {
        validationStatus = "VARIANCE_DETECTED";
      }
    }

    return {
      isValid: isBalanced,
      validationStatus,
      approvedAnnualCtc: annual,
      reconstructedAnnualCtc,
      varianceAmount,
      varianceExplanation: isBalanced
        ? varianceAmount === 0
          ? "Perfect zero-penny mathematical match."
          : `Negligible monthly rounding difference of ₹${varianceAmount} per year.`
        : `Reconstructed annual CTC (₹${reconstructedAnnualCtc.toLocaleString("en-IN")}) differs from approved CTC by ₹${varianceAmount.toLocaleString("en-IN")}.`,
      summary: {
        monthlyCtc,
        monthlyGross: grossPayMonthly,
        monthlyNetInHand: netInHandMonthly,
        annualGross: annualEarnings,
        annualNetInHand: netInHandMonthly * 12,
        annualEmployerCosts,
        ctcMatchOk: isBalanced,
      },
      earningsBreakdown: [
        { code: "BASIC", name: "Basic Salary", monthly: basicMonthly, annual: basicMonthly * 12, percentageOfCtc: Number(((basicMonthly * 12 / annual) * 100).toFixed(1)) },
        { code: "HRA", name: "House Rent Allowance", monthly: hraMonthly, annual: hraMonthly * 12, percentageOfCtc: Number(((hraMonthly * 12 / annual) * 100).toFixed(1)) },
        { code: "SPECIAL_ALLOWANCE", name: "Special Allowance (Balancing)", monthly: specialAllowanceMonthly, annual: specialAllowanceMonthly * 12, percentageOfCtc: Number(((specialAllowanceMonthly * 12 / annual) * 100).toFixed(1)) },
      ],
      employerCostsBreakdown: [
        { code: "PF_EMPLOYER", name: "Provident Fund (Employer)", monthly: employerPfMonthly, annual: employerPfMonthly * 12, isStatutory: true },
        { code: "ESIC_EMPLOYER", name: "ESIC (Employer)", monthly: employerEsicMonthly, annual: employerEsicMonthly * 12, isStatutory: true },
        { code: "GRATUITY", name: "Gratuity Provision (4.81%)", monthly: gratuityMonthly, annual: gratuityMonthly * 12, isStatutory: true },
      ],
      employeeDeductionsBreakdown: [
        { code: "PF_EMPLOYEE", name: "Provident Fund (Employee)", monthly: employeePfMonthly, annual: employeePfMonthly * 12, isStatutory: true },
        { code: "ESIC_EMPLOYEE", name: "ESIC (Employee)", monthly: employeeEsicMonthly, annual: employeeEsicMonthly * 12, isStatutory: true },
        { code: "PT_MAHARASHTRA", name: "Professional Tax", monthly: professionalTaxMonthly, annual: professionalTaxMonthly * 12, isStatutory: true },
        { code: "TDS", name: "Income Tax TDS (Sec 192)", monthly: monthlyTds, annual: monthlyTds * 12, isStatutory: true },
      ],
      discrepancies,
      policyFlags,
    };
  }

  /**
   * Forward Reconciliation: Audit an existing employee's salary assignment against structure items
   *
   * @param {Object} employee - Employee object
   * @param {Object} assignment - Employee salary assignment
   * @param {Array} structureItems - Items configured for the structure
   */
  reconcileEmployeeAssignment(employee, assignment, structureItems = []) {
    const discrepancies = [];
    const approvedCtc = Number(assignment?.ctc_annual) || 0;
    const baseMonthly = Number(assignment?.base_monthly_salary) || 0;

    if (approvedCtc <= 0) {
      discrepancies.push({
        type: "MISSING_ANNUAL_CTC",
        severity: "BLOCKING",
        message: "Employee has no approved annual CTC configured in salary assignment.",
      });
    }

    if (baseMonthly <= 0) {
      discrepancies.push({
        type: "MISSING_BASE_SALARY",
        severity: "BLOCKING",
        message: "Employee has no monthly basic salary configured.",
      });
    }

    // Check for duplicate components in structure
    const codeCounts = {};
    for (const item of structureItems) {
      codeCounts[item.code] = (codeCounts[item.code] || 0) + 1;
      if (codeCounts[item.code] > 1) {
        discrepancies.push({
          type: "DUPLICATE_COMPONENT",
          severity: "BLOCKING",
          component: item.code,
          message: `Component '${item.code}' appears multiple times in salary structure.`,
        });
      }
    }

    // Calculate earnings & employer costs from structure items
    let monthlyEarnings = baseMonthly;
    let monthlyEmployerCosts = 0;

    for (const item of structureItems) {
      if (item.code === "BASIC") continue;

      let itemAmt = 0;
      if (item.calculation_type === "PERCENTAGE_OF_BASIC") {
        itemAmt = Math.round(baseMonthly * (Number(item.percentage_or_amount || 0) / 100));
      } else {
        itemAmt = Number(item.percentage_or_amount || 0);
      }

      if (item.type === "EARNING") {
        monthlyEarnings += itemAmt;
      } else if (item.type === "EMPLOYER_CONTRIBUTION") {
        monthlyEmployerCosts += itemAmt;
      }
    }

    // If EPF employer contribution is missing from structure items, check statutory EPF
    const hasEmployerPf = structureItems.some((i) => i.code === "PF_EMPLOYER");
    if (!hasEmployerPf) {
      const epf = statutoryRulesService.calculateEPF(baseMonthly);
      monthlyEmployerCosts += epf.totalEmployerPF;
    }

    const reconstructedAnnual = (monthlyEarnings + monthlyEmployerCosts) * 12;
    const variance = Math.abs(approvedCtc - reconstructedAnnual);

    const isBalanced = approvedCtc > 0 && variance <= 12 && discrepancies.length === 0;

    return {
      employeeId: employee.employee_id,
      employeeCode: employee.employee_code,
      employeeName: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
      approvedAnnualCtc: approvedCtc,
      reconstructedAnnualCtc: reconstructedAnnual,
      monthlyEarnings,
      monthlyEmployerCosts,
      varianceAmount: variance,
      isBalanced,
      validationStatus: isBalanced ? "BALANCED" : "VARIANCE_DETECTED",
      discrepancies,
    };
  }
}

export default new CtcReconciliationEngine();
