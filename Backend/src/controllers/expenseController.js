import pool from "../config/database.js";

// GET /api/expenses/my-claims
export const getMyExpenseClaims = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const query = `
      SELECT 
        ec.*,
        p.project_name,
        e.first_name || ' ' || e.last_name AS approver_name
      FROM expense_claims ec
      LEFT JOIN project_master p ON p.project_id = ec.project_id
      LEFT JOIN employees e ON e.employee_id = ec.approved_by
      WHERE ec.employee_id = $1
      ORDER BY ec.created_at DESC
    `;
    const result = await pool.query(query, [employeeId]);
    res.json(result.rows);
  } catch (error) {
    console.error("getMyExpenseClaims error:", error);
    res.status(500).json({ error: "Failed to fetch expense claims" });
  }
};

// POST /api/expenses/claim
export const submitExpenseClaim = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { projectId, category, expenseDate, amount, currency, description, receiptUrl } = req.body;

    if (!category || !expenseDate || !amount || !description) {
      return res.status(400).json({ error: "Category, date, amount, and description are required." });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }

    const query = `
      INSERT INTO expense_claims (
        employee_id, project_id, category, expense_date, amount, currency, description, receipt_url, status, reimbursement_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', 'Unpaid')
      RETURNING *
    `;
    const result = await pool.query(query, [
      employeeId,
      projectId || null,
      category,
      expenseDate,
      parsedAmount,
      currency || "USD",
      description,
      receiptUrl || null,
    ]);

    // Notify manager
    const empRes = await pool.query("SELECT module_manager_id, first_name, last_name FROM employees WHERE employee_id = $1", [employeeId]);
    const emp = empRes.rows[0];
    if (emp?.module_manager_id) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, title, message, type, link)
         VALUES ($1, 'New Expense Claim Submitted', $2, 'APPROVAL', '/app/expenses')`,
        [emp.module_manager_id, `${emp.first_name} ${emp.last_name} filed an expense claim for ${currency || "$"}${parsedAmount} (${category}).`]
      );
    }

    res.status(201).json({
      message: "Expense claim filed successfully.",
      expenseClaim: result.rows[0],
    });
  } catch (error) {
    console.error("submitExpenseClaim error:", error);
    res.status(500).json({ error: "Failed to submit expense claim" });
  }
};

// GET /api/expenses/pending-approvals
export const getPendingExpenseApprovals = async (req, res) => {
  try {
    const callerId = req.user.id;
    const role = req.user.role;

    let query = `
      SELECT 
        ec.*,
        p.project_name,
        e.employee_code,
        e.first_name || ' ' || e.last_name AS employee_name,
        d.name AS department_name
      FROM expense_claims ec
      JOIN employees e ON e.employee_id = ec.employee_id
      LEFT JOIN project_master p ON p.project_id = ec.project_id
      LEFT JOIN departments d ON d.id = e.department
      WHERE ec.status = 'Pending'
    `;
    const params = [];

    if (role === "MANAGER") {
      query += " AND (e.module_manager_id = $1 OR e.department = $2)";
      params.push(callerId, req.user.departmentId || 0);
    }

    query += " ORDER BY ec.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("getPendingExpenseApprovals error:", error);
    res.status(500).json({ error: "Failed to fetch pending expenses" });
  }
};

// POST /api/expenses/approve/:id
export const approveExpenseClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user.id;
    const { comments } = req.body;

    const existingRes = await pool.query(
      `SELECT ec.*, e.module_manager_id, e.department 
       FROM expense_claims ec
       JOIN employees e ON e.employee_id = ec.employee_id
       WHERE ec.id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Expense claim not found." });
    }

    const ec = existingRes.rows[0];
    if (ec.status !== "Pending") {
      return res.status(400).json({ error: `Expense claim is already ${ec.status}.` });
    }

    if (req.user.role === "MANAGER") {
      if (ec.module_manager_id !== approverId && ec.department !== req.user.departmentId) {
        return res.status(403).json({ error: "Access denied. You can only approve expense claims for your team or department." });
      }
    }

    const query = `
      UPDATE expense_claims
      SET status = 'Approved', reimbursement_status = 'Processing', approved_by = $1, approved_at = NOW(), manager_comments = $2, updated_at = NOW()
      WHERE id = $3 AND status = 'Pending'
      RETURNING *
    `;
    const result = await pool.query(query, [approverId, comments || "Approved", id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense claim not found or already processed." });
    }

    const updatedEc = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (recipient_id, title, message, type, link)
       VALUES ($1, 'Expense Claim Approved', $2, 'SUCCESS', '/app/expenses')`,
      [updatedEc.employee_id, `Your expense claim for ${updatedEc.currency} ${updatedEc.amount} has been approved.`]
    );

    res.json({ message: "Expense claim approved.", expenseClaim: updatedEc });
  } catch (error) {
    console.error("approveExpenseClaim error:", error);
    res.status(500).json({ error: "Failed to approve expense claim" });
  }
};

// POST /api/expenses/reject/:id
export const rejectExpenseClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const rejecterId = req.user.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: "Rejection reason is required." });
    }

    const existingRes = await pool.query(
      `SELECT ec.*, e.module_manager_id, e.department 
       FROM expense_claims ec
       JOIN employees e ON e.employee_id = ec.employee_id
       WHERE ec.id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Expense claim not found." });
    }

    const ec = existingRes.rows[0];
    if (ec.status !== "Pending") {
      return res.status(400).json({ error: `Expense claim is already ${ec.status}.` });
    }

    if (req.user.role === "MANAGER") {
      if (ec.module_manager_id !== rejecterId && ec.department !== req.user.departmentId) {
        return res.status(403).json({ error: "Access denied. You can only reject expense claims for your team or department." });
      }
    }

    const query = `
      UPDATE expense_claims
      SET status = 'Rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2, updated_at = NOW()
      WHERE id = $3 AND status = 'Pending'
      RETURNING *
    `;
    const result = await pool.query(query, [rejecterId, rejectionReason, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense claim not found or already processed." });
    }

    const updatedEc = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (recipient_id, title, message, type, link)
       VALUES ($1, 'Expense Claim Rejected', $2, 'WARNING', '/app/expenses')`,
      [updatedEc.employee_id, `Your expense claim for ${updatedEc.currency} ${updatedEc.amount} was rejected: ${rejectionReason}`]
    );

    res.json({ message: "Expense claim rejected.", expenseClaim: updatedEc });
  } catch (error) {
    console.error("rejectExpenseClaim error:", error);
    res.status(500).json({ error: "Failed to reject expense claim" });
  }
};

// PATCH /api/expenses/reimburse/:id
export const markReimbursed = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE expense_claims
      SET reimbursement_status = 'Paid', updated_at = NOW()
      WHERE id = $1 AND status = 'Approved'
      RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Approved expense claim not found." });
    }

    const ec = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (recipient_id, title, message, type, link)
       VALUES ($1, 'Expense Claim Reimbursed', $2, 'SUCCESS', '/app/expenses')`,
      [ec.employee_id, `Your expense claim for ${ec.currency} ${ec.amount} has been marked as Paid/Reimbursed.`]
    );

    res.json({ message: "Expense marked as Paid.", expenseClaim: ec });
  } catch (error) {
    console.error("markReimbursed error:", error);
    res.status(500).json({ error: "Failed to update reimbursement status" });
  }
};
