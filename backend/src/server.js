/**
 * server.js — Express application entry point (production-ready)
 *
 * Security layers applied:
 *  1. Helmet       — sets 14 security HTTP headers
 *  2. CORS         — whitelist-based origin control
 *  3. Rate limiter — per-IP request throttling
 *  4. Compression  — gzip/brotli response bodies
 *  5. JSON limit   — cap payload size to prevent DoS
 */

require("dotenv").config();
const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const compression = require("compression");
const { getPrisma, disconnectPrisma } = require("./config/db");

// ── Route imports ──────────────────────────────────────────────────────────
const authRoutes    = require("./routes/auth.routes");
const taskRoutes    = require("./routes/task.routes");
const workoutRoutes = require("./routes/workout.routes");
const matchRoutes   = require("./routes/match.routes");
const networkRoutes = require("./routes/network.routes");

// ── Middleware imports ─────────────────────────────────────────────────────
const { globalLimiter }   = require("./middleware/rateLimiter.middleware");
const { errorHandler }    = require("./middleware/errorHandler.middleware");
const { requestLogger }   = require("./middleware/logger.middleware");

const app  = express();
const PORT = process.env.PORT || 4000;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Security headers
// ─────────────────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Managed separately for API-only server
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORS — allow only whitelisted origins
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, server-to-server) in development
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Compression + Body parsers
// ─────────────────────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "50kb" }));     // Reject oversized JSON payloads
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ─────────────────────────────────────────────────────────────────────────────
// 4. Request logger (dev) + global rate limiter
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") app.use(requestLogger);
app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Health check (used by hosting platform uptime monitoring)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "disconnected" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. API Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/tasks",    taskRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/match",    matchRoutes);
app.use("/api/network",  networkRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 7. 404 handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Global error handler (must be last)
// ─────────────────────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Start server + graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀  Server running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    await disconnectPrisma();
    console.log("   Database disconnected. Bye! 👋");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

module.exports = app; // for testing
