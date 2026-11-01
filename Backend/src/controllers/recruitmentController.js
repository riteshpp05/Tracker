import pool from "../config/database.js";
import bcrypt from "bcryptjs";

// GET /api/recruitment/jobs
export const getAllRecruitmentJobs = async (req, res) => {
  try {
    const query = `
      SELECT 
        COALESCE(rj.id, j.id) AS id,
        COALESCE(rj.title, j.title) AS title,
        COALESCE(rj.job_code, j.slug, j.id::text) AS slug,
        COALESCE(rj.job_code, j.slug) AS job_code,
        COALESCE(rj.department, d.name, 'Operations') AS department_name,
        COALESCE(rj.location_name, j.location, 'HQ') AS location,
        COALESCE(rj.employment_type, j.employment_type, 'FULL_TIME') AS employment_type,
        COALESCE(j.experience_level, 'Mid-Level') AS experience_level,
        COALESCE(rj.compensation_band, j.salary_range, 'Competitive') AS salary_range,
        COALESCE(rj.description, j.description) AS description,
        COALESCE(rj.requirements, j.requirements) AS requirements,
        COALESCE(rj.status, j.status, 'OPEN') AS status,
        COALESCE(rj.created_at, j.created_at) AS created_at,
        COUNT(ja.id)::int AS applicant_count
      FROM recruitment_jobs rj
      FULL OUTER JOIN job_postings j ON j.title = rj.title
      LEFT JOIN departments d ON d.id = j.department_id
      LEFT JOIN job_applications ja ON (ja.job_id = rj.id OR ja.job_id = j.id)
      GROUP BY rj.id, j.id, rj.title, j.title, rj.job_code, j.slug, rj.department, d.name,
               rj.location_name, j.location, rj.employment_type, j.employment_type,
               j.experience_level, rj.compensation_band, j.salary_range,
               rj.description, j.description, rj.requirements, j.requirements,
               rj.status, j.status, rj.created_at, j.created_at
      ORDER BY created_at DESC
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
        ja.id,
        ja.job_id,
        COALESCE(ja.full_name, ja.candidate_name) AS candidate_name,
        COALESCE(ja.full_name, ja.candidate_name) AS full_name,
        ja.email,
        ja.phone,
        ja.resume_url,
        ja.portfolio_url,
        COALESCE(ja.cover_note, ja.cover_letter) AS cover_letter,
        COALESCE(ja.cover_note, ja.cover_letter) AS cover_note,
        ja.stage,
        ja.tracking_code,
        ja.experience_years,
        ja.hr_notes,
        ja.rating,
        ja.interview_score,
        ja.interview_date,
        ja.hired_employee_id,
        ja.onboarded_user_id,
        ja.created_at,
        ja.updated_at,
        COALESCE(rj.title, jp.title, 'General Position') AS job_title,
        COALESCE(rj.job_code, jp.slug) AS job_slug,
        COALESCE(rj.department, d.name, 'Operations') AS department_name
      FROM job_applications ja
      LEFT JOIN recruitment_jobs rj ON rj.id = ja.job_id
      LEFT JOIN job_postings jp ON jp.id = ja.job_id
      LEFT JOIN departments d ON d.id = jp.department_id
      WHERE 1=1
    `;
    const params = [];

    if (jobId && jobId !== "All") {
      params.push(jobId);
      query += ` AND (ja.job_id = $${params.length} OR rj.id = $${params.length} OR jp.id = $${params.length})`;
    }

    if (stage && stage !== "All") {
      params.push(stage);
      query += ` AND UPPER(ja.stage) = UPPER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ja.candidate_name ILIKE $${params.length} OR ja.full_name ILIKE $${params.length} OR ja.email ILIKE $${params.length} OR ja.tracking_code ILIKE $${params.length})`;
    }

    query += " ORDER BY ja.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("getAllApplications error:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// PUT / PATCH /api/recruitment/applications/:id/stage
export const updateApplicationStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, hrNotes, rating, interviewScore, interviewDate } = req.body;

    const validStages = [
      "APPLIED",
      "SCREENING",
      "TECHNICAL",
      "HR",
      "OFFER",
      "ONBOARDED",
      "REJECTED",
      "INTERVIEW",
      "ASSESSMENT",
      "HIRED",
      "WITHDRAWN",
    ];

    let targetStage = stage;
    if (stage) {
      const upper = stage.toUpperCase();
      if (!validStages.includes(upper)) {
        return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(", ")}` });
      }
      targetStage = upper;
    }

    const query = `
      UPDATE job_applications
      SET stage = COALESCE($1, stage),
          hr_notes = COALESCE($2, hr_notes),
          rating = COALESCE($3, rating),
          interview_score = COALESCE($4, interview_score),
          interview_date = COALESCE($5, interview_date),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await pool.query(query, [
      targetStage,
      hrNotes,
      rating,
      interviewScore !== undefined ? interviewScore : null,
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
    const {
      departmentId,
      designation,
      managerId,
      initialPassword,
      locationPolicyId,
      location_policy_id,
      salaryMode,
      salary_mode,
      targetNetMonthly,
      target_net_monthly,
      approvedAnnualCtc,
      approved_annual_ctc,
      panNumber,
      pan_number,
      uanNumber,
      uan_number,
    } = req.body;

    await client.query("BEGIN");

    const appRes = await client.query(
      `SELECT ja.*, 
              COALESCE(rj.department, d.name, 'Engineering') AS job_department_name,
              rj.location_policy_id AS rj_policy_id
       FROM job_applications ja
       LEFT JOIN recruitment_jobs rj ON rj.id = ja.job_id
       LEFT JOIN job_postings jp ON jp.id = ja.job_id
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE ja.id = $1 FOR UPDATE OF ja`,
      [id]
    );

    if (appRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Application not found." });
    }

    const application = appRes.rows[0];

    if (application.hired_employee_id || application.onboarded_user_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Candidate has already been onboarded as an employee." });
    }

    // Split candidate name
    const rawName = (application.full_name || application.candidate_name || "New Employee").trim();
    const parts = rawName.split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "Employee";

    // Generate unique employee code
    const countRes = await client.query("SELECT COUNT(*)::int AS count FROM employees");
    const nextNum = (countRes.rows[0].count + 1).toString().padStart(3, "0");
    const employeeCode = `SH-${nextNum}`;

    // Hash password
    const pwd = initialPassword || "Welcome@Shende2026";
    const passwordHash = await bcrypt.hash(pwd, 10);

    // Selected or fallback location policy
    const policyId = locationPolicyId || location_policy_id || application.rj_policy_id || null;
    const calcMode = salaryMode || salary_mode || "MODE_A_NET_TO_CTC";
    const netTarget = targetNetMonthly || target_net_monthly || 26000;
    const ctcApproved = approvedAnnualCtc || approved_annual_ctc || 420000;

    // Insert new employee
    const targetDept = departmentId || 3;
    const empInsertQuery = `
      INSERT INTO employees (
        employee_code, first_name, last_name, email, password_hash,
        role, department, designation, module_manager_id, phone, doj, is_active,
        location_policy_id, calculation_mode, target_net_monthly, approved_annual_ctc
      ) VALUES ($1, $2, $3, $4, $5, 4, $6, $7, $8, $9, CURRENT_DATE, TRUE, $10, $11, $12, $13)
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
      policyId,
      calcMode,
      netTarget,
      ctcApproved,
    ]);

    const newEmp = empResult.rows[0];

    // Link back to application and set stage to ONBOARDED
    await client.query(
      `UPDATE job_applications
       SET stage = 'ONBOARDED', 
           hired_employee_id = $1, 
           onboarded_user_id = $1, 
           updated_at = NOW()
       WHERE id = $2`,
      [newEmp.employee_id, id]
    );

    // Populate statutory profile
    const pan = (panNumber || pan_number || "AAACS1234P").toUpperCase();
    const uan = (uanNumber || uan_number || "100900800700");
    await client.query(
      `INSERT INTO employee_statutory_profiles (
         employee_id, pan_number, uan_number, pf_member_joined_after_sep_2014, esic_enrolled_in_current_period
       ) VALUES ($1, $2, $3, TRUE, FALSE)
       ON CONFLICT (employee_id) DO UPDATE SET
         pan_number = EXCLUDED.pan_number,
         uan_number = EXCLUDED.uan_number`,
      [newEmp.employee_id, pan, uan]
    );

    // Auto-create active salary assignment for new hire
    const baseMonthly = Math.round(Number(netTarget) * 0.5);
    await client.query(
      `INSERT INTO employee_salary_assignments (
         employee_id, structure_id, from_date, base_monthly_salary, ctc_annual, is_active, notes
       ) VALUES ($1, 1, CURRENT_DATE, $2, $3, TRUE, 'Auto-provisioned on candidate onboarding')`,
      [newEmp.employee_id, baseMonthly, ctcApproved]
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
        JSON.stringify({
          candidateName: rawName,
          employeeCode,
          email: application.email,
          policyId,
          calcMode,
        }),
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Candidate ${rawName} onboarded successfully as ${employeeCode}!`,
      emp_code: employeeCode,
      employeeCode: employeeCode,
      employee: {
        id: newEmp.employee_id,
        employeeCode: newEmp.employee_code,
        name: `${newEmp.first_name} ${newEmp.last_name}`,
        email: newEmp.email,
        location_policy_id: newEmp.location_policy_id,
        calculation_mode: newEmp.calculation_mode,
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
