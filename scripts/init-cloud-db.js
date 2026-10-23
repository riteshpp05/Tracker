#!/usr/bin/env node
/**
 * Shende Industries Enterprise Portal — Cloud Database Initializer
 *
 * Usage:
 *   node scripts/init-cloud-db.js
 *   node scripts/init-cloud-db.js "postgresql://user:pass@host/dbname?sslmode=require"
 *
 * This script connects to the target PostgreSQL database (Neon, Vercel Postgres, Supabase, or Local),
 * and executes the 5 initialization schemas in order:
 *   1. 01-shende-core-schema.sql
 *   2. 02-seed-data.sql
 *   3. 03-payroll-schema.sql
 *   4. 04-cloudstine-enterprise-features.sql
 *   5. 05-system-settings.sql
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dbDir = path.join(rootDir, "database");

// Require resolver for Backend/node_modules fallback
const require = createRequire(import.meta.url);
let dotenv, pkgPg;
try {
  dotenv = require("dotenv");
} catch {
  dotenv = require(path.join(rootDir, "Backend", "node_modules", "dotenv"));
}
try {
  pkgPg = require("pg");
} catch {
  pkgPg = require(path.join(rootDir, "Backend", "node_modules", "pg"));
}

const { Client } = pkgPg;

// Load .env from root or Backend/.env
if (fs.existsSync(path.join(rootDir, ".env"))) {
  dotenv.config({ path: path.join(rootDir, ".env") });
}
if (fs.existsSync(path.join(rootDir, "Backend", ".env"))) {
  dotenv.config({ path: path.join(rootDir, "Backend", ".env") });
}

const connectionString =
  process.argv[2] ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

const isLocalhost = (str) =>
  !str || str.includes("localhost") || str.includes("127.0.0.1");

const clientConfig = connectionString
  ? {
      connectionString,
      ssl: isLocalhost(connectionString) ? false : { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "timetrakpro",
      password: process.env.DB_PASSWORD || "postgres",
      port: Number(process.env.DB_PORT) || 5432,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    };

const sqlFiles = [
  "01-shende-core-schema.sql",
  "02-seed-data.sql",
  "03-payroll-schema.sql",
  "04-cloudstine-enterprise-features.sql",
  "05-system-settings.sql",
];

async function run() {
  console.log("\n========================================================");
  console.log("  Shende Industries Cloud Database Initializer (SIPL)");
  console.log("========================================================\n");

  const targetHost = connectionString
    ? connectionString.split("@")[1]?.split("/")[0] || "Custom Connection String"
    : `${clientConfig.host}:${clientConfig.port}/${clientConfig.database}`;

  console.log(`📡 Connecting to PostgreSQL Target: ${targetHost}...`);

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log("✅ Successfully connected to database.\n");

    for (let i = 0; i < sqlFiles.length; i++) {
      const fileName = sqlFiles[i];
      const filePath = path.join(dbDir, fileName);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Warning: File not found: ${fileName}. Skipping.`);
        continue;
      }

      console.log(`[${i + 1}/${sqlFiles.length}] Executing ${fileName}...`);
      const sql = fs.readFileSync(filePath, "utf-8");

      const startTime = Date.now();
      await client.query(sql);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`   └─ Completed in ${elapsed}s ✅`);
    }

    console.log("\n--------------------------------------------------------");
    console.log("🎉 Database initialization completed successfully!");
    console.log("--------------------------------------------------------\n");
    console.log("Default Demo Credentials:");
    console.log("  • Admin:   admin@shendeindustries.com   | password123");
    console.log("  • HR:      hr@shendeindustries.com      | password123");
    console.log("  • Manager: manager@shendeindustries.com | password123");
    console.log("  • Tech:    employee@shendeindustries.com| password123\n");
  } catch (err) {
    console.error("\n❌ Database initialization error:", err.message);
    if (err.detail) console.error("   Detail:", err.detail);
    if (err.hint) console.error("   Hint:", err.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
