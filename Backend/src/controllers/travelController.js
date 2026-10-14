import pool from "../config/database.js";

// GET /api/travel/my-requests
export const getMyTravelRequests = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const query = `
      SELECT 
        tr.*,
        e.first_name || ' ' || e.last_name AS approver_name
      FROM travel_requests tr
      LEFT JOIN employees e ON e.employee_id = tr.approved_by
      WHERE tr.employee_id = $1
      ORDER BY tr.created_at DESC
    `;
    const result = await pool.query(query, [employeeId]);
    res.json(result.rows);
  } catch (error) {
    console.error("getMyTravelRequests error:", error);
    res.status(500).json({ error: "Failed to fetch travel requests" });
  }
};

// POST /api/travel/request
export const submitTravelRequest = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { destination, purpose, departureDate, returnDate, estimatedBudget } = req.body;

    if (!destination || !purpose || !departureDate || !returnDate) {
      return res.status(400).json({ error: "Destination, purpose, departure, and return dates are required." });
    }

    const query = `
      INSERT INTO travel_requests (
        employee_id, destination, purpose, departure_date, return_date, estimated_budget, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
      RETURNING *
    `;
    const result = await pool.query(query, [
      employeeId,
      destination,
      purpose,
      departureDate,
      returnDate,
      parseFloat(estimatedBudget) || 0,
    ]);

    // Notify manager
    const empRes = await pool.query("SELECT module_manager_id, first_name, last_name FROM employees WHERE employee_id = $1", [employeeId]);
    const emp = empRes.rows[0];
    if (emp?.module_manager_id) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, title, message, type, link)
         VALUES ($1, 'New Travel Request', $2, 'APPROVAL', '/app/travel')`,
        [emp.module_manager_id, `${emp.first_name} ${emp.last_name} requested travel to ${destination}.`]
      );
    }

    res.status(201).json({
      message: "Travel request submitted successfully.",
      travelRequest: result.rows[0],
    });
  } catch (error) {
    console.error("submitTravelRequest error:", error);
    res.status(500).json({ error: "Failed to submit travel request" });
  }
};

// GET /api/travel/pending-approvals
export const getPendingTravelApprovals = async (req, res) => {
  try {
    const callerId = req.user.id;
    const role = req.user.role;

    let query = `
      SELECT 
        tr.*,
        e.employee_code,
        e.first_name || ' ' || e.last_name AS employee_name,
        d.name AS department_name
      FROM travel_requests tr
      JOIN employees e ON e.employee_id = tr.employee_id
      LEFT JOIN departments d ON d.id = e.department
      WHERE tr.status = 'Pending'
    `;
    const params = [];

    if (role === "MANAGER") {
      query += " AND (e.module_manager_id = $1 OR e.department = $2)";
      params.push(callerId, req.user.departmentId || 0);
    }

    query += " ORDER BY tr.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("getPendingTravelApprovals error:", error);
    res.status(500).json({ error: "Failed to fetch pending travel requests" });
  }
};

// POST /api/travel/approve/:id
export const approveTravelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user.id;
    const { comments } = req.body;

    const existingRes = await pool.query(
      `SELECT tr.*, e.module_manager_id, e.department 
       FROM travel_requests tr
       JOIN employees e ON e.employee_id = tr.employee_id
       WHERE tr.id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Travel request not found." });
    }

    const tr = existingRes.rows[0];
    if (tr.status !== "Pending") {
      return res.status(400).json({ error: `Travel request is already ${tr.status}.` });
    }

    if (req.user.role === "MANAGER") {
      if (tr.module_manager_id !== approverId && tr.department !== req.user.departmentId) {
        return res.status(403).json({ error: "Access denied. You can only approve travel requests for your team or department." });
      }
    }

    const query = `
      UPDATE travel_requests
      SET status = 'Approved', approved_by = $1, approved_at = NOW(), manager_comments = $2, updated_at = NOW()
      WHERE id = $3 AND status = 'Pending'
      RETURNING *
    `;
    const result = await pool.query(query, [approverId, comments || "Approved", id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Travel request not found or already processed." });
    }

    const updatedTr = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (recipient_id, title, message, type, link)
       VALUES ($1, 'Travel Request Approved', $2, 'SUCCESS', '/app/travel')`,
      [updatedTr.employee_id, `Your travel request to ${updatedTr.destination} has been approved.`]
    );

    res.json({ message: "Travel request approved.", travelRequest: updatedTr });
  } catch (error) {
    console.error("approveTravelRequest error:", error);
    res.status(500).json({ error: "Failed to approve travel request" });
  }
};

// POST /api/travel/reject/:id
export const rejectTravelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const rejecterId = req.user.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: "Rejection reason is required." });
    }

    const existingRes = await pool.query(
      `SELECT tr.*, e.module_manager_id, e.department 
       FROM travel_requests tr
       JOIN employees e ON e.employee_id = tr.employee_id
       WHERE tr.id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Travel request not found." });
    }

    const tr = existingRes.rows[0];
    if (tr.status !== "Pending") {
      return res.status(400).json({ error: `Travel request is already ${tr.status}.` });
    }

    if (req.user.role === "MANAGER") {
      if (tr.module_manager_id !== rejecterId && tr.department !== req.user.departmentId) {
        return res.status(403).json({ error: "Access denied. You can only reject travel requests for your team or department." });
      }
    }

    const query = `
      UPDATE travel_requests
      SET status = 'Rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2, updated_at = NOW()
      WHERE id = $3 AND status = 'Pending'
      RETURNING *
    `;
    const result = await pool.query(query, [rejecterId, rejectionReason, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Travel request not found or already processed." });
    }

    const updatedTr = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (recipient_id, title, message, type, link)
       VALUES ($1, 'Travel Request Rejected', $2, 'WARNING', '/app/travel')`,
      [updatedTr.employee_id, `Your travel request to ${updatedTr.destination} was rejected: ${rejectionReason}`]
    );

    res.json({ message: "Travel request rejected.", travelRequest: updatedTr });
  } catch (error) {
    console.error("rejectTravelRequest error:", error);
    res.status(500).json({ error: "Failed to reject travel request" });
  }
};
