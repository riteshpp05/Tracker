// Backend/src/services/payroll/payrollValidationService.js
import pool from "../../config/database.js";
import bankExportService from "./bankPaymentExportService.js";

/**
 * Payroll Validation & Readiness Service
 * Enforces strict compliance before calculation, submission, and locking.
 *
 * Categorises all findings into three standard audit tiers:
 * - BLOCKING      : Severe defect preventing calculation / locking (must be resolved)
 * - WARNING       : Compliance or policy risk that can proceed under documented review
 * - INFORMATIONAL : Contextual event requiring awareness (joiners, leavers, exemptions)
 */
class PayrollValidationService {
  /**
   * PAN format regex (Indian Income Tax):
   * 5 uppercase letters + 4 digits + 1 uppercase letter (e.g., AAACS1234P)
   */
  isValidPAN(pan) {
    if (!pan) return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan).trim().toUpperCase());
  }

  /**
   * UAN format regex (EPFO):
   * Exactly 12 numeric digits
   */
  isValidUAN(uan) {
    if (!uan) return false;
    return /^[0-9]{12}$/.test(String(uan).trim());
  }

  /**
   * ESIC IP Number format regex:
   * Exactly 17 numeric digits
   */
  isValidESICNumber(esi) {
    if (!esi) return false;
    return /^[0-9]{17}$/.test(String(esi).trim());
  }

  /**
   * Check if a payroll run already exists for this period
   */
  async checkDuplicateRun(month, year, excludeRunId = null) {
    let query = `SELECT id, run_code, status FROM payroll_runs WHERE month = $1 AND year = $2`;
    const params = [month, year];
    if (excludeRunId) {
      query += ` AND id != $3`;
      params.push(excludeRunId);
    }
    const res = await pool.query(query, params);
    if (res.rows.length > 0) {
      const run = res.rows[0];
      return {
        isDuplicate: true,
        existingRun: run,
        message: `Payroll run ${run.run_code} already exists for ${month}/${year} with status '${run.status}'.`,
      };
    }
    return { isDuplicate: false };
  }

  /**
   * Check input packet readiness for draft calculation
   */
  async validateReadiness(inputPackets, month, year) {
    const blockingErrors = [];
    const warnings = [];
    const informational = [];
    let readyEmployees = 0;
    let issueEmployees = 0;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // 1. Check duplicate run
    const dupCheck = await this.checkDuplicateRun(month, year);
    if (dupCheck.isDuplicate && dupCheck.existingRun.status !== "DRAFT" && dupCheck.existingRun.status !== "CANCELLED" && dupCheck.existingRun.status !== "REJECTED") {
      blockingErrors.push({
        type: "DUPLICATE_PAYROLL_RUN",
        message: dupCheck.message,
        severity: "BLOCKING",
      });
    }

    // 2. Check for pending unapproved leaves in this period
    try {
      const pendingLeavesRes = await pool.query(
        `SELECT lr.id, lr.employee_id, e.employee_code, e.first_name, e.last_name, lr.start_date, lr.end_date, lr.total_days
         FROM leave_requests lr
         JOIN employees e ON e.employee_id = lr.employee_id
         WHERE lr.status = 'Pending'
           AND lr.start_date <= $2 AND lr.end_date >= $1`,
        [startDate, endDate]
      );

      for (const pl of pendingLeavesRes.rows) {
        warnings.push({
          type: "PENDING_LEAVE_APPROVAL",
          employeeCode: pl.employee_code,
          employeeName: `${pl.first_name} ${pl.last_name}`.trim(),
          message: `${pl.employee_code} has ${pl.total_days} days pending leave approval (${pl.start_date} to ${pl.end_date}). May distort payable days if not approved before final run.`,
          link: "/admin/leaves",
          severity: "WARNING",
        });
      }
    } catch (e) {
      // Non-blocking query failure
    }

    // 3. Check for unapproved expense claims
    try {
      const pendingExpensesRes = await pool.query(
        `SELECT ec.id, ec.employee_id, e.employee_code, e.first_name, e.last_name, ec.amount, ec.category
         FROM expense_claims ec
         JOIN employees e ON e.employee_id = ec.employee_id
         WHERE ec.status = 'Pending'
           AND ec.expense_date <= $1`,
        [endDate]
      );

      if (pendingExpensesRes.rows.length > 0) {
        warnings.push({
          type: "PENDING_EXPENSE_CLAIMS",
          count: pendingExpensesRes.rows.length,
          message: `${pendingExpensesRes.rows.length} expense claim(s) remain pending approval. Unapproved claims will be excluded from this payroll payout.`,
          severity: "WARNING",
        });
      }
    } catch (e) {
      // Non-blocking query failure
    }

    // 4. Check for active statutory configuration in database
    try {
      const statRes = await pool.query(
        `SELECT statutory_code FROM payroll_statutory_configs WHERE is_active = TRUE`
      );
      const configuredCodes = new Set(statRes.rows.map((r) => r.statutory_code));
      const requiredStatutories = ["EPF", "ESIC", "PT_MAHARASHTRA", "TDS"];
      for (const reqCode of requiredStatutories) {
        if (!configuredCodes.has(reqCode)) {
          informational.push({
            type: "USING_FALLBACK_STATUTORY_CONFIG",
            statutoryCode: reqCode,
            message: `DB statutory config for '${reqCode}' not found. Using authoritative FY 2026-27 built-in statutory engine.`,
            severity: "INFORMATIONAL",
          });
        }
      }
    } catch (e) {
      // Non-blocking
    }

    // 5. Per-employee validations
    for (const packet of inputPackets) {
      const emp = packet.employee;
      const asgn = packet.assignment;
      let hasEmployeeIssue = false;

      // A. Missing Salary Structure Assignment
      if (!asgn || !asgn.structureId || asgn.base_monthly_salary <= 0) {
        blockingErrors.push({
          type: "MISSING_SALARY_ASSIGNMENT",
          employeeId: emp.employee_id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
          message: `${emp.employee_code} (${emp.first_name} ${emp.last_name}) has no active salary structure or base salary.`,
          link: "/admin/payroll/salaries",
          severity: "BLOCKING",
        });
        hasEmployeeIssue = true;
      }

      // B. Banking Details Validation
      if (emp.payment_mode === "Bank" || !emp.payment_mode) {
        if (!emp.bank_account_no || !emp.ifsc_code) {
          warnings.push({
            type: "MISSING_BANK_DETAILS",
            employeeId: emp.employee_id,
            employeeCode: emp.employee_code,
            employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
            message: `${emp.employee_code} is missing bank account number or IFSC code. Bank disbursement CSV cannot be generated for this employee.`,
            link: "/admin/users",
            severity: "WARNING",
          });
          hasEmployeeIssue = true;
        } else {
          // Validate IFSC format
          const ifscValidation = bankExportService.validateIFSC(emp.ifsc_code);
          if (!ifscValidation.valid) {
            warnings.push({
              type: "INVALID_IFSC_CODE",
              employeeId: emp.employee_id,
              employeeCode: emp.employee_code,
              employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
              message: `${emp.employee_code} IFSC code '${emp.ifsc_code}' is invalid: ${ifscValidation.error}.`,
              severity: "WARNING",
            });
            hasEmployeeIssue = true;
          }

          // Validate Account Number format
          const accValidation = bankExportService.validateAccountNumber(emp.bank_account_no);
          if (!accValidation.valid) {
            warnings.push({
              type: "INVALID_BANK_ACCOUNT",
              employeeId: emp.employee_id,
              employeeCode: emp.employee_code,
              employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
              message: `${emp.employee_code} bank account '${emp.bank_account_no}' is invalid: ${accValidation.error}.`,
              severity: "WARNING",
            });
            hasEmployeeIssue = true;
          }
        }
      }

      // C. PAN Validation (Section 206AA Compliance)
      if (!emp.pan_number) {
        warnings.push({
          type: "MISSING_PAN",
          employeeId: emp.employee_id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
          message: `${emp.employee_code} is missing PAN number. Statutory Section 206AA mandates withholding at the higher of 20% or slab rate.`,
          link: "/admin/users",
          severity: "WARNING",
        });
      } else if (!this.isValidPAN(emp.pan_number)) {
        warnings.push({
          type: "INVALID_PAN_FORMAT",
          employeeId: emp.employee_id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
          message: `${emp.employee_code} PAN '${emp.pan_number}' does not match standard 10-character Indian alphanumeric format (5 letters + 4 digits + 1 letter).`,
          severity: "WARNING",
        });
      }

      // D. UAN Validation if Basic > ₹15,000 or PF is deducted
      if (emp.uan_number && !this.isValidUAN(emp.uan_number)) {
        warnings.push({
          type: "INVALID_UAN_FORMAT",
          employeeId: emp.employee_id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
          message: `${emp.employee_code} UAN '${emp.uan_number}' is invalid (must be exactly 12 numeric digits). Will fail EPFO ECR portal validation.`,
          severity: "WARNING",
        });
      }

      // E. Mid-Month Joiner Detection
      if (emp.doj) {
        const dojDate = new Date(emp.doj);
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month - 1, lastDay);
        if (dojDate > periodStart && dojDate <= periodEnd) {
          informational.push({
            type: "MID_MONTH_JOINER",
            employeeId: emp.employee_id,
            employeeCode: emp.employee_code,
            employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
            message: `${emp.employee_code} joined on ${emp.doj}. Compensation will be pro-rated for ${lastDay - dojDate.getDate() + 1}/${lastDay} days.`,
            severity: "INFORMATIONAL",
          });
        }
      }

      // F. Mid-Month Leaver Detection
      if (emp.separation_date) {
        const sepDate = new Date(emp.separation_date);
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month - 1, lastDay);
        if (sepDate >= periodStart && sepDate < periodEnd) {
          informational.push({
            type: "MID_MONTH_LEAVER",
            employeeId: emp.employee_id,
            employeeCode: emp.employee_code,
            employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
            message: `${emp.employee_code} final working day is ${emp.separation_date}. Compensation will be pro-rated for ${sepDate.getDate()}/${lastDay} days.`,
            severity: "INFORMATIONAL",
          });
        }
      }

      if (hasEmployeeIssue) {
        issueEmployees++;
      } else {
        readyEmployees++;
      }
    }

    return {
      isValid: blockingErrors.length === 0,
      blockingCount: blockingErrors.length,
      warningCount: warnings.length,
      informationalCount: informational.length,
      readyEmployees,
      issueEmployees,
      totalEmployees: inputPackets.length,
      blockingErrors,
      warnings,
      informational,
    };
  }

  /**
   * Validate calculated slips before submission / approval
   */
  validateCalculatedSlips(slips) {
    const errors = [];
    const warnings = [];

    for (const slip of slips) {
      if (slip.netPay < 0) {
        errors.push({
          type: "NEGATIVE_NET_PAY",
          employeeCode: slip.employeeCode,
          employeeName: slip.employeeName,
          message: `${slip.employeeCode} has negative net pay: ₹${slip.netPay}. Total deductions exceed gross earnings.`,
          severity: "BLOCKING",
        });
      }

      if (slip.paymentDays === 0 && slip.totalWorkingDays > 0) {
        warnings.push({
          type: "ZERO_PAYMENT_DAYS",
          employeeCode: slip.employeeCode,
          employeeName: slip.employeeName,
          message: `${slip.employeeCode} has 0 payment days (${slip.lwpDays} LOP days). Salary will be ₹0.`,
          severity: "WARNING",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export default new PayrollValidationService();
