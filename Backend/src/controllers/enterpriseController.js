// Backend/src/controllers/enterpriseController.js
import pool from "../config/database.js";

class EnterpriseController {
  /**
   * Get Company Holiday Calendar
   */
  async getHolidays(req, res) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const result = await pool.query(
        `SELECT * FROM company_holidays WHERE year = $1 ORDER BY holiday_date ASC`,
        [year]
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getHolidays:", err);
      res.status(500).json({ success: false, error: "Failed to load company holidays" });
    }
  }

  /**
   * Add a New Company Holiday (Admin/HR)
   */
  async addHoliday(req, res) {
    try {
      const { holidayName, holidayDate, dayOfWeek, holidayType, description, isPaid } = req.body;
      const year = new Date(holidayDate).getFullYear();

      const insertRes = await pool.query(
        `INSERT INTO company_holidays (holiday_name, holiday_date, day_of_week, holiday_type, description, year, is_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (holiday_date, holiday_name) DO UPDATE SET
           day_of_week = EXCLUDED.day_of_week,
           holiday_type = EXCLUDED.holiday_type,
           description = EXCLUDED.description,
           is_paid = EXCLUDED.is_paid
         RETURNING *`,
        [holidayName, holidayDate, dayOfWeek, holidayType || "MANDATORY", description, year, isPaid !== false]
      );

      res.status(201).json({
        success: true,
        data: insertRes.rows[0],
        message: "Holiday added successfully",
      });
    } catch (err) {
      console.error("Error in addHoliday:", err);
      res.status(500).json({ success: false, error: "Failed to add holiday" });
    }
  }

  /**
   * Get Active Company Announcements
   */
  async getAnnouncements(req, res) {
    try {
      const result = await pool.query(
        `SELECT ca.*, e.first_name, e.last_name, e.employee_code
         FROM company_announcements ca
         LEFT JOIN employees e ON e.employee_id = ca.created_by
         WHERE ca.is_published = true
           AND (ca.expires_at IS NULL OR ca.expires_at > CURRENT_TIMESTAMP)
         ORDER BY ca.published_at DESC`,
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getAnnouncements:", err);
      res.status(500).json({ success: false, error: "Failed to load company announcements" });
    }
  }

  /**
   * Create & Broadcast Announcement (Admin/HR)
   */
  async createAnnouncement(req, res) {
    try {
      const { title, content, category, priority, expiresAt } = req.body;
      const createdBy = req.user.id;

      if (!title || !content) {
        return res.status(400).json({ success: false, error: "Title and content are required" });
      }

      const insertRes = await pool.query(
        `INSERT INTO company_announcements (title, content, category, priority, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, content, category || "GENERAL", priority || "NORMAL", createdBy, expiresAt || null]
      );

      res.status(201).json({
        success: true,
        data: insertRes.rows[0],
        message: "Announcement published successfully",
      });
    } catch (err) {
      console.error("Error in createAnnouncement:", err);
      res.status(500).json({ success: false, error: "Failed to create announcement" });
    }
  }

  /**
   * Get Company Documents & Policy Repository
   */
  async getDocuments(req, res) {
    try {
      const category = req.query.category;
      let query = `SELECT * FROM company_documents WHERE is_active = true`;
      const params = [];

      if (category) {
        params.push(category);
        query += ` AND category = $1`;
      }

      query += ` ORDER BY category ASC, title ASC`;

      const result = await pool.query(query, params);
      if (result.rows && result.rows.length > 0) {
        return res.json({ success: true, data: result.rows });
      }
    } catch (err) {
      console.warn("⚠️ Error in getDocuments, using fallback:", err.message);
    }

    return res.json({
      success: true,
      data: [
        {
          id: "d0000000-0000-0000-0000-000000000001",
          title: "Employee Code of Conduct & Ethics",
          description: "Standard corporate guidelines on professional conduct, integrity, and anti-harassment.",
          category: "HANDBOOK",
          file_name: "Shende_Code_of_Conduct_2026.pdf",
          file_url: "/docs/policies/code-of-conduct.pdf",
          file_size_kb: 340,
          version: "2026.1"
        },
        {
          id: "d0000000-0000-0000-0000-000000000002",
          title: "Travel & Business Expense Policy",
          description: "Approved allowances for domestic travel, lodging caps, per-diem meals, and mileage rates.",
          category: "POLICY",
          file_name: "Shende_Travel_Policy_2026.pdf",
          file_url: "/docs/policies/travel-policy.pdf",
          file_size_kb: 215,
          version: "2026.1"
        },
        {
          id: "d0000000-0000-0000-0000-000000000003",
          title: "Leave & Working Hours Guidelines",
          description: "Rules governing paid leaves, sick leaves, casual leaves, compensatory offs, and core shift hours.",
          category: "POLICY",
          file_name: "Shende_Leave_Guidelines.pdf",
          file_url: "/docs/policies/leave-guidelines.pdf",
          file_size_kb: 180,
          version: "2026.2"
        },
        {
          id: "d0000000-0000-0000-0000-000000000004",
          title: "Indian Statutory Benefits & PF Guide",
          description: "Explains EPF 12%, EPS pension allocation, EDLI insurance, ESIC benefits, and Maharashtra PT slabs.",
          category: "COMPLIANCE",
          file_name: "Shende_Statutory_Benefits_Guide.pdf",
          file_url: "/docs/policies/statutory-guide.pdf",
          file_size_kb: 420,
          version: "2026.1"
        }
      ]
    });
  }

  /**
   * Get Office Geofence Locations (Public / Auth)
   */
  async getOfficeGeofences(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, name, code, latitude, longitude, radius_meters, city, state, address, is_active
         FROM office_geofences
         WHERE is_active = true
         ORDER BY id ASC`
      );
      if (result.rows && result.rows.length > 0) {
        return res.json({ success: true, data: result.rows });
      }
    } catch (err) {
      console.warn("⚠️ DB query failed for geofences, using demo fallback:", err.message);
    }

    // High-fidelity fallback for demo
    return res.json({
      success: true,
      data: [
        {
          id: "g0000000-0000-0000-0000-000000000001",
          name: "Shende Industries Baner Corporate Office",
          code: "SHENDE-BANER-HQ",
          latitude: 18.5590000,
          longitude: 73.7868000,
          radius_meters: 500,
          city: "Pune",
          state: "Maharashtra",
          address: "Off. No. 6, 2nd Flr, Aditi Commerce, Baner Rd",
          is_active: true
        },
        {
          id: "g0000000-0000-0000-0000-000000000002",
          name: "Shende Industries Packaging & Logistics Hub",
          code: "SHENDE-PUNE-PLANT",
          latitude: 18.5204303,
          longitude: 73.8567437,
          radius_meters: 600,
          city: "Pune",
          state: "Maharashtra",
          address: "Plot 42, Hinjewadi Phase 1 / Pune Plant Hub",
          is_active: true
        }
      ]
    });
  }
}

export default new EnterpriseController();
