/**
 * OpenBricks API Service
 * Main entry point for REST & GraphQL APIs
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const winston = require("winston");
const {
  authenticateToken,
  requireRole,
  requireOwnership,
  optionalAuth,
} = require("./middleware/auth");

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));
app.use(limiter); // Apply rate limiting to all requests

// Database connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://openbricks:openbricks@localhost:5432/openbricks",
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "openbricks-api",
      version: "0.1.0",
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection failed",
    });
  }
});

// API Info endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "OpenBricks API",
    version: "0.1.0",
    description: "Open Source Data Lakehouse Platform API",
    endpoints: {
      health: "/health",
      auth: "/api/v1/auth",
      workspaces: "/api/v1/workspaces",
      notebooks: "/api/v1/notebooks",
      jobs: "/api/v1/jobs",
      tables: "/api/v1/tables",
      clusters: "/api/v1/clusters",
    },
  });
});

// API v1 Routes
const apiRouter = express.Router();

// Authentication routes removed - handled by auth-service
// API Gateway will route /api/auth/* to auth-service

// Workspace routes - require authentication
apiRouter.get("/workspaces", authenticateToken, async (req, res) => {
  try {
    // Users see their own workspaces, admins see all
    const query =
      req.user.role === "admin"
        ? "SELECT * FROM workspaces ORDER BY created_at DESC"
        : "SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at DESC";

    const params = req.user.role === "admin" ? [] : [req.user.id];
    const result = await pool.query(query, params);

    res.json({ workspaces: result.rows });
  } catch (error) {
    logger.error("Failed to fetch workspaces:", error);
    res.status(500).json({ error: "Failed to fetch workspaces" });
  }
});

apiRouter.post("/workspaces", authenticateToken, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO workspaces (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *",
      [name, description, req.user.id]
    );
    res.status(201).json({ workspace: result.rows[0] });
  } catch (error) {
    logger.error("Failed to create workspace:", error);
    res.status(500).json({ error: "Failed to create workspace" });
  }
});

// Notebooks routes - require authentication
apiRouter.get("/notebooks", authenticateToken, async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? "SELECT * FROM notebooks ORDER BY updated_at DESC"
        : "SELECT * FROM notebooks WHERE owner_id = $1 ORDER BY updated_at DESC";

    const params = req.user.role === "admin" ? [] : [req.user.id];
    const result = await pool.query(query, params);

    res.json({ notebooks: result.rows });
  } catch (error) {
    logger.error("Failed to fetch notebooks:", error);
    res.status(500).json({ error: "Failed to fetch notebooks" });
  }
});

apiRouter.post("/notebooks", authenticateToken, async (req, res) => {
  const { name, workspace_id, language = "python", content = "" } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO notebooks (name, workspace_id, language, content, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, workspace_id, language, content, req.user.id]
    );
    res.status(201).json({ notebook: result.rows[0] });
  } catch (error) {
    logger.error("Failed to create notebook:", error);
    res.status(500).json({ error: "Failed to create notebook" });
  }
});

// Jobs routes - require authentication
apiRouter.get("/jobs", authenticateToken, async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? "SELECT * FROM jobs ORDER BY created_at DESC"
        : "SELECT j.* FROM jobs j JOIN notebooks n ON j.notebook_id = n.id WHERE n.owner_id = $1 ORDER BY j.created_at DESC";

    const params = req.user.role === "admin" ? [] : [req.user.id];
    const result = await pool.query(query, params);

    res.json({ jobs: result.rows });
  } catch (error) {
    logger.error("Failed to fetch jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

apiRouter.post("/jobs", authenticateToken, async (req, res) => {
  const { name, notebook_id, schedule } = req.body;

  if (!name || !notebook_id) {
    return res.status(400).json({ error: "Name and notebook_id are required" });
  }

  try {
    // Verify user owns the notebook
    const notebookCheck = await pool.query(
      "SELECT owner_id FROM notebooks WHERE id = $1",
      [notebook_id]
    );

    if (notebookCheck.rows.length === 0) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    if (
      notebookCheck.rows[0].owner_id !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "You do not own this notebook" });
    }

    const result = await pool.query(
      "INSERT INTO jobs (name, notebook_id, schedule, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, notebook_id, schedule, "pending"]
    );
    res.status(201).json({ job: result.rows[0] });
  } catch (error) {
    logger.error("Failed to create job:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// Tables (Data Catalog) routes - optionally authenticated (show more for auth users)
apiRouter.get("/tables", optionalAuth, async (req, res) => {
  try {
    // Public tables visible to all, private tables only to owners/admins
    const query = req.user
      ? req.user.role === "admin"
        ? "SELECT * FROM data_tables ORDER BY created_at DESC"
        : "SELECT * FROM data_tables WHERE is_public = true OR owner_id = $1 ORDER BY created_at DESC"
      : "SELECT * FROM data_tables WHERE is_public = true ORDER BY created_at DESC";

    const params = req.user && req.user.role !== "admin" ? [req.user.id] : [];
    const result = await pool.query(query, params);

    res.json({ tables: result.rows });
  } catch (error) {
    logger.error("Failed to fetch tables:", error);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// Clusters routes - require authentication, admin-only for creation
apiRouter.get("/clusters", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM clusters ORDER BY created_at DESC"
    );
    res.json({ clusters: result.rows });
  } catch (error) {
    logger.error("Failed to fetch clusters:", error);
    res.status(500).json({ error: "Failed to fetch clusters" });
  }
});

apiRouter.post(
  "/clusters",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { name, node_type = "standard", num_workers = 1 } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    try {
      const result = await pool.query(
        "INSERT INTO clusters (name, node_type, num_workers, status) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, node_type, num_workers, "pending"]
      );
      res.status(201).json({ cluster: result.rows[0] });
    } catch (error) {
      logger.error("Failed to create cluster:", error);
      res.status(500).json({ error: "Failed to create cluster" });
    }
  }
);

// Mount API router
app.use("/api/v1", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  logger.info(`OpenBricks API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
