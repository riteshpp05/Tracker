import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Import custom middleware & routes
import routes from "./routes/index.js";
import emailRoutes from "./routes/emailRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import { initEmailCrons } from "./controllers/emailController.js";
import { initDbBackupCron } from "./controllers/dbBackup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Dynamic, safe CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://timetrack.abhiyantatech.com",
  "https://timetrack.abhiyantatech.com",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy blocked access from this origin."));
    },
    credentials: true,
  })
);

// No-Cache headers for dynamic data
app.use((req, res, next) => {
  if (
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/uploads/") ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$/)
  ) {
    next();
  } else {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  }
});

// Body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use(compression());

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Shende Industries Enterprise API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Uploads directory static serving
const uploadsPath = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath));

// API routes
app.use("/api", routes);
app.use("/api/v1", routes); // Support both /api and /api/v1
app.use("/api/email", emailRoutes);

// Production Static Serving
if (process.env.NODE_ENV === "production") {
  const reactBuildPath = path.join(__dirname, "../../Frontend/dist");
  const indexPath = path.join(reactBuildPath, "index.html");

  if (fs.existsSync(indexPath)) {
    app.use(express.static(reactBuildPath));
    app.get("*", (req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    app.get("/", (req, res) => {
      res.json({
        status: "OK",
        service: "Shende Industries Backend API",
        message: "API server is running.",
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });
    });
  }
}

// Global error handler
app.use(errorHandler);

// Background cron initializations (only in standalone persistent servers, not in Vercel serverless or test)
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  initEmailCrons();
  initDbBackupCron();
}

// Start server (only if run directly or not running in Vercel serverless or test environment)
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Shende Industries Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

export default app;
