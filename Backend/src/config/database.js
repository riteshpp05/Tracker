import "dotenv/config";
import pkg from "pg";
const { Pool, types } = pkg;

// Force Postgres to return dates as strings (YYYY-MM-DD)
// Type ID 1082 corresponds to DATE type in Postgres.
types.setTypeParser(1082, (stringValue) => {
  return stringValue;
});

// Clean and sanitize connection string (trim whitespace, accidental quotes, or channel_binding/sslmode params)
let rawConnectionString = (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  ""
)
  .trim()
  .replace(/^["']|["']$/g, "");

// Strip sslmode and channel_binding so pg-connection-string does not wipe out rejectUnauthorized: false
const connectionString = rawConnectionString
  ? rawConnectionString
      .replace(/[?&](sslmode|channel_binding)=[^&]+/g, "")
      .replace(/[?&]$/, "")
  : null;

const isLocalhost = (str) =>
  !str || str.includes("localhost") || str.includes("127.0.0.1");

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: isLocalhost(connectionString) ? false : { rejectUnauthorized: false },
      max: process.env.VERCEL ? 3 : 15,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 3500, // Quick failover so serverless lambdas don't hang
      statement_timeout: 4000,
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
      max: process.env.VERCEL ? 3 : 15,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 3500,
      statement_timeout: 4000,
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
