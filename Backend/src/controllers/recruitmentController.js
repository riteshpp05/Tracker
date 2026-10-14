import pool from "../config/database.js";
import bcrypt from "bcryptjs";

// GET /api/recruitment/jobs
export const getAllRecruitmentJobs = async (req, res) => {
  try {
    const query = `
      SELECT 
        j.*,
        d.name AS department_name,
        COUNT(ja.id)::int AS applicant_count
      FROM job_postings j
      LEFT JOIN departments d ON d.id = j.department_id
      LEFT JOIN job_applications ja ON ja.job_id = j.id
      GROUP BY j.id, d.name
      ORDER BY j.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("getAllRecruitmentJobs error:", error);
    res.status(500).json({ error: "Failed to fetch job postings" });
  }
};

// POST /api/recruitment/jobs
export const createJobPosting = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const {
      title,
      departmentId,
      location,
      employmentType,
      experienceLevel,
      description,
      requirements,
      responsibilities,
      salaryRange,
      status,
    } = req.body;

    if (!title || !description || !requirements) {
      return res.status(400).json({ error: "Title, description, and requirements are required." });
    }

    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const query = `
      INSERT INTO job_postings (
        title, slug, department_id, location, employment_type, experience_level,
        description, requirements, responsibilities, salary_range, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      slug,
      departmentId || null,
      location || "Chicago, IL (On-site)",
      employmentType || "Full-time",
      experienceLevel || "Mid-Level",
      description,
      requirements,
      responsibilities || "",
      salaryRange || "Competitive",
      status || "Published",
      creatorId,
    ]);

    res.status(201).json({
      message: "Job posting created successfully.",
      job: result.rows[0],
    });
  } catch (error) {
    console.error("createJobPosting error:", error);
    res.status(500).json({ error: "Failed to create job posting" });
  }
};

// PATCH /api/recruitment/jobs/:id
export const updateJobPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      departmentId,
      location,
      employmentType,
      experienceLevel,
      description,
      requirements,
      responsibilities,
      salaryRange,
      status,
    } = req.body;

    const query = `
      UPDATE job_postings
      SET title = COALESCE($1, title),
          department_id = COALESCE($2, department_id),
          location = COALESCE($3, location),
          employment_type = COALESCE($4, employment_type),
          experience_level = COALESCE($5, experience_level),
          description = COALESCE($6, description),
          requirements = COALESCE($7, requirements),
          responsibilities = COALESCE($8, responsibilities),
          salary_range = COALESCE($9, salary_range),
          status = COALESCE($10, status),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      departmentId,
      location,
      employmentType,
      experienceLevel,
      description,
      requirements,
      responsibilities,
      salaryRange,
      status,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job posting not found." });
    }

    res.json({ message: "Job posting updated.", job: result.rows[0] });
  } catch (error) {
    console.error("updateJobPosting error:", error);
    res.status(500).json({ error: "Failed to update job posting" });
  }
};

// GET /api/recruitment/applications
export const getAllApplications = async (req, res) => {
  try {
    const { jobId, stage, search } = req.query;

    let query = `
      SELECT 
        ja.*,
        jp.title AS job_title,
        jp.slug AS job_slug,
        d.name AS department_name
      FROM job_applications ja
      JOIN job_postings jp ON jp.id = ja.job_id
      LEFT JOIN departments d ON d.id = jp.department_id
      WHERE 1=1
    `;
    const params = [];

    if (jobId) {
      params.push(jobId);
      query += ` AND ja.job_id = $${params.length}`;
    }

    if (stage) {
      params.push(stage);
      query += ` AND ja.stage = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ja.candidate_name ILIKE $${params.length} OR ja.email ILIKE $${params.length})`;
    }

    query += " ORDER BY ja.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("getAllApplications error:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// PATCH /api/recruitment/applications/:id/stage
export const updateApplicationStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, hrNotes, rating, interviewDate } = req.body;

    const validStages = [
      "Applied",
      "Screening",
      "Interview",
      "Assessment",
      "Offer",
      "Hired",
      "Rejected",
      "Withdrawn",
    ];

    if (stage && !validStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(", ")}` });
    }

    const query = `
      UPDATE job_applications
      SET stage = COALESCE($1, stage),
          hr_notes = COALESCE($2, hr_notes),
          rating = COALESCE($3, rating),
          interview_date = COALESCE($4, interview_date),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [
      stage,
      hrNotes,
      rating,
      interviewDate ? new Date(interviewDate) : null,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found." });
    }

    res.json({ message: "Candidate status updated.", application: result.rows[0] });
  } catch (error) {
    console.error("updateApplicationStage error:", error);
    res.status(500).json({ error: "Failed to update application stage" });
  }
};

// POST /api/recruitment/applications/:id/onboard
// 1-Click Candidate to Employee Onboarding Workflow
export const onboardCandidate = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { departmentId, designation, managerId, initialPassword } = req.body;

    await client.query("BEGIN");

    const appRes = await client.query(
      `SELECT ja.*, jp.department_id AS job_department_id
       FROM job_applications ja
       JOIN job_postings jp ON jp.id = ja.job_id
       WHERE ja.id = $1 FOR UPDATE`,
      [id]
    );

    if (appRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Application not found." });
    }

    const application = appRes.rows[0];

    if (application.hired_employee_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Candidate has already been onboarded as an employee." });
    }

    // Split candidate name
    const parts = application.candidate_name.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "Employee";

    // Generate unique employee code
    const countRes = await client.query("SELECT COUNT(*)::int AS count FROM employees");
    const nextNum = (countRes.rows[0].count + 1).toString().padStart(3, "0");
    const employeeCode = `SH-${nextNum}`;

    // Hash password
    const pwd = initialPassword || "Welcome@Shende2026";
    const passwordHash = await bcrypt.hash(pwd, 10);

    // Insert new employee
    const targetDept = departmentId || application.job_department_id || 3;
    const empInsertQuery = `
      INSERT INTO employees (
        employee_code, first_name, last_name, email, password_hash,
        role, department, designation, module_manager_id, phone, doj, is_active
      ) VALUES ($1, $2, $3, $4, $5, 4, $6, $7, $8, $9, CURRENT_DATE, TRUE)
      RETURNING *
    `;

    const empResult = await client.query(empInsertQuery, [
      employeeCode,
      firstName,
      lastName,
      application.email,
      passwordHash,
      targetDept,
      designation || "Engineering Associate",
      managerId || null,
      application.phone,
    ]);

    const newEmp = empResult.rows[0];

    // Link back to application and set stage to Hired
    await client.query(
      `UPDATE job_applications
       SET stage = 'Hired', hired_employee_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [newEmp.employee_id, id]
    );

    // Initialize leave balances for the new employee
    await client.query(
      `INSERT INTO leave_balances (employee_id, leave_type_id, year, total_allocated, used_days, pending_days)
       SELECT $1, id, 2026, days_allowed_per_year, 0, 0
       FROM leave_types WHERE is_active = TRUE
       ON CONFLICT DO NOTHING`,
      [newEmp.employee_id]
    );

    // Write audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, changes)
       VALUES ($1, $2, 'CANDIDATE_ONBOARDED', 'EMPLOYEES', $3, $4)`,
      [
        req.user.id,
        `${req.user.name || "HR Manager"}`,
        newEmp.employee_id,
        JSON.stringify({ candidateName: application.candidate_name, employeeCode, email: application.email }),
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: `Candidate ${application.candidate_name} onboarded successfully as ${employeeCode}!`,
      employee: {
        id: newEmp.employee_id,
        employeeCode: newEmp.employee_code,
        name: `${newEmp.first_name} ${newEmp.last_name}`,
        email: newEmp.email,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("onboardCandidate error:", error);
    res.status(500).json({ error: "Failed to onboard candidate as employee" });
  } finally {
    client.release();
  }
};
