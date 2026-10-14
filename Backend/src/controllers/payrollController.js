// Backend/src/controllers/payrollController.js
import pool from "../config/database.js";
import payrollEngine from "../services/payroll/payrollCalculationEngine.js";
import inputCollector from "../services/payroll/payrollInputCollector.js";
import validationService from "../services/payroll/payrollValidationService.js";
import statutoryRulesService from "../services/payroll/statutoryRulesService.js";
import bankExportService from "../services/payroll/bankPaymentExportService.js";

class PayrollController {
  // ==============================================================
  // 1. COMPONENTS & STRUCTURES MANAGEMENT
  // ==============================================================

  async getComponents(req, res) {
    try {
      const result = await pool.query(
        `SELECT * FROM payroll_components ORDER BY display_order ASC, code ASC`
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getComponents:", err);
      res.status(500).json({ success: false, error: "Failed to fetch payroll components" });
    }
  }

  async getStructures(req, res) {
    try {
      const structuresRes = await pool.query(
        `SELECT * FROM salary_structures ORDER BY created_at DESC`
      );
      const itemsRes = await pool.query(
        `SELECT ssi.*, pc.code, pc.name, pc.type, pc.depends_on_payment_days, pc.is_statutory
         FROM salary_structure_items ssi
         JOIN payroll_components pc ON pc.id = ssi.component_id
         WHERE ssi.is_active = TRUE
         ORDER BY pc.display_order ASC`
      );

      const itemsByStruct = {};
      for (const item of itemsRes.rows) {
        if (!itemsByStruct[item.structure_id]) itemsByStruct[item.structure_id] = [];
        itemsByStruct[item.structure_id].push(item);
      }

      const structures = structuresRes.rows.map((s) => ({
        ...s,
        items: itemsByStruct[s.id] || [],
      }));

      res.json({ success: true, data: structures });
    } catch (err) {
      console.error("Error in getStructures:", err);
      res.status(500).json({ success: false, error: "Failed to fetch salary structures" });
    }
  }

  async createStructure(req, res) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { name, code, description, items = [] } = req.body;

      if (!name || !code) {
        return res.status(400).json({ success: false, error: "Structure name and code are required" });
      }

      const structRes = await client.query(
        `INSERT INTO salary_structures (name, code, description)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, code, description]
      );
      const structure = structRes.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO salary_structure_items (structure_id, component_id, calculation_type, percentage_or_amount, formula)
           VALUES ($1, $2, $3, $4, $5)`,
          [structure.id, item.component_id, item.calculation_type || "FIXED", item.percentage_or_amount || 0, item.formula || null]
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ success: true, data: structure, message: "Salary structure created successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in createStructure:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to create structure" });
    } finally {
      client.release();
    }
  }

  // ==============================================================
  // 2. EMPLOYEE COMPENSATION & ASSIGNMENTS
  // ==============================================================

  async getAssignments(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
           e.employee_id,
           e.employee_code,
           e.first_name,
           e.last_name,
           e.email,
           e.role,
           ur.name AS role_name,
           e.department,
           d.name AS department_name,
           e.designation,
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
           esa.from_date,
           esa.to_date
         FROM employees e
         LEFT JOIN user_roles ur ON ur.id = e.role
         LEFT JOIN departments d ON d.id = e.department
         LEFT JOIN LATERAL (
           SELECT * FROM employee_salary_assignments
           WHERE employee_id = e.employee_id AND is_active = TRUE
           ORDER BY from_date DESC
           LIMIT 1
         ) esa ON TRUE
         LEFT JOIN salary_structures ss ON ss.id = esa.structure_id
         WHERE e.is_active = TRUE
         ORDER BY e.employee_code ASC`
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getAssignments:", err);
      res.status(500).json({ success: false, error: "Failed to fetch employee assignments" });
    }
  }

  async createAssignment(req, res) {
    try {
      const { employee_id, structure_id, from_date, base_monthly_salary, ctc_annual, notes } = req.body;

      if (!employee_id || !structure_id || !from_date || !base_monthly_salary) {
        return res.status(400).json({ success: false, error: "Employee, Structure, Effective Date, and Base Salary are required" });
      }

      // Deactivate older active assignments
      await pool.query(
        `UPDATE employee_salary_assignments SET is_active = FALSE WHERE employee_id = $1`,
        [employee_id]
      );

      const result = await pool.query(
        `INSERT INTO employee_salary_assignments (
           employee_id, structure_id, from_date, base_monthly_salary, ctc_annual, notes, is_active, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7) RETURNING *`,
        [employee_id, structure_id, from_date, base_monthly_salary, ctc_annual || base_monthly_salary * 24, notes || "Salary assignment", req.user.id]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: "Salary assigned successfully" });
    } catch (err) {
      console.error("Error in createAssignment:", err);
      res.status(500).json({ success: false, error: "Failed to assign salary structure" });
    }
  }

  async updateEmployeeStatutoryBanking(req, res) {
    try {
      const { employeeId } = req.params;
      const {
        pan_number,
        bank_name,
        bank_account_no,
        ifsc_code,
        uan_number,
        pf_number,
        esi_number,
        tax_regime,
        payment_mode,
      } = req.body;

      const result = await pool.query(
        `UPDATE employees SET
           pan_number = COALESCE($1, pan_number),
           bank_name = COALESCE($2, bank_name),
           bank_account_no = COALESCE($3, bank_account_no),
           ifsc_code = COALESCE($4, ifsc_code),
           uan_number = COALESCE($5, uan_number),
           pf_number = COALESCE($6, pf_number),
           esi_number = COALESCE($7, esi_number),
           tax_regime = COALESCE($8, tax_regime),
           payment_mode = COALESCE($9, payment_mode)
         WHERE employee_id = $10
         RETURNING employee_id, employee_code, first_name, last_name, pan_number, bank_name, bank_account_no, ifsc_code, uan_number, pf_number, esi_number, tax_regime`,
        [pan_number, bank_name, bank_account_no, ifsc_code, uan_number, pf_number, esi_number, tax_regime, payment_mode, employeeId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      res.json({ success: true, data: result.rows[0], message: "Employee banking and statutory details updated" });
    } catch (err) {
      console.error("Error in updateEmployeeStatutoryBanking:", err);
      res.status(500).json({ success: false, error: "Failed to update employee details" });
    }
  }

  // ==============================================================
  // 3. MONTHLY PAYROLL PROCESSING & LIFECYCLE
  // ==============================================================

  async checkReadiness(req, res) {
    try {
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const year = Number(req.query.year) || new Date().getFullYear();

      const inputPacket = await inputCollector.collectInputs(month, year);
      const readiness = await validationService.validateReadiness(inputPacket.employees, month, year);

      res.json({
        success: true,
        data: {
          month,
          year,
          startDate: inputPacket.startDate,
          endDate: inputPacket.endDate,
          totalCalendarDays: inputPacket.totalCalendarDays,
          employeeCount: inputPacket.employeeCount,
          readiness,
        },
      });
    } catch (err) {
      console.error("Error in checkReadiness:", err);
      res.status(500).json({ success: false, error: "Failed to evaluate payroll readiness" });
    }
  }

  async calculateDraftRun(req, res) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const month = Number(req.body.month) || new Date().getMonth() + 1;
      const year = Number(req.body.year) || new Date().getFullYear();

      // Collect inputs
      const inputPacket = await inputCollector.collectInputs(month, year);

      // Validate readiness
      const readiness = await validationService.validateReadiness(inputPacket.employees, month, year);
      if (!readiness.isValid) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Payroll calculation is blocked by validation errors.",
          details: readiness.blockingErrors,
        });
      }

      // Check if existing draft run exists for this month/year, if so overwrite/refresh
      const existingRunRes = await client.query(
        `SELECT * FROM payroll_runs WHERE month = $1 AND year = $2`,
        [month, year]
      );

      let runId;
      const runCode = `PR-${year}-${String(month).padStart(2, "0")}`;

      if (existingRunRes.rows.length > 0) {
        const existingRun = existingRunRes.rows[0];
        if (existingRun.is_locked || existingRun.status === "FINALIZED" || existingRun.status === "PAID") {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: `Payroll run ${existingRun.run_code} is finalized/locked and cannot be recalculated.`,
          });
        }
        runId = existingRun.id;
        // Delete old draft slips
        await client.query(`DELETE FROM salary_slips WHERE payroll_run_id = $1`, [runId]);
      } else {
        const newRunRes = await client.query(
          `INSERT INTO payroll_runs (
             run_code, month, year, start_date, end_date, status, total_working_days, created_by
           ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7) RETURNING id`,
          [runCode, month, year, inputPacket.startDate, inputPacket.endDate, inputPacket.totalCalendarDays, req.user.id]
        );
        runId = newRunRes.rows[0].id;
      }

      // Calculate each employee salary slip
      const calculatedSlips = [];
      let totalGross = 0;
      let totalDeductions = 0;
      let totalEmployerContributions = 0;
      let totalNet = 0;

      for (const packet of inputPacket.employees) {
        const slipCalc = payrollEngine.calculateSalarySlip({
          employee: packet.employee,
          assignment: packet.assignment,
          structureItems: packet.structureItems,
          totalWorkingDays: packet.attendance.totalWorkingDays,
          lwpDays: packet.attendance.lwpDays,
          reimbursements: packet.reimbursements,
          month,
          year,
        });

        calculatedSlips.push(slipCalc);

        totalGross += slipCalc.grossPay;
        totalDeductions += slipCalc.totalDeductions;
        totalEmployerContributions += slipCalc.employerContributions;
        totalNet += slipCalc.roundedNetPay;

        const slipNumber = `SLIP/${year}/${String(month).padStart(2, "0")}/${packet.employee.employee_code}`;

        // Insert Salary Slip
        const slipInsertRes = await client.query(
          `INSERT INTO salary_slips (
             slip_number, payroll_run_id, employee_id, structure_id, month, year, start_date, end_date,
             total_working_days, payment_days, lwp_days, timesheet_hours, gross_pay, total_deductions,
             employer_contributions, net_pay, rounded_net_pay, net_pay_in_words, status,
             bank_name, bank_account_no, ifsc_code, pan_number, uan_number, tax_regime, calculation_snapshot
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'DRAFT', $19, $20, $21, $22, $23, $24, $25)
           RETURNING id`,
          [
            slipNumber,
            runId,
            packet.employee.employee_id,
            packet.assignment.structureId,
            month,
            year,
            inputPacket.startDate,
            inputPacket.endDate,
            slipCalc.totalWorkingDays,
            slipCalc.paymentDays,
            slipCalc.lwpDays,
            packet.attendance.timesheetHours || 0,
            slipCalc.grossPay,
            slipCalc.totalDeductions,
            slipCalc.employerContributions,
            slipCalc.netPay,
            slipCalc.roundedNetPay,
            slipCalc.netPayInWords,
            packet.employee.bank_name,
            packet.employee.bank_account_no,
            packet.employee.ifsc_code,
            packet.employee.pan_number,
            packet.employee.uan_number,
            packet.employee.tax_regime || "New",
            JSON.stringify(slipCalc),
          ]
        );

        const slipId = slipInsertRes.rows[0].id;

        // Insert Earnings Line Items
        for (const item of slipCalc.earnings) {
          await client.query(
            `INSERT INTO salary_slip_items (salary_slip_id, component_code, component_name, type, amount, is_statutory, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [slipId, item.componentCode, item.componentName, item.type, item.amount, item.isStatutory, item.notes]
          );
        }

        // Insert Deductions Line Items
        for (const item of slipCalc.deductions) {
          await client.query(
            `INSERT INTO salary_slip_items (salary_slip_id, component_code, component_name, type, amount, is_statutory, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [slipId, item.componentCode, item.componentName, item.type, item.amount, item.isStatutory, item.notes]
          );
        }

        // Insert Employer Contribution Line Items
        for (const item of slipCalc.employerBreakdown) {
          await client.query(
            `INSERT INTO salary_slip_items (salary_slip_id, component_code, component_name, type, amount, is_statutory, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [slipId, item.componentCode, item.componentName, item.type, item.amount, item.isStatutory, item.notes]
          );
        }
      }

      // Update Run Aggregates
      await client.query(
        `UPDATE payroll_runs SET
           total_employees = $1,
           total_gross_pay = $2,
           total_deductions = $3,
           total_employer_contributions = $4,
           total_net_pay = $5,
           status = 'DRAFT',
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [calculatedSlips.length, totalGross, totalDeductions, totalEmployerContributions, totalNet, runId]
      );

      // Audit Log
      await client.query(
        `INSERT INTO payroll_audit_logs (actor_id, actor_name, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'CALCULATE_DRAFT', 'PAYROLL_RUN', $3, $4)`,
        [req.user.id, req.user.email, runId, JSON.stringify({ month, year, employees: calculatedSlips.length, totalNet })]
      );

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        data: {
          runId,
          runCode,
          month,
          year,
          employeeCount: calculatedSlips.length,
          totalGrossPay: totalGross,
          totalDeductions,
          totalEmployerContributions,
          totalNetPay: totalNet,
        },
        message: `Draft payroll for ${month}/${year} calculated successfully for ${calculatedSlips.length} employees.`,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in calculateDraftRun:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to calculate draft payroll" });
    } finally {
      client.release();
    }
  }

  async getPayrollRuns(req, res) {
    try {
      const result = await pool.query(
        `SELECT pr.*, 
           sub.first_name AS submitted_by_name,
           appr.first_name AS approved_by_name,
           fin.first_name AS finalized_by_name
         FROM payroll_runs pr
         LEFT JOIN employees sub ON sub.employee_id = pr.submitted_by
         LEFT JOIN employees appr ON appr.employee_id = pr.approved_by
         LEFT JOIN employees fin ON fin.employee_id = pr.finalized_by
         ORDER BY pr.year DESC, pr.month DESC`
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getPayrollRuns:", err);
      res.status(500).json({ success: false, error: "Failed to fetch payroll runs" });
    }
  }

  async getPayrollRunById(req, res) {
    try {
      const { id } = req.params;
      const runRes = await pool.query(
        `SELECT pr.*, 
           sub.first_name || ' ' || sub.last_name AS submitted_by_name,
           appr.first_name || ' ' || appr.last_name AS approved_by_name,
           fin.first_name || ' ' || fin.last_name AS finalized_by_name
         FROM payroll_runs pr
         LEFT JOIN employees sub ON sub.employee_id = pr.submitted_by
         LEFT JOIN employees appr ON appr.employee_id = pr.approved_by
         LEFT JOIN employees fin ON fin.employee_id = pr.finalized_by
         WHERE pr.id = $1`,
        [id]
      );

      if (runRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Payroll run not found" });
      }

      const run = runRes.rows[0];

      // Get slips
      const slipsRes = await pool.query(
        `SELECT ss.*, e.employee_code, e.first_name, e.last_name, e.email, e.designation, d.name AS department_name
         FROM salary_slips ss
         JOIN employees e ON e.employee_id = ss.employee_id
         LEFT JOIN departments d ON d.id = e.department
         WHERE ss.payroll_run_id = $1
         ORDER BY e.employee_code ASC`,
        [id]
      );

      // Department cost breakdown
      const deptBreakdown = {};
      for (const slip of slipsRes.rows) {
        const dept = slip.department_name || "Unassigned";
        if (!deptBreakdown[dept]) {
          deptBreakdown[dept] = { count: 0, gross: 0, net: 0, employerCost: 0 };
        }
        deptBreakdown[dept].count++;
        deptBreakdown[dept].gross += Number(slip.gross_pay);
        deptBreakdown[dept].net += Number(slip.rounded_net_pay);
        deptBreakdown[dept].employerCost += Number(slip.employer_contributions);
      }

      res.json({
        success: true,
        data: {
          run,
          slips: slipsRes.rows,
          departmentBreakdown: deptBreakdown,
        },
      });
    } catch (err) {
      console.error("Error in getPayrollRunById:", err);
      res.status(500).json({ success: false, error: "Failed to fetch payroll run details" });
    }
  }

  async submitPayrollRun(req, res) {
    try {
      const { id } = req.params;
      const runRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
      if (runRes.rows.length === 0) return res.status(404).json({ success: false, error: "Payroll run not found" });

      const run = runRes.rows[0];
      if (run.status !== "DRAFT") {
        return res.status(400).json({ success: false, error: `Run cannot be submitted in status ${run.status}` });
      }

      await pool.query(
        `UPDATE payroll_runs SET status = 'SUBMITTED', submitted_by = $1, submitted_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [req.user.id, id]
      );

      await pool.query(
        `INSERT INTO payroll_audit_logs (actor_id, actor_name, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'SUBMIT_FOR_APPROVAL', 'PAYROLL_RUN', $3, $4)`,
        [req.user.id, req.user.email, id, JSON.stringify({ previousStatus: "DRAFT", newStatus: "SUBMITTED" })]
      );

      res.json({ success: true, message: "Payroll run submitted for approval" });
    } catch (err) {
      console.error("Error in submitPayrollRun:", err);
      res.status(500).json({ success: false, error: "Failed to submit payroll run" });
    }
  }

  async approvePayrollRun(req, res) {
    try {
      const { id } = req.params;
      const { approvalNotes } = req.body;
      const runRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
      if (runRes.rows.length === 0) return res.status(404).json({ success: false, error: "Payroll run not found" });

      const run = runRes.rows[0];
      if (run.status !== "SUBMITTED") {
        return res.status(400).json({ success: false, error: `Run must be in SUBMITTED status to approve. Current: ${run.status}` });
      }

      // Maker-checker validation: Approver must be ADMIN or different HR user
      if (req.user.role !== "ADMIN" && run.submitted_by === req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Maker-Checker Separation Violation: You cannot approve a payroll run that you submitted.",
        });
      }

      await pool.query(
        `UPDATE payroll_runs SET
           status = 'APPROVED',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           approval_notes = $2
         WHERE id = $3`,
        [req.user.id, approvalNotes || "Approved", id]
      );

      await pool.query(
        `UPDATE salary_slips SET status = 'APPROVED' WHERE payroll_run_id = $1`,
        [id]
      );

      await pool.query(
        `INSERT INTO payroll_audit_logs (actor_id, actor_name, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'APPROVE_RUN', 'PAYROLL_RUN', $3, $4)`,
        [req.user.id, req.user.email, id, JSON.stringify({ approvedBy: req.user.id, notes: approvalNotes })]
      );

      res.json({ success: true, message: "Payroll run approved successfully" });
    } catch (err) {
      console.error("Error in approvePayrollRun:", err);
      res.status(500).json({ success: false, error: "Failed to approve payroll run" });
    }
  }

  async finalizePayrollRun(req, res) {
    try {
      const { id } = req.params;
      const runRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
      if (runRes.rows.length === 0) return res.status(404).json({ success: false, error: "Payroll run not found" });

      const run = runRes.rows[0];
      if (run.status !== "APPROVED") {
        return res.status(400).json({ success: false, error: `Run must be in APPROVED status to finalize. Current: ${run.status}` });
      }

      await pool.query(
        `UPDATE payroll_runs SET
           status = 'FINALIZED',
           is_locked = TRUE,
           finalized_by = $1,
           finalized_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [req.user.id, id]
      );

      await pool.query(
        `UPDATE salary_slips SET status = 'FINALIZED' WHERE payroll_run_id = $1`,
        [id]
      );

      // Mark included expense claims as Paid
      await pool.query(
        `UPDATE expense_claims SET reimbursement_status = 'Paid'
         WHERE status = 'Approved' AND reimbursement_status = 'Processing'`
      );

      await pool.query(
        `INSERT INTO payroll_audit_logs (actor_id, actor_name, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'FINALIZE_RUN', 'PAYROLL_RUN', $3, $4)`,
        [req.user.id, req.user.email, id, JSON.stringify({ locked: true, finalizedBy: req.user.id })]
      );

      res.json({ success: true, message: "Payroll run finalized and locked successfully. Payslips published to employee portal." });
    } catch (err) {
      console.error("Error in finalizePayrollRun:", err);
      res.status(500).json({ success: false, error: "Failed to finalize payroll run" });
    }
  }

  async recordPayment(req, res) {
    try {
      const { id } = req.params;
      const { payment_date, payment_reference, payment_notes } = req.body;

      const runRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
      if (runRes.rows.length === 0) return res.status(404).json({ success: false, error: "Payroll run not found" });

      await pool.query(
        `UPDATE payroll_runs SET
           status = 'PAID',
           payment_date = $1,
           payment_reference = $2,
           payment_notes = $3
         WHERE id = $4`,
        [payment_date || new Date().toISOString().split("T")[0], payment_reference, payment_notes, id]
      );

      res.json({ success: true, message: "Bank salary payment confirmed and recorded successfully." });
    } catch (err) {
      console.error("Error in recordPayment:", err);
      res.status(500).json({ success: false, error: "Failed to record payment" });
    }
  }

  // ==============================================================
  // 4. PAYSLIP DETAIL & BANK PAYMENT FILE EXPORT
  // ==============================================================

  async getSalarySlip(req, res) {
    try {
      const { id } = req.params;
      const slipRes = await pool.query(
        `SELECT ss.*, 
           e.employee_code, e.first_name, e.last_name, e.email, e.doj, e.designation,
           d.name AS department_name
         FROM salary_slips ss
         JOIN employees e ON e.employee_id = ss.employee_id
         LEFT JOIN departments d ON d.id = e.department
         WHERE ss.id = $1`,
        [id]
      );

      if (slipRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Salary slip not found" });
      }

      const slip = slipRes.rows[0];

      // Enforce data isolation: Employees can only view their own slips
      if (req.user.role === "EMPLOYEE" && slip.employee_id !== req.user.id) {
        return res.status(403).json({ success: false, error: "Access denied. You can only view your own salary slips." });
      }

      const itemsRes = await pool.query(
        `SELECT * FROM salary_slip_items WHERE salary_slip_id = $1 ORDER BY display_order ASC, id ASC`,
        [id]
      );

      const earnings = itemsRes.rows.filter((i) => i.type === "EARNING");
      const deductions = itemsRes.rows.filter((i) => i.type === "DEDUCTION");
      const employer = itemsRes.rows.filter((i) => i.type === "EMPLOYER_CONTRIBUTION");

      res.json({
        success: true,
        data: {
          slip,
          earnings,
          deductions,
          employerContributions: employer,
        },
      });
    } catch (err) {
      console.error("Error in getSalarySlip:", err);
      res.status(500).json({ success: false, error: "Failed to fetch salary slip" });
    }
  }

  async exportBankPaymentFile(req, res) {
    try {
      const { id } = req.params;
      const runRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = $1`, [id]);
      if (runRes.rows.length === 0) return res.status(404).json({ success: false, error: "Payroll run not found" });

      const run = runRes.rows[0];
      const slipsRes = await pool.query(
        `SELECT ss.*, e.employee_code, e.first_name, e.last_name, e.email
         FROM salary_slips ss
         JOIN employees e ON e.employee_id = ss.employee_id
         WHERE ss.payroll_run_id = $1 AND ss.rounded_net_pay > 0
         ORDER BY e.employee_code ASC`,
        [id]
      );

      const exportResult = bankExportService.generateBankPaymentCSV(run, slipsRes.rows);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${exportResult.filename}"`);
      return res.status(200).send(exportResult.content);
    } catch (err) {
      console.error("Error in exportBankPaymentFile:", err);
      res.status(500).json({ success: false, error: "Failed to generate bank payment file" });
    }
  }

  // ==============================================================
  // 5. EMPLOYEE SELF-SERVICE PORTAL
  // ==============================================================

  async getMySalarySlips(req, res) {
    try {
      const employeeId = req.user.id;
      const result = await pool.query(
        `SELECT ss.id, ss.slip_number, ss.month, ss.year, ss.start_date, ss.end_date,
                ss.payment_days, ss.gross_pay, ss.total_deductions, ss.rounded_net_pay, ss.status
         FROM salary_slips ss
         JOIN payroll_runs pr ON pr.id = ss.payroll_run_id
         WHERE ss.employee_id = $1 AND pr.status IN ('FINALIZED', 'PAID')
         ORDER BY ss.year DESC, ss.month DESC`,
        [employeeId]
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getMySalarySlips:", err);
      res.status(500).json({ success: false, error: "Failed to fetch employee salary slips" });
    }
  }

  async getStatutoryReports(req, res) {
    try {
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const year = Number(req.query.year) || new Date().getFullYear();

      // Aggregate all slips for month/year
      const slipsRes = await pool.query(
        `SELECT ss.*, e.employee_code, e.first_name, e.last_name, e.pan_number, e.uan_number, e.pf_number, e.esi_number, d.name AS department_name
         FROM salary_slips ss
         JOIN employees e ON e.employee_id = ss.employee_id
         LEFT JOIN departments d ON d.id = e.department
         WHERE ss.month = $1 AND ss.year = $2`,
        [month, year]
      );

      // Line items breakdown
      const itemsRes = await pool.query(
        `SELECT ssi.component_code, ssi.type, SUM(ssi.amount) AS total_amount, COUNT(ssi.id) AS count
         FROM salary_slip_items ssi
         JOIN salary_slips ss ON ss.id = ssi.salary_slip_id
         WHERE ss.month = $1 AND ss.year = $2
         GROUP BY ssi.component_code, ssi.type`,
        [month, year]
      );

      res.json({
        success: true,
        data: {
          month,
          year,
          employeeCount: slipsRes.rows.length,
          slips: slipsRes.rows,
          componentBreakdown: itemsRes.rows,
        },
      });
    } catch (err) {
      console.error("Error in getStatutoryReports:", err);
      res.status(500).json({ success: false, error: "Failed to fetch statutory report data" });
    }
  }
}

export default new PayrollController();
