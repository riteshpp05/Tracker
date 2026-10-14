// Backend/src/services/payroll/payrollInputCollector.js
import pool from "../../config/database.js";

/**
 * Payroll Input Collector
 * Aggregates all live data from PatilOne:
 * - Active employees & compensation assignments
 * - Approved leaves (Paid vs LOP)
 * - Daily timesheets (logged & approved hours)
 * - Approved expense reimbursements
 */
class PayrollInputCollector {
  /**
   * Collect payroll inputs for a given month and year
   *
   * @param {Number} month (1-12)
   * @param {Number} year (e.g. 2026)
   * @param {String} departmentId Optional filter
   */
  async collectInputs(month, year, departmentId = null) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // 1. Fetch active employees with effective salary structure assignment
    let empQuery = `
      SELECT 
        e.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        d.name AS department_name,
        e.designation,
        e.doj,
        e.pan_number,
        e.bank_name,
        e.bank_account_no,
        e.ifsc_code,
        e.uan_number,
        e.pf_number,
        e.esi_number,
        e.tax_regime,
        e.payment_mode,
        esa.id AS assignment_id,
        esa.structure_id,
        ss.name AS structure_name,
        ss.code AS structure_code,
        esa.base_monthly_salary,
        esa.ctc_annual,
        esa.from_date AS assignment_from_date
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department
      LEFT JOIN LATERAL (
        SELECT * FROM employee_salary_assignments
        WHERE employee_id = e.employee_id
          AND is_active = TRUE
          AND from_date <= $2
          AND (to_date IS NULL OR to_date >= $1)
        ORDER BY from_date DESC
        LIMIT 1
      ) esa ON TRUE
      LEFT JOIN salary_structures ss ON ss.id = esa.structure_id
      WHERE e.is_active = TRUE
        AND e.doj <= $2
        AND (e.separation_date IS NULL OR e.separation_date >= $1)
    `;

    const empParams = [startDate, endDate];
    if (departmentId) {
      empQuery += ` AND e.department = $3`;
      empParams.push(departmentId);
    }
    empQuery += ` ORDER BY e.employee_code ASC`;

    const empResult = await pool.query(empQuery, empParams);
    const employees = empResult.rows;

    // 2. Fetch all salary structure items for structures in use
    const structureIds = [...new Set(employees.map((e) => e.structure_id).filter(Boolean))];
    let structureItemsMap = {};

    if (structureIds.length > 0) {
      const itemsRes = await pool.query(
        `SELECT 
           ssi.structure_id,
           ssi.component_id,
           ssi.calculation_type,
           ssi.percentage_or_amount,
           ssi.formula,
           pc.code,
           pc.name,
           pc.type,
           pc.depends_on_payment_days,
           pc.is_statutory,
           pc.is_tax_applicable,
           pc.display_order
         FROM salary_structure_items ssi
         JOIN payroll_components pc ON pc.id = ssi.component_id
         WHERE ssi.structure_id = ANY($1) AND ssi.is_active = TRUE AND pc.is_active = TRUE
         ORDER BY pc.display_order ASC`,
        [structureIds]
      );

      for (const item of itemsRes.rows) {
        if (!structureItemsMap[item.structure_id]) {
          structureItemsMap[item.structure_id] = [];
        }
        structureItemsMap[item.structure_id].push(item);
      }
    }

    // 3. Fetch approved leaves within the period (distinguishing paid vs LOP)
    const leavesRes = await pool.query(
      `SELECT 
         lr.employee_id,
         lr.total_days,
         lr.start_date,
         lr.end_date,
         lt.is_paid,
         lt.code AS leave_type_code,
         lt.name AS leave_type_name
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.status = 'Approved'
         AND lr.start_date <= $2
         AND lr.end_date >= $1`,
      [startDate, endDate]
    );

    const leavesByEmp = {};
    for (const leave of leavesRes.rows) {
      if (!leavesByEmp[leave.employee_id]) {
        leavesByEmp[leave.employee_id] = { paidDays: 0, lwpDays: 0, leaves: [] };
      }
      leavesByEmp[leave.employee_id].leaves.push(leave);
      const days = Number(leave.total_days) || 0;
      if (leave.is_paid) {
        leavesByEmp[leave.employee_id].paidDays += days;
      } else {
        leavesByEmp[leave.employee_id].lwpDays += days;
      }
    }

    // 4. Fetch daily timesheet hours
    const timesheetRes = await pool.query(
      `SELECT 
         employee_id,
         COUNT(entry_id) AS total_entries,
         COALESCE(SUM(total_hours), 0) AS total_hours,
         COALESCE(SUM(billable_hours), 0) AS billable_hours
       FROM daily_timesheet_entries
       WHERE entry_date BETWEEN $1 AND $2
         AND status IN (2, 3) -- Submitted or Approved
       GROUP BY employee_id`,
      [startDate, endDate]
    );

    const timesheetByEmp = {};
    for (const ts of timesheetRes.rows) {
      timesheetByEmp[ts.employee_id] = {
        totalHours: Number(ts.total_hours) || 0,
        billableHours: Number(ts.billable_hours) || 0,
        entries: Number(ts.total_entries) || 0,
      };
    }

    // 5. Fetch approved expense reimbursements ready for payout
    const expenseRes = await pool.query(
      `SELECT 
         employee_id,
         COALESCE(SUM(amount), 0) AS total_reimbursement,
         COUNT(id) AS claim_count
       FROM expense_claims
       WHERE status = 'Approved'
         AND reimbursement_status IN ('Unpaid', 'Processing')
         AND expense_date <= $2
       GROUP BY employee_id`,
      [endDate]
    );

    const expenseByEmp = {};
    for (const exp of expenseRes.rows) {
      expenseByEmp[exp.employee_id] = {
        totalReimbursement: Number(exp.total_reimbursement) || 0,
        claimCount: Number(exp.claim_count) || 0,
      };
    }

    // Combine all inputs per employee
    const employeePackets = employees.map((emp) => {
      const leaveInfo = leavesByEmp[emp.employee_id] || { paidDays: 0, lwpDays: 0, leaves: [] };
      const tsInfo = timesheetByEmp[emp.employee_id] || { totalHours: 0, billableHours: 0, entries: 0 };
      const expInfo = expenseByEmp[emp.employee_id] || { totalReimbursement: 0, claimCount: 0 };
      const structureItems = structureItemsMap[emp.structure_id] || [];

      return {
        employee: emp,
        assignment: {
          id: emp.assignment_id,
          structureId: emp.structure_id,
          structureName: emp.structure_name,
          structureCode: emp.structure_code,
          base_monthly_salary: Number(emp.base_monthly_salary) || 0,
          ctc_annual: Number(emp.ctc_annual) || 0,
        },
        structureItems,
        attendance: {
          totalWorkingDays: lastDay,
          lwpDays: leaveInfo.lwpDays,
          paidLeaveDays: leaveInfo.paidDays,
          timesheetHours: tsInfo.totalHours,
          billableHours: tsInfo.billableHours,
        },
        reimbursements: expInfo.totalReimbursement,
        claimCount: expInfo.claimCount,
      };
    });

    return {
      month,
      year,
      startDate,
      endDate,
      totalCalendarDays: lastDay,
      employeeCount: employeePackets.length,
      employees: employeePackets,
    };
  }
}

export default new PayrollInputCollector();
