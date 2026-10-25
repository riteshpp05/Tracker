import dotenv from "dotenv";
dotenv.config({ path: "Backend/.env" });
import pool from "../src/config/database.js";

async function run() {
  try {
    await pool.query("SELECT setval(pg_get_serial_sequence('timesheet_status', 'id'), COALESCE((SELECT MAX(id) FROM timesheet_status), 1))");
    const statuses = await pool.query("SELECT * FROM timesheet_status ORDER BY id");
    console.log("Current statuses:", statuses.rows);

    const needed = [
      { name: "Manager_Approved" },
      { name: "Manager_Rejected" },
      { name: "Admin_Approved" },
      { name: "Admin_Rejected" },
      { name: "Partially_Approved" },
      { name: "Partially_Rejected" },
      { name: "Saved" }
    ];

    for (const item of needed) {
      const exists = statuses.rows.find(s => s.name.toLowerCase() === item.name.toLowerCase());
      if (!exists) {
        console.log(`Inserting missing status: ${item.name}`);
        await pool.query("INSERT INTO timesheet_status (name) VALUES ($1)", [item.name]);
      }
    }

    const updated = await pool.query("SELECT * FROM timesheet_status ORDER BY id");
    console.log("Updated statuses:", updated.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
