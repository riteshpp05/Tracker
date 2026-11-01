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
    assessmentYear = "AY_2026_27",
    isPost2014NewMemberAboveCap = false,
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
    // Gratuity provision: 15/26 days per year of service = 4.81% of Basic salary (Costing Accrual)
    const gratuityData = statutoryRulesService.calculateGratuity({
      basicPay: basicMonthly,
      yearsOfService: 0,
      isCostingOnly: true,
    });
    const gratuityMonthly = includeGratuity ? gratuityData.monthlyAccrualCost : 0;

    // EPF Employer Contribution
    const epfData = statutoryRulesService.calculateEPF({
      basicPay: basicMonthly,
      pfCeilingMode,
      isPost2014NewMemberAboveCap,
    });
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
    const tdsData = statutoryRulesService.calculateTDS({
      grossAnnual: projectedAnnualGross,
      regime: "New",
      assessmentYear,
    });
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
        { code: "GRATUITY_PROVISION", name: "Gratuity Provision (4.81% Accrual - AS 15)", monthly: gratuityMonthly, annual: gratuityMonthly * 12, isStatutory: true, note: "Employer accrual for CTC budgeting; vests after 5 years continuous service under Sec 4(1)" },
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

  // ─── Mode A: Net-to-CTC Decomposition ──────────────────────────────────────

  /**
   * decomposeFromNetSalary (Mode A — Net → CTC)
   *
   * Given a target monthly net in-hand salary and a location policy, compute
   * the full salary breakdown including all components, employer costs, and CTC.
   *
   * Formula chain (matches SIPL plant/factory Excel model):
   *  1. basic      = netSalary × policy.basic_percent_of_net / 100
   *  2. basicPlusDA = basic + policy.da_fixed_amount
   *  3. hra        = basicPlusDA × policy.hra_percent_of_basic_da / 100
   *  4. fixedAllowances = washing + education + conveyance + medical + books
   *  5. otherAllowance = netSalary − (basicPlusDA + hra + fixedAllowances)
   *                      ← BALANCING PLUG; negative = net too low for this policy
   *  6. pfWage     = min(basicPlusDA, PF ceiling) per pf_ceiling_mode
   *  7. employeePF = pfWage × policy.employee_pf_rate
   *  8. pt         = calculateMultiStatePT(netSalary, stateCode, gender, month).ptAmount
   *                  NOTE: PT is calculated on net salary as proxy for gross, which
   *                  matches the Excel sheets. Strict gross-based PT can be enabled
   *                  by passing useGrossForPt=true.
   *  9. grossSalary = netSalary + employeePF + pt
   * 10. employerPF = pfWage × policy.employer_pf_rate  (cost-modelling rate, see schema comment)
   * 11. bonus      = basicPlusDA × policy.bonus_rate
   *                  Bonus Act cap: ₹7,000/month (₹84,000/year); capped if basicPlusDA > ₹7,000
   * 12. gratuity   = basicPlusDA × policy.gratuity_rate  (employer accrual, not statutory vesting)
   * 13. monthlyCtc = netSalary + employeePF + employerPF + pt + bonus + gratuity
   * 14. yearlyCtc  = monthlyCtc × 12
   *
   * Validation flags:
   *  - ERROR   : otherAllowance < 0 (BLOCKING — net salary too low for this policy's fixed allowances)
   *  - WARNING : basic < 35% of grossSalary (low basic may indicate policy misconfiguration)
   *  - INFO    : bonus capped by Payment of Bonus Act
   *
   * @param {Object} params
   * @param {number} params.netSalary              Target monthly net in-hand (₹)
   * @param {Object} params.policy                 Location policy object (from locationPolicyService)
   * @param {number} [params.month=1]              Calendar month 1–12 (for PT)
   * @param {string} [params.gender='Male']        Gender (for MH PT exemption)
   * @param {boolean} [params.useGrossForPt=false] Use computed gross (not net) for PT slab lookup
   * @returns {Object}  Full breakdown + validation status
   */
  decomposeFromNetSalary({
    netSalary,
    policy,
    month = new Date().getMonth() + 1,
    gender = "Male",
    useGrossForPt = false,
  }) {
    const net = Math.max(0, Number(netSalary) || 0);
    const validations = [];

    if (net <= 0) {
      return {
        isValid: false,
        error: "netSalary must be a positive number greater than zero",
        validations: [{ tier: "ERROR", code: "INVALID_NET", message: "Net salary is zero or negative." }],
      };
    }
    if (!policy || typeof policy !== "object") {
      return {
        isValid: false,
        error: "policy is required",
        validations: [{ tier: "ERROR", code: "MISSING_POLICY", message: "Location policy object is required." }],
      };
    }

    // ── 1. Basic ────────────────────────────────────────────────────────────
    const basicPct = Math.max(0, Number(policy.basic_percent_of_net) || 50);
    const basic = this.round(net * basicPct / 100);

    // ── 2. Basic + DA ───────────────────────────────────────────────────────
    const da = Math.max(0, Number(policy.da_fixed_amount) || 0);
    const basicPlusDA = this.round(basic + da);

    // ── 3. HRA ──────────────────────────────────────────────────────────────
    const hraPct = Math.max(0, Number(policy.hra_percent_of_basic_da) || 5);
    const hra = this.round(basicPlusDA * hraPct / 100);

    // ── 4. Fixed allowances ─────────────────────────────────────────────────
    const washing     = this.round(Number(policy.washing_allowance)   || 0);
    const education   = this.round(Number(policy.education_allowance) || 0);
    const conveyance  = this.round(Number(policy.conveyance_allowance)|| 0);
    const medical     = this.round(Number(policy.medical_allowance)   || 0);
    const books       = this.round(Number(policy.books_periodicals)   || 0);
    const fixedAllowances = washing + education + conveyance + medical + books;

    // ── 5. Other Allowance (balancing plug) ─────────────────────────────────
    const otherAllowance = this.round(net - basicPlusDA - hra - fixedAllowances);
    if (otherAllowance < 0) {
      validations.push({
        tier: "ERROR",
        code: "NET_TOO_LOW",
        message: `Net salary ₹${net.toLocaleString("en-IN")} is insufficient for configured fixed allowances. ` +
          `Minimum required: ₹${(net - otherAllowance).toLocaleString("en-IN")}. ` +
          `Reduce fixed allowances or increase net salary.`,
        shortfall: Math.abs(otherAllowance),
      });
    }

    // ── 6. PF Wage Ceiling ──────────────────────────────────────────────────
    const pfCeilingMode = String(policy.pf_ceiling_mode || "ACTUAL").toUpperCase();
    let pfCeiling;
    if (pfCeilingMode === "15000") {
      pfCeiling = 15000;
    } else if (pfCeilingMode === "25000") {
      pfCeiling = 25000;
      validations.push({
        tier: "INFO",
        code: "INTERNAL_CAP_25K_ADVISORY",
        message: "₹25,000 PF wage ceiling is an internal organizational cap, not an official statutory ceiling (Statutory cap is ₹15,000).",
      });
    } else {
      pfCeiling = Infinity; // ACTUAL mode: no ceiling
    }
    const pfWage = Math.min(basicPlusDA, pfCeiling);

    // ── 7. Employee PF ──────────────────────────────────────────────────────
    const empPFRate  = Math.max(0, Number(policy.employee_pf_rate) || 0.12);
    const employeePF = this.round(pfWage * empPFRate);

    // ── 8. Professional Tax (with 2-Pass Convergence Check) ─────────────────
    const stateCode = String(policy.state_code || "MH").toUpperCase();
    let ptResult;

    if (policy.pt_slabs_override_json && Array.isArray(policy.pt_slabs_override_json) && policy.pt_slabs_override_json.length > 0) {
      ptResult = statutoryRulesService.calculateCustomPT(useGrossForPt ? (net + employeePF) : net, policy.pt_slabs_override_json, month);
    } else {
      // Pass 1: Initial estimate using net (or net+PF)
      const ptBase = useGrossForPt ? this.round(net + employeePF) : net;
      ptResult = statutoryRulesService.calculateMultiStatePT(ptBase, stateCode, gender, month);

      // Pass 2: When useGrossForPt is active, run convergence check against provisional gross
      if (useGrossForPt) {
        const provisionalGross = this.round(net + employeePF + ptResult.ptAmount);
        const recheckedPt = statutoryRulesService.calculateMultiStatePT(provisionalGross, stateCode, gender, month);
        if (recheckedPt.ptAmount !== ptResult.ptAmount) {
          ptResult = recheckedPt;
        }
      }
    }
    const pt = ptResult.ptAmount;

    // ── 9. Gross Salary ─────────────────────────────────────────────────────
    const grossSalary = this.round(net + employeePF + pt);

    // ── 10. Employer PF (cost-modelling rate) ──────────────────────────────
    const emprPFRate = Math.max(0, Number(policy.employer_pf_rate) || 0.13);
    const employerPF = this.round(pfWage * emprPFRate);

    // ── 11. Bonus (Payment of Bonus Act cap: ₹7,000/month) ─────────────────
    const bonusRate   = Math.max(0, Number(policy.bonus_rate) || 0.0833);
    const bonusActCap = 7000;
    const bonusBase   = Math.min(basicPlusDA, bonusActCap);
    const bonus       = this.round(bonusBase * bonusRate);
    if (basicPlusDA > bonusActCap) {
      validations.push({
        tier: "INFO",
        code: "BONUS_CAPPED",
        message: `Bonus capped at Payment of Bonus Act ceiling of ₹7,000/month. ` +
          `Basic+DA ₹${basicPlusDA.toLocaleString("en-IN")} > ₹7,000; bonus base = ₹7,000.`,
      });
    }

    // ── 12. Gratuity (employer cost accrual only) ───────────────────────────
    const gratuityRate = Math.max(0, Number(policy.gratuity_rate) || 0.0481);
    const gratuity     = this.round(basicPlusDA * gratuityRate);

    // ── 13. Monthly CTC ─────────────────────────────────────────────────────
    // monthlyCtc = netSalary + employeePF + employerPF + pt + bonus + gratuity
    // Breakdown:
    //   Employee gross (in-hand + deductions back-added): net + empPF + pt = grossSalary
    //   Employer add-ons (not received by employee): emprPF + bonus + gratuity
    const monthlyCtc = this.round(net + employeePF + employerPF + pt + bonus + gratuity);

    // ── 14. Yearly CTC ──────────────────────────────────────────────────────
    const yearlyCtc = monthlyCtc * 12;

    // ── Basic % check ────────────────────────────────────────────────────────
    const basicPctOfGross = grossSalary > 0 ? (basic / grossSalary) * 100 : 0;
    if (basicPctOfGross < 35) {
      validations.push({
        tier: "WARNING",
        code: "LOW_BASIC",
        message: `Basic salary (${basicPctOfGross.toFixed(1)}% of gross) is below 35%. ` +
          `Consider increasing basic_percent_of_net in the location policy.`,
      });
    }

    // ── Zero-penny reconciliation check ─────────────────────────────────────
    // Verify: gross earnings + employer costs = monthly CTC
    const earningSide  = net + employeePF + pt;   // grossSalary
    const employerSide = employerPF + bonus + gratuity;
    const ctcCheck     = earningSide + employerSide;
    const variance     = Math.abs(ctcCheck - monthlyCtc);
    // Should always be 0 by construction; guard against floating-point edge cases
    if (variance > 1) {
      validations.push({
        tier: "ERROR",
        code: "CTC_INTERNAL_VARIANCE",
        message: `Internal CTC reconciliation variance ₹${variance}. Please report this as a calculation bug.`,
        variance,
      });
    }

    const hasBlockingError = validations.some((v) => v.tier === "ERROR");

    return {
      isValid: !hasBlockingError,
      mode: "NET_TO_CTC",
      policyCode: policy.code || null,
      policyName: policy.name || null,
      stateCode,
      month,
      gender,

      // ── Inputs ────────────────────────────────────────
      inputs: {
        targetNetSalary:         net,
        basicPercentOfNet:       basicPct,
        daFixedAmount:           da,
        hraPercentOfBasicDA:     hraPct,
        pfCeilingMode,
        pfWageCeiling:           pfCeiling === Infinity ? "No ceiling (ACTUAL)" : pfCeiling,
        employeePFRate:          empPFRate,
        employerPFRate:          emprPFRate,
        bonusRate,
        gratuityRate,
      },

      // ── Earnings (employee receives) ──────────────────
      earnings: {
        basic,
        da,
        basicPlusDA,
        hra,
        washing,
        education,
        conveyance,
        medical,
        books,
        fixedAllowances,
        otherAllowance,
        totalEarnings: this.round(basic + da + hra + fixedAllowances + Math.max(0, otherAllowance)),
      },

      // ── Employee deductions ───────────────────────────
      deductions: {
        employeePF,
        professionalTax:  pt,
        ptSlab:           ptResult.slab,
        totalDeductions:  this.round(employeePF + pt),
      },

      // ── Summary line ──────────────────────────────────
      grossSalary,        // employee gross (in-hand + deductions)
      netSalary:   net,   // confirmed take-home

      // ── Employer costs (not received by employee) ─────
      employerCosts: {
        employerPF,
        bonus,
        bonusCapped:   basicPlusDA > bonusActCap,
        gratuity,
        gratuityNote:  "Employer cost accrual per AS 15. Not a statutory payable until 5-year vesting.",
        totalEmployerCosts: this.round(employerPF + bonus + gratuity),
      },

      // ── CTC Summary ───────────────────────────────────
      monthlyCtc,
      yearlyCtc,
      ctcBreakdown: {
        grossSalary,                              // net + empPF + PT
        employerPFCost:  employerPF,
        bonusCost:       bonus,
        gratuityCost:    gratuity,
        total:           monthlyCtc,
      },

      // ── Validation ────────────────────────────────────
      validations,
      validationStatus: hasBlockingError ? "INVALID" : validations.some((v) => v.tier === "WARNING") ? "WARNING" : "VALID",
    };
  }
}

export default new CtcReconciliationEngine();
