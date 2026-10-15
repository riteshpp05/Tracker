import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const sqlPath = path.join(__dirname, "../../database/05-system-settings.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    console.log("Applying database migration:", sqlPath);
    await pool.query(sql);

    const check = await pool.query("SELECT * FROM system_settings ORDER BY setting_key");
    console.log(`✅ SUCCESS! Loaded ${check.rows.length} system_settings rows:`);
    for (const r of check.rows) {
      console.log(`   ${r.setting_key} = ${r.setting_value}`);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

run();
