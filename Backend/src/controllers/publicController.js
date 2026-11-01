import pool from "../config/database.js";

// GET /api/public/company-info
export const getCompanyInfo = async (req, res) => {
  try {
    const orgRes = await pool.query("SELECT * FROM organizations LIMIT 1");
    const settingsRes = await pool.query("SELECT * FROM company_settings LIMIT 1");

    const org = orgRes.rows[0] || {
      name: "Shende Industries",
      code: "SHENDE",
      tagline: "Precision Engineering & Industrial Automation",
      website: "https://www.shendeindustries.com",
      contact_email: "contact@shendeindustries.com",
      phone: "+1 (555) 019-2834",
      address: "100 Industrial Parkway, Suite 400, Chicago, IL 60601",
    };

    const divisions = [
      {
        id: "div-auto",
        title: "Industrial Automation & Robotics",
        tagline: "High-speed assembly cells and SCADA architectures",
        description:
          "Turnkey PLC programming, collaborative robot workcells, motion controllers, and distributed I/O systems designed for aerospace, automotive, and high-throughput packaging lines.",
        capabilities: [
          "Beckhoff TwinCAT & Siemens TIA Portal Engineering",
          "6-Axis Robotic Cell Design & Safety Enclosures",
          "Real-Time SCADA Telemetry & Edge IoT Integration",
          "ISO 13849 Category 4 Safety Validation",
        ],
        icon: "Cpu",
      },
      {
        id: "div-precision",
        title: "Precision CNC Machining & Fabrication",
        tagline: "Tolerances down to ±0.0002 inches in exotic aerospace alloys",
        description:
          "State-of-the-art 5-axis simultaneous milling, high-speed turning, and wire EDM machining for critical turbine components, defense hardware, and medical surgical prototypes.",
        capabilities: [
          "5-Axis Mazak & DMG Mori Multi-Tasking Centers",
          "Titanium, Inconel, 7075-T6 Aluminum & Hastelloy",
          "Mastercam & Siemens NX CAM Toolpath Optimization",
          "CMM Coordinate Measuring & Laser Metrology",
        ],
        icon: "Wrench",
      },
      {
        id: "div-energy",
        title: "Energy & Power Systems Engineering",
        tagline: "Next-generation electrical switchgear and heavy power distribution",
        description:
          "Mission-critical medium and high-voltage power distribution, smart substation switchgear, and renewable microgrid telemetry with redundant fail-safe circuitry.",
        capabilities: [
          "Medium Voltage Switchgear Automation",
          "Surge Suppression & Harmonic Mitigation Rigs",
          "Smart Microgrid Dispatch Algorithms",
          "UL 508A Certified Control Panel Fabrication",
        ],
        icon: "Zap",
      },
    ];

    const stats = [
      { label: "Precision Machining Centers", value: "48+" },
      { label: "Client Deployment Sites", value: "350+" },
      { label: "Engineering Patents & Accreditations", value: "24" },
      { label: "On-Time Delivery Rate", value: "99.4%" },
    ];

    res.json({
      organization: org,
      settings: settingsRes.rows[0] || {},
      divisions,
      stats,
    });
  } catch (error) {
    console.error("Public getCompanyInfo error:", error);
    res.status(500).json({ error: "Failed to fetch company info" });
  }
};

// GET /api/public/jobs
export const getPublicJobs = async (req, res) => {
  try {
    const { department, employmentType, search } = req.query;

    let query = `
      SELECT 
        j.id,
        j.title,
        j.slug,
        j.location,
        j.employment_type,
        j.experience_level,
        j.salary_range,
        j.description,
        j.requirements,
        j.responsibilities,
        j.created_at,
        d.name AS department_name
      FROM job_postings j
      LEFT JOIN departments d ON d.id = j.department_id
      WHERE j.status = 'Published'
    `;
    const params = [];

    if (department) {
      params.push(department);
      query += ` AND d.name = $${params.length}`;
    }

    if (employmentType) {
      params.push(employmentType);
      query += ` AND j.employment_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (j.title ILIKE $${params.length} OR j.description ILIKE $${params.length})`;
    }

    query += " ORDER BY j.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Public getPublicJobs error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

// GET /api/public/jobs/:slug
export const getPublicJobDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT 
        j.*,
        d.name AS department_name
      FROM job_postings j
      LEFT JOIN departments d ON d.id = j.department_id
      WHERE (j.slug = $1 OR j.id::text = $1) AND j.status = 'Published'
    `;
    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job posting not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Public getPublicJobDetail error:", error);
    res.status(500).json({ error: "Failed to fetch job detail" });
  }
};

// POST /api/public/applications
export const submitJobApplication = async (req, res) => {
  try {
    const {
      jobId,
      candidateName,
      email,
      phone,
      resumeUrl,
      portfolioUrl,
      coverLetter,
    } = req.body;

    if (!jobId || !candidateName || !email || !phone) {
      return res.status(400).json({
        error: "Job ID, candidate name, email, and phone are mandatory.",
      });
    }

    const query = `
      INSERT INTO job_applications (
        job_id, candidate_name, email, phone, resume_url, portfolio_url, cover_letter, stage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Applied')
      RETURNING *
    `;

    const result = await pool.query(query, [
      jobId,
      candidateName,
      email,
      phone,
      resumeUrl || null,
      portfolioUrl || null,
      coverLetter || null,
    ]);

    // Create an audit entry / notification for HR
    const hrUsers = await pool.query(
      `SELECT e.employee_id 
       FROM employees e 
       JOIN user_roles ur ON ur.id = e.role 
       WHERE ur.name = 'HR' AND e.is_active = TRUE`
    );
    for (const hr of hrUsers.rows) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, title, message, type, link)
         VALUES ($1, $2, $3, 'INFO', '/app/recruitment')`,
        [
          hr.employee_id,
          "New Job Application Received",
          `${candidateName} applied for a position.`,
        ]
      );
    }

    res.status(201).json({
      message: "Application submitted successfully! Our talent team will review your credentials.",
      applicationId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Public submitJobApplication error:", error);
    res.status(500).json({ error: "Failed to submit job application" });
  }
};

// POST /api/public/contact
export const submitContactInquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Name, email, and message are required fields.",
      });
    }

    const query = `
      INSERT INTO contact_inquiries (name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await pool.query(query, [
      name,
      email,
      phone || null,
      subject || "General Engineering Inquiry",
      message,
    ]);

    res.status(201).json({
      message: "Thank you for contacting Shende Industries. Our team will get back to you within 24 business hours.",
      inquiryId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Public submitContactInquiry error:", error);
    res.status(500).json({ error: "Failed to record inquiry" });
  }
};

// =====================================================================
// DEDICATED PUBLIC CAREERS ATS PORTAL ENDPOINTS (SECTION 3.2)
// =====================================================================

// GET /api/public/careers/jobs
export const getPublicCareersJobs = async (req, res) => {
  try {
    const { department, search } = req.query;

    let query = `
      SELECT 
        id, 
        job_code, 
        title, 
        department, 
        location_name, 
        employment_type, 
        compensation_band, 
        description, 
        requirements, 
        status, 
        created_at
      FROM recruitment_jobs
      WHERE status = 'OPEN'
    `;
    const params = [];

    if (department && department !== "ALL") {
      params.push(department);
      query += ` AND department ILIKE $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR department ILIKE $${params.length})`;
    }

    query += " ORDER BY created_at ASC";

    const result = await pool.query(query, params);

    // Fallback: if recruitment_jobs is empty, query job_postings
    if (result.rows.length === 0) {
      const fallbackQuery = `
        SELECT 
          j.id, 
          COALESCE(j.slug, j.id::text) AS job_code, 
          j.title, 
          COALESCE(d.name, 'Engineering') AS department, 
          j.location AS location_name, 
          j.employment_type, 
          COALESCE(j.salary_range, 'Competitive') AS compensation_band, 
          j.description, 
          j.requirements, 
          'OPEN' AS status, 
          j.created_at
        FROM job_postings j
        LEFT JOIN departments d ON d.id = j.department_id
        WHERE j.status = 'Published'
        ORDER BY j.created_at DESC
      `;
      const fallbackResult = await pool.query(fallbackQuery);
      return res.json(fallbackResult.rows);
    }

    res.json(result.rows);
  } catch (error) {
    console.error("getPublicCareersJobs error:", error);
    res.status(500).json({ error: "Failed to fetch careers jobs" });
  }
};

// GET /api/public/careers/jobs/:id
export const getPublicCareersJobDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, job_code, title, department, location_name,
        employment_type, compensation_band, description, requirements,
        status, created_at
      FROM recruitment_jobs
      WHERE (id::text = $1 OR job_code = $1) AND status = 'OPEN'
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      // Check job_postings
      const alt = await pool.query(
        `SELECT 
           j.id, 
           COALESCE(j.slug, j.id::text) AS job_code, 
           j.title, 
           COALESCE(d.name, 'Engineering') AS department, 
           j.location AS location_name, 
           j.employment_type, 
           COALESCE(j.salary_range, 'Competitive') AS compensation_band, 
           j.description, 
           j.requirements, 
           'OPEN' AS status, 
           j.created_at
         FROM job_postings j
         LEFT JOIN departments d ON d.id = j.department_id
         WHERE (j.id::text = $1 OR j.slug = $1) AND j.status = 'Published'`,
        [id]
      );
      if (alt.rows.length === 0) {
        return res.status(404).json({ error: "Job posting not found" });
      }
      return res.json(alt.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("getPublicCareersJobDetail error:", error);
    res.status(500).json({ error: "Failed to fetch job details" });
  }
};

// POST /api/public/careers/apply
export const submitPublicCareersApplication = async (req, res) => {
  try {
    const {
      jobId,
      job_id,
      fullName,
      full_name,
      candidateName,
      candidate_name,
      email,
      phone,
      experienceYears,
      experience_years,
      resumeUrl,
      resume_url,
      portfolioUrl,
      portfolio_url,
      coverNote,
      cover_note,
      coverLetter,
    } = req.body;

    const actualJobId = jobId || job_id;
    const name = fullName || full_name || candidateName || candidate_name;
    const applicantEmail = (email || "").trim().toLowerCase();
    const applicantPhone = (phone || "").trim();
    const expYears = Number(experienceYears || experience_years || 0);
    const resume = resumeUrl || resume_url || "Resume-Attached-Digital.pdf";
    const portfolio = portfolioUrl || portfolio_url || null;
    const note = coverNote || cover_note || coverLetter || null;

    if (!actualJobId || !name || !applicantEmail || !applicantPhone) {
      return res.status(400).json({
        error: "Job ID, candidate name, email, and phone number are required.",
      });
    }

    // Duplicate check: Prevent multiple applications for same email and job
    const dupCheck = await pool.query(
      `SELECT id, tracking_code FROM job_applications 
       WHERE LOWER(email) = LOWER($1) AND job_id = $2`,
      [applicantEmail, actualJobId]
    );

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        error: "An application with this email has already been submitted for this position.",
        tracking_code: dupCheck.rows[0].tracking_code,
      });
    }

    // Generate unique tracking code e.g. APP-2026-4821
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `APP-2026-${randSuffix}`;

    const insertQuery = `
      INSERT INTO job_applications (
        job_id, candidate_name, full_name, email, phone,
        experience_years, resume_url, portfolio_url, cover_note,
        stage, tracking_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SCREENING', $10)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      actualJobId,
      name,
      name,
      applicantEmail,
      applicantPhone,
      expYears,
      resume,
      portfolio,
      note,
      trackingCode,
    ]);

    const created = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Application submitted successfully! Keep your tracking code to monitor your status.",
      tracking_code: created.tracking_code,
      applicationId: created.id,
      stage: created.stage,
    });
  } catch (error) {
    console.error("submitPublicCareersApplication error:", error);
    res.status(500).json({ error: "Failed to submit application: " + error.message });
  }
};

// GET /api/public/careers/track/:trackingCode
export const trackPublicCareersApplication = async (req, res) => {
  try {
    const { trackingCode } = req.params;

    if (!trackingCode) {
      return res.status(400).json({ error: "Tracking code is required." });
    }

    const query = `
      SELECT 
        ja.id,
        ja.tracking_code,
        COALESCE(ja.full_name, ja.candidate_name) AS candidate_name,
        ja.email,
        ja.stage,
        ja.created_at,
        ja.updated_at,
        COALESCE(rj.title, jp.title, 'General Position') AS job_title,
        COALESCE(rj.department, d.name, 'Operations') AS department,
        COALESCE(rj.location_name, jp.location, 'HQ') AS location_name
      FROM job_applications ja
      LEFT JOIN recruitment_jobs rj ON rj.id = ja.job_id
      LEFT JOIN job_postings jp ON jp.id = ja.job_id
      LEFT JOIN departments d ON d.id = jp.department_id
      WHERE UPPER(ja.tracking_code) = UPPER($1) OR ja.id::text = $1
    `;

    const result = await pool.query(query, [trackingCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: `No job application found for tracking code: ${trackingCode}`,
      });
    }

    const app = result.rows[0];

    // Standardized 5-step lifecycle stages for public progress display
    const stages = ["SCREENING", "TECHNICAL", "HR", "OFFER", "ONBOARDED"];
    const normalizedStage = String(app.stage).toUpperCase();
    const currentStepIndex = stages.indexOf(normalizedStage) !== -1 
      ? stages.indexOf(normalizedStage) 
      : normalizedStage === "APPLIED" ? 0 
      : normalizedStage === "INTERVIEW" ? 1 
      : normalizedStage === "HIRED" ? 4 
      : 0;

    res.json({
      success: true,
      tracking_code: app.tracking_code,
      candidate_name: app.candidate_name,
      job_title: app.job_title,
      department: app.department,
      location_name: app.location_name,
      stage: normalizedStage,
      current_step: currentStepIndex + 1,
      total_steps: 5,
      is_rejected: normalizedStage === "REJECTED",
      created_at: app.created_at,
      updated_at: app.updated_at,
    });
  } catch (error) {
    console.error("trackPublicCareersApplication error:", error);
    res.status(500).json({ error: "Failed to track application" });
  }
};
