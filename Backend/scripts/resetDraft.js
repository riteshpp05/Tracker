import pool from "../src/config/database.js";

async function reset() {
  try {
    const draftRes = await pool.query("SELECT id FROM timesheet_status WHERE name = 'Draft'");
    const draftId = draftRes.rows[0].id;
    await pool.query("UPDATE daily_timesheet_entries SET status = $1 WHERE entry_id = 1", [draftId]);
    console.log("Entry 1 reset to Draft successfully!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

reset();
