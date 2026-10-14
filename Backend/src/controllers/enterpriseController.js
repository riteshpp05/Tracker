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
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getDocuments:", err);
      res.status(500).json({ success: false, error: "Failed to load company documents" });
    }
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
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("Error in getOfficeGeofences:", err);
      res.status(500).json({ success: false, error: "Failed to load office geofences" });
    }
  }
}

export default new EnterpriseController();
