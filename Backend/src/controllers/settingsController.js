import pool from "../config/database.js";

// Get system settings
export const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY setting_key');
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });
    if (Object.keys(settings).length > 0) {
      return res.json(settings);
    }
  } catch (error) {
    console.warn('Get settings error, using Shende Industries defaults:', error.message);
  }
  return res.json({
    company_name: "Shende Industries Pvt. Ltd.",
    company_short_name: "SIPL",
    corporate_office: "Off. No. 6, 2nd Flr, Aditi Commerce, Baner Rd, Pune - 411045",
    max_hours_per_day: "9",
    max_hours_per_week: "45",
    working_days_per_week: "5",
    geofence_enforcement: "true",
    leave_accrual_rate: "1.75",
    contact_email: "contact@shendeindustries.com",
    contact_phone: "+91-20-41234567"
  });
};

// Update single setting
export const updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const result = await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = $2, updated_at = NOW()
       RETURNING *`,
      [key, value]
    );

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0],
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

// Bulk update settings
export const bulkUpdateSettings = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = $2, updated_at = NOW()`,
        [key, value]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
};

// Get working hours policy
export const getWorkingHoursPolicy = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM system_settings
       WHERE setting_key IN ('max_hours_per_day', 'max_hours_per_week', 'working_days_per_week')`
    );

    const policy = {};
    result.rows.forEach((row) => {
      policy[row.setting_key] = isNaN(row.setting_value)
        ? row.setting_value
        : parseFloat(row.setting_value);
    });

    if (Object.keys(policy).length > 0) {
      return res.json(policy);
    }
  } catch (error) {
    console.warn('Get working hours policy error, using defaults:', error.message);
  }
  return res.json({
    max_hours_per_day: 9,
    max_hours_per_week: 45,
    working_days_per_week: 5,
  });
};
