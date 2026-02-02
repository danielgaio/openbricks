/**
 * OpenBricks API Service
 * Main entry point for REST & GraphQL APIs
 *
 * Architecture:
 * - Repository Pattern for data access abstraction
 * - Service Layer for business logic (Clean Architecture Use Cases)
 * - Event-Driven Architecture for async processing and decoupling
 * - Modular route handlers with dependency injection
 * - Centralized error handling and validation
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const winston = require("winston");

// Utilities - centralized error handling
const { errorHandler, notFoundHandler } = require("./utils/errors");

// Repositories - data access layer
const { createRepositories } = require("./repositories");

// Services - business logic layer
const { createServices } = require("./services");

// Events - domain event bus and handlers
const { createEventBus, registerHandlers } = require("./events");

// Routes - modular route handlers
const {
  createWorkspaceRoutes,
  createNotebookRoutes,
  createJobRoutes,
  createClusterRoutes,
  createTableRoutes,
} = require("./routes");

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

// Initialize Event Bus for domain events
const eventBus = createEventBus({ logger });

// Initialize repositories with database pool
const repositories = createRepositories(pool);

// Initialize services with repositories, event bus, and dependencies
const services = createServices(repositories, {
  logger,
  pool, // For audit service direct queries
  eventBus, // For domain events
});

// Register event handlers (audit, notifications, metrics, job run tracking)
// Must be after services are created so jobRunService is available
registerHandlers(eventBus, {
  pool,
  logger,
  jobRunService: services.jobRuns, // Enable automatic job run tracking
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
// Mount Modular Route Handlers
// ============================================

// Mount domain routes with service injection (Clean Architecture)
// Routes are thin adapters, services contain business logic
apiRouter.use("/workspaces", createWorkspaceRoutes(services));
apiRouter.use("/notebooks", createNotebookRoutes(services));
apiRouter.use("/jobs", createJobRoutes(services));
apiRouter.use("/clusters", createClusterRoutes(services));
apiRouter.use("/tables", createTableRoutes(services));

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
