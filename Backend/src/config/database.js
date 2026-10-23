import "dotenv/config";
import pkg from "pg";
const { Pool, types } = pkg;

// Force Postgres to return dates as strings (YYYY-MM-DD)
// Type ID 1082 corresponds to DATE type in Postgres.
types.setTypeParser(1082, (stringValue) => {
  return stringValue;
});

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const isLocalhost = (str) =>
  !str || str.includes("localhost") || str.includes("127.0.0.1");

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: isLocalhost(connectionString) ? false : { rejectUnauthorized: false },
      max: process.env.VERCEL ? 5 : 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
      max: process.env.VERCEL ? 5 : 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Test database connection
pool.on("connect", () => {
  console.log("✅ Database connected successfully");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database pool error:", err.message);
  // Do not exit in serverless/production to allow lambdas to recover
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    // optional debug in local
  }
});

export default pool;
