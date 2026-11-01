import pool from "../Backend/src/config/database.js";
import bcrypt from "bcryptjs";

async function main() {
  const hash = await bcrypt.hash("password123", 10);
  const res = await pool.query("UPDATE employees SET password_hash = $1", [hash]);
  console.log("Updated passwords for", res.rowCount, "employees to password123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
