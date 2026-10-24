import pool from "../src/config/database.js";

async function addBillable() {
  try {
    await pool.query("ALTER TABLE ticket_assignments ADD COLUMN IF NOT EXISTS billable_hours NUMERIC(10,2) DEFAULT 0");
    await pool.query(`
      CREATE OR REPLACE VIEW ticket_manager_scope AS
      SELECT ticket_assignments_id AS id,
        ticket_id,
        employee_id AS manager_id,
        project_id,
        assigned_by,
        assigned_date,
        is_active,
        billable_hours
      FROM ticket_assignments;
    `);
    console.log("ticket_assignments and view updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addBillable();
