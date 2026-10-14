// Backend/src/services/payroll/payrollValidationService.js
import pool from "../../config/database.js";

/**
 * Payroll Validation & Readiness Service
 * Enforces strict compliance before calculation, submission, and locking.
 */
class PayrollValidationService {
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
    let readyEmployees = 0;
    let issueEmployees = 0;

    // Check duplicate run
    const dupCheck = await this.checkDuplicateRun(month, year);
    if (dupCheck.isDuplicate && dupCheck.existingRun.status !== "DRAFT" && dupCheck.existingRun.status !== "CANCELLED") {
      blockingErrors.push({
        type: "DUPLICATE_PAYROLL_RUN",
        message: dupCheck.message,
        severity: "BLOCKING",
      });
    }

    // Check for pending unapproved leaves in this period
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const pendingLeavesRes = await pool.query(
      `SELECT lr.id, lr.employee_id, e.employee_code, e.first_name, e.last_name, lr.start_date, lr.end_date, lr.total_days
       FROM leave_requests lr
       JOIN employees e ON e.employee_id = lr.employee_id
       WHERE lr.status = 'Pending'
         AND lr.start_date <= $2 AND lr.end_date >= $1`,
      [startDate, endDate]
    );

    if (pendingLeavesRes.rows.length > 0) {
      for (const pl of pendingLeavesRes.rows) {
        warnings.push({
          type: "PENDING_LEAVE_APPROVAL",
          employeeCode: pl.employee_code,
          employeeName: `${pl.first_name} ${pl.last_name}`,
          message: `${pl.employee_code} has ${pl.total_days} days pending leave approval (${pl.start_date} to ${pl.end_date}).`,
          link: "/admin/leaves",
          severity: "WARNING",
        });
      }
    }

    for (const packet of inputPackets) {
      const emp = packet.employee;
      const asgn = packet.assignment;
      let hasEmployeeIssue = false;

      // 1. Missing Salary Structure Assignment
      if (!asgn || !asgn.structureId || asgn.base_monthly_salary <= 0) {
        blockingErrors.push({
          type: "MISSING_SALARY_ASSIGNMENT",
          employeeId: emp.employee_id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          message: `${emp.employee_code} (${emp.first_name} ${emp.last_name}) has no active salary structure or base salary.`,
          link: "/admin/payroll/salaries",
          severity: "BLOCKING",
        });
        hasEmployeeIssue = true;
      }

      // 2. Missing Banking Details
      if (emp.payment_mode === "Bank" || !emp.payment_mode) {
        if (!emp.bank_account_no || !emp.ifsc_code) {
          warnings.push({
            type: "MISSING_BANK_DETAILS",
            employeeId: emp.employee_id,
            employeeCode: emp.employee_code,
            employeeName: `${emp.first_name} ${emp.last_name}`,
            message: `${emp.employee_code} (${emp.first_name} ${emp.last_name}) is missing bank account or IFSC code.`,
            link: "/admin/users",
            severity: "WARNING",
          });
          hasEmployeeIssue = true;
        }
      }

      // 3. Missing PAN Number (Indian Statutory Warning)
      if (!emp.pan_number) {
        warnings.push({
          type: "MISSING_PAN",
          employeeId: emp.employee_id,
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          message: `${emp.employee_code} is missing PAN number. Statutory Section 206AA may require higher withholding.`,
          link: "/admin/users",
          severity: "WARNING",
        });
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
      readyEmployees,
      issueEmployees,
      totalEmployees: inputPackets.length,
      blockingErrors,
      warnings,
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
          message: `${slip.employeeCode} has negative net pay: ₹${slip.netPay}. Deductions exceed earnings.`,
          severity: "BLOCKING",
        });
      }

      if (slip.paymentDays === 0 && slip.totalWorkingDays > 0) {
        warnings.push({
          type: "ZERO_PAYMENT_DAYS",
          employeeCode: slip.employeeCode,
          employeeName: slip.employeeName,
          message: `${slip.employeeCode} has 0 payment days (${slip.lwpDays} LOP days).`,
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
