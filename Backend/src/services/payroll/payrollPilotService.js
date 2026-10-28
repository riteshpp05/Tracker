// Backend/src/services/payroll/payrollPilotService.js

/**
 * Payroll Reconciliation Pilot Service
 * Compares external payroll provider exports (e.g., Kredily) with PatilOne native calculations.
 *
 * Implements objective, dual-system delta analysis without assuming either system is infallible.
 * Highlights variances, pinpoints likely causes, and generates a reconciliation report.
 */
class PayrollPilotService {
  /**
   * Safe number parsing
   */
  num(val) {
    if (typeof val === "number") return val;
    if (!val) return 0;
    // Remove currency symbols, commas, spaces
    const cleaned = String(val).replace(/[₹$,\s]/g, "");
    return Number(cleaned) || 0;
  }

  /**
   * Analyze likely root cause of variance between PatilOne and Kredily
   */
  diagnoseRootCause(field, patilOneVal, kredilyVal, patilOneRecord, kredilyRecord) {
    const diff = Math.round((patilOneVal - kredilyVal) * 100) / 100;
    const absDiff = Math.abs(diff);

    if (absDiff === 0) return null;
    if (absDiff <= 2) {
      return {
        category: "ROUNDING_CONVENTION",
        explanation: `Minor rounding variance of ₹${absDiff} due to integer rounding vs fractional paise handling.`,
      };
    }

    switch (field) {
      case "employeeDeductions":
      case "employerContributions":
        if (Math.abs(absDiff - 1800) < 50 || Math.abs(absDiff - 4200) < 50) {
          return {
            category: "EPF_CEILING_TREATMENT",
            explanation: "Difference likely caused by EPF wage ceiling. PatilOne enforces statutory ₹15,000 cap (₹1,800 max) while external system may be using full actual wage or different ceiling mode.",
          };
        }
        if (absDiff === 100) {
          return {
            category: "MAHARASHTRA_PT_FEBRUARY",
            explanation: "Difference of ₹100 aligns with Maharashtra Professional Tax February adjustment (₹300 in Feb vs standard ₹200).",
          };
        }
        break;

      case "taxableIncome":
      case "tds":
        return {
          category: "REIMBURSEMENT_OR_SLAB_DIFFERENCE",
          explanation: "Taxable income discrepancy. Verify whether official business reimbursements (Sec 10(14)) were incorrectly added to taxable income in one system, or if Standard Deduction (₹75k vs ₹50k) differs.",
        };

      case "grossSalary":
      case "netPay":
        if (kredilyRecord?.lwpDays > 0 || patilOneRecord?.lwpDays > 0) {
          return {
            category: "PRORATION_DENOMINATOR",
            explanation: "Proration difference. Check if proration denominator uses calendar days in month (e.g. 30 vs 31) or fixed 30 days.",
          };
        }
        break;

      case "reimbursements":
        return {
          category: "REIMBURSEMENT_CLASSIFICATION",
          explanation: "Reimbursement discrepancy. Check if claims were processed via standalone expense payout or integrated into payroll slip.",
        };
    }

    return {
      category: "STRUCTURAL_VARIANCE",
      explanation: `Difference of ₹${absDiff.toLocaleString("en-IN")}. Component-level inspection required.`,
    };
  }

  /**
   * Run pilot comparison between PatilOne slips and Kredily export records
   *
   * @param {Array} patilOneSlips - Array of calculated slips from PatilOne
   * @param {Array} kredilyRecords - Array of anonymized employee records from Kredily
   * @returns {Object} Comprehensive Pilot Comparison Report
   */
  comparePayrollRuns(patilOneSlips = [], kredilyRecords = []) {
    const comparisons = [];
    let exactMatchesCount = 0;
    let roundingVarianceCount = 0;
    let materialVarianceCount = 0;

    // Index Kredily records by employee code
    const kredilyMap = new Map();
    for (const k of kredilyRecords) {
      const code = (k.employeeCode || k.employee_code || k["Employee Code"] || "").trim().toUpperCase();
      if (code) kredilyMap.set(code, k);
    }

    for (const p of patilOneSlips) {
      const pCode = (p.employee_code || p.employeeCode || "").trim().toUpperCase();
      const k = kredilyMap.get(pCode);

      if (!k) {
        comparisons.push({
          employeeCode: pCode,
          employeeName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.employeeName,
          status: "MISSING_IN_KREDILY",
          explanation: "Employee exists in PatilOne but not in Kredily export.",
          fields: {},
        });
        materialVarianceCount++;
        continue;
      }

      // Map Kredily fields
      const kBasic = this.num(k.basic || k["Basic"] || k.basicSalary);
      const kGross = this.num(k.gross || k["Gross Pay"] || k.grossSalary || k.gross_pay);
      const kDeductions = this.num(k.totalDeductions || k["Total Deductions"] || k.deductions);
      const kNet = this.num(k.netPay || k["Net Pay"] || k.net_pay);
      const kEmployerPf = this.num(k.employerPf || k["Employer PF"] || k.pf_employer);
      const kEmployerCost = this.num(k.employerCost || k["Employer Cost"] || k.total_employer_contributions || (kEmployerPf + this.num(k.employerEsic || k["Employer ESIC"])));
      const kReimbursements = this.num(k.reimbursements || k["Reimbursements"] || 0);
      const kTds = this.num(k.tds || k["TDS"] || k["Income Tax"] || 0);
      const kCtc = this.num(k.ctc || k["Monthly CTC"] || k.ctcMonthly || (kGross + kEmployerCost));

      // Map PatilOne fields
      const pBasic = this.num(p.earnings?.find?.((e) => e.componentCode === "BASIC")?.amount ?? p.basic_pay ?? 0);
      const pGross = this.num(p.gross_pay ?? p.grossPay ?? 0);
      const pDeductions = this.num(p.total_deductions ?? p.totalDeductions ?? 0);
      const pNet = this.num(p.rounded_net_pay ?? p.roundedNetPay ?? p.net_pay ?? p.netPay ?? 0);
      const pEmployerCost = this.num(p.employer_contributions ?? p.employerContributions ?? 0);
      const pReimbursements = this.num(
        p.earnings?.find?.((e) => e.componentCode === "EXPENSE_REIMBURSEMENT")?.amount ?? p.reimbursements ?? 0
      );
      const pTds = this.num(
        p.deductions?.find?.((d) => d.componentCode === "TDS")?.amount ?? 0
      );
      const pCtc = pGross + pEmployerCost;

      // Field comparison list
      const fieldList = [
        { key: "basicSalary", name: "Basic Salary", pVal: pBasic, kVal: kBasic },
        { key: "grossSalary", name: "Gross Salary", pVal: pGross, kVal: kGross },
        { key: "employeeDeductions", name: "Employee Deductions", pVal: pDeductions, kVal: kDeductions },
        { key: "employerContributions", name: "Employer Contributions", pVal: pEmployerCost, kVal: kEmployerCost },
        { key: "tds", name: "Income Tax TDS", pVal: pTds, kVal: kTds },
        { key: "reimbursements", name: "Expense Reimbursements", pVal: pReimbursements, kVal: kReimbursements },
        { key: "netPay", name: "Net Pay In Hand", pVal: pNet, kVal: kNet },
        { key: "employerPayrollCost", name: "Total Monthly Cost (CTC)", pVal: pCtc, kVal: kCtc },
      ];

      const fieldResults = {};
      let hasMaterialDiff = false;
      let hasRoundingDiff = false;

      for (const f of fieldList) {
        const delta = Math.round((f.pVal - f.kVal) * 100) / 100;
        const absDelta = Math.abs(delta);
        const rootCause = this.diagnoseRootCause(f.key, f.pVal, f.kVal, p, k);

        let matchStatus = "MATCH";
        if (absDelta > 2) {
          matchStatus = "MATERIAL_VARIANCE";
          hasMaterialDiff = true;
        } else if (absDelta > 0) {
          matchStatus = "ROUNDING_VARIANCE";
          hasRoundingDiff = true;
        }

        fieldResults[f.key] = {
          name: f.name,
          patilOne: f.pVal,
          kredily: f.kVal,
          variance: delta,
          absVariance: absDelta,
          status: matchStatus,
          rootCause,
        };
      }

      let rowStatus = "EXACT_MATCH";
      if (hasMaterialDiff) {
        rowStatus = "MATERIAL_VARIANCE";
        materialVarianceCount++;
      } else if (hasRoundingDiff) {
        rowStatus = "ROUNDING_VARIANCE";
        roundingVarianceCount++;
      } else {
        exactMatchesCount++;
      }

      comparisons.push({
        employeeCode: pCode,
        employeeName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.employeeName || pCode,
        status: rowStatus,
        fields: fieldResults,
      });
    }

    const totalCompared = patilOneSlips.length;
    const matchPercentage = totalCompared > 0
      ? Number((((exactMatchesCount + roundingVarianceCount) / totalCompared) * 100).toFixed(1))
      : 0;

    return {
      totalEmployeesCompared: totalCompared,
      exactMatchesCount,
      roundingVarianceCount,
      materialVarianceCount,
      matchPercentage,
      parallelTestingReadiness: materialVarianceCount === 0
        ? "READY_FOR_PARALLEL_TESTING"
        : "REQUIRES_VARIANCE_RESOLUTION",
      recommendation: materialVarianceCount === 0
        ? "Zero material variances detected. System is safe for Phase 1 parallel payroll shadow run."
        : `${materialVarianceCount} employee(s) have material variances > ₹2. Do not cut over until variances are reconciled and reviewed by payroll specialist.`,
      comparisons,
    };
  }
}

export default new PayrollPilotService();
