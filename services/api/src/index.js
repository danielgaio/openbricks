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

// Middleware
const {
  authenticateToken,
  requireRole,
  requireOwnership,
  optionalAuth,
} = require("./middleware/auth");

// Utilities - centralized error handling and validation
const {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  errors,
} = require("./utils/errors");
const schemas = require("./schemas");

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
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

// Make logger available to error handler
app.set("logger", logger);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" })); // Limit body size for security
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

// ============================================
// Workspace Routes
// ============================================

/**
 * GET /workspaces - List workspaces
 * Users see their own workspaces, admins see all
 */
apiRouter.get(
  "/workspaces",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const query =
      req.user.role === "admin"
        ? "SELECT * FROM workspaces ORDER BY created_at DESC"
        : "SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at DESC";

    const params = req.user.role === "admin" ? [] : [req.user.id];
    const result = await pool.query(query, params);

    res.json({ workspaces: result.rows });
  }),
);

/**
 * POST /workspaces - Create a new workspace
 */
apiRouter.post(
  "/workspaces",
  authenticateToken,
  schemas.workspaces.create,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const result = await pool.query(
      "INSERT INTO workspaces (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *",
      [name, description, req.user.id],
    );

    res.status(201).json({ workspace: result.rows[0] });
  }),
);

// ============================================
// Notebook Routes
// ============================================

/**
 * GET /notebooks - List notebooks
 */
apiRouter.get(
  "/notebooks",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const query =
      req.user.role === "admin"
        ? "SELECT * FROM notebooks ORDER BY updated_at DESC"
        : "SELECT * FROM notebooks WHERE owner_id = $1 ORDER BY updated_at DESC";

    const params = req.user.role === "admin" ? [] : [req.user.id];
    const result = await pool.query(query, params);

    res.json({ notebooks: result.rows });
  }),
);

/**
 * POST /notebooks - Create a new notebook
 */
apiRouter.post(
  "/notebooks",
  authenticateToken,
  schemas.notebooks.create,
  asyncHandler(async (req, res) => {
    const { name, workspace_id, language = "python", content = "" } = req.body;

    // Verify workspace access if workspace_id provided
    if (workspace_id) {
      const workspace = await pool.query(
        "SELECT owner_id FROM workspaces WHERE id = $1",
        [workspace_id],
      );
      if (workspace.rows.length === 0) {
        throw errors.notFound("Workspace");
      }
      if (
        req.user.role !== "admin" &&
        workspace.rows[0].owner_id !== req.user.id
      ) {
        throw errors.forbidden("You do not have access to this workspace");
      }
    }

    const result = await pool.query(
      "INSERT INTO notebooks (name, workspace_id, language, content, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, workspace_id, language, content, req.user.id],
    );

    res.status(201).json({ notebook: result.rows[0] });
  }),
);

// ============================================
// Job Routes
// ============================================

/**
 * GET /jobs - List jobs
 */
apiRouter.get(
  "/jobs",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const query =
      req.user.role === "admin"
        ? "SELECT * FROM jobs ORDER BY created_at DESC"
        : `SELECT j.* FROM jobs j 
           JOIN notebooks n ON j.notebook_id = n.id 
           WHERE n.owner_id = $1 
           ORDER BY j.created_at DESC`;

    const params = req.user.role === "admin" ? [] : [req.user.id];
    const result = await pool.query(query, params);

    res.json({ jobs: result.rows });
  }),
);

/**
 * POST /jobs - Create a new job
 */
apiRouter.post(
  "/jobs",
  authenticateToken,
  schemas.jobs.create,
  asyncHandler(async (req, res) => {
    const { name, notebook_id, schedule } = req.body;

    // Verify user owns the notebook
    const notebook = await pool.query(
      "SELECT owner_id FROM notebooks WHERE id = $1",
      [notebook_id],
    );

    if (notebook.rows.length === 0) {
      throw errors.notFound("Notebook");
    }

    if (
      req.user.role !== "admin" &&
      notebook.rows[0].owner_id !== req.user.id
    ) {
      throw errors.forbidden("You do not own this notebook");
    }

    const result = await pool.query(
      "INSERT INTO jobs (name, notebook_id, schedule, status, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, notebook_id, schedule, "pending", req.user.id],
    );

    res.status(201).json({ job: result.rows[0] });
  }),
);

// ============================================
// Table (Data Catalog) Routes
// ============================================

/**
 * GET /tables - List data tables
 * Public tables visible to all, private to owners/admins
 */
apiRouter.get(
  "/tables",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const query = req.user
      ? req.user.role === "admin"
        ? "SELECT * FROM data_tables ORDER BY created_at DESC"
        : "SELECT * FROM data_tables WHERE is_public = true OR owner_id = $1 ORDER BY created_at DESC"
      : "SELECT * FROM data_tables WHERE is_public = true ORDER BY created_at DESC";

    const params = req.user && req.user.role !== "admin" ? [req.user.id] : [];
    const result = await pool.query(query, params);

    res.json({ tables: result.rows });
  }),
);

// ============================================
// Cluster Routes
// ============================================

/**
 * GET /clusters - List clusters
 */
apiRouter.get(
  "/clusters",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT * FROM clusters ORDER BY created_at DESC",
    );
    res.json({ clusters: result.rows });
  }),
);

/**
 * POST /clusters - Create a new cluster (admin only)
 */
apiRouter.post(
  "/clusters",
  authenticateToken,
  requireRole("admin"),
  schemas.clusters.create,
  asyncHandler(async (req, res) => {
    const {
      name,
      node_type = "standard",
      num_workers = 1,
      driver_memory = "2g",
      executor_memory = "2g",
      spark_version = "3.5.0",
    } = req.body;

    const result = await pool.query(
      `INSERT INTO clusters 
       (name, node_type, num_workers, driver_memory, executor_memory, spark_version, status, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        name,
        node_type,
        num_workers,
        driver_memory,
        executor_memory,
        spark_version,
        "pending",
        req.user.id,
      ],
    );

    res.status(201).json({ cluster: result.rows[0] });
  }),
);

// ============================================
// Mount Router & Error Handling
// ============================================

// Mount API router
app.use("/api/v1", apiRouter);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`OpenBricks API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
