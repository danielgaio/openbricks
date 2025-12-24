const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 8080;

// Service URLs from environment
const API_SERVICE_URL = process.env.API_SERVICE_URL || "http://localhost:8000";
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:8001";
const STORAGE_SERVICE_URL =
  process.env.STORAGE_SERVICE_URL || "http://localhost:8002";
const QUERY_SERVICE_URL =
  process.env.QUERY_SERVICE_URL || "http://localhost:8003";

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    upstreams: {
      api: API_SERVICE_URL,
      auth: AUTH_SERVICE_URL,
      storage: STORAGE_SERVICE_URL,
      query: QUERY_SERVICE_URL,
    },
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "OpenBricks API Gateway",
    version: "0.1.0",
    description: "Central gateway for all OpenBricks services",
    endpoints: {
      health: "/health",
      api: "/api",
      auth: "/api/auth/*",
      workspaces: "/api/v1/workspaces",
      notebooks: "/api/v1/notebooks",
      jobs: "/api/v1/jobs",
      tables: "/api/v1/tables",
      clusters: "/api/v1/clusters",
      storage: "/api/storage/*",
      query: "/api/query",
    },
  });
});

// Proxy configuration options
const proxyOptions = {
  changeOrigin: true,
  logLevel: "warn",
  onError: (err, req, res) => {
    console.error("Proxy error:", err.message);
    res.status(502).json({
      error: "Bad Gateway",
      message: "Unable to connect to upstream service",
      service: req.baseUrl,
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward original client IP
    if (req.ip) {
      proxyReq.setHeader("X-Forwarded-For", req.ip);
    }
  },
};

// Auth service proxy - handles login, register, verify, refresh
app.use(
  "/api/auth",
  createProxyMiddleware({
    ...proxyOptions,
    target: AUTH_SERVICE_URL,
    pathRewrite: {
      "^/api/auth": "/api/auth",
    },
  })
);

// API service proxy - handles workspaces, notebooks, jobs, clusters, tables
app.use(
  "/api/v1",
  createProxyMiddleware({
    ...proxyOptions,
    target: API_SERVICE_URL,
    pathRewrite: {
      "^/api/v1": "/api/v1",
    },
  })
);

// Storage service proxy - handles file operations and data catalog
app.use(
  "/api/storage",
  createProxyMiddleware({
    ...proxyOptions,
    target: STORAGE_SERVICE_URL,
    pathRewrite: {
      "^/api/storage": "",
    },
  })
);

// Query engine proxy - handles Spark queries
app.use(
  "/api/query",
  createProxyMiddleware({
    ...proxyOptions,
    target: QUERY_SERVICE_URL,
    pathRewrite: {
      "^/api/query": "",
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`OpenBricks API Gateway running on port ${PORT}`);
});

module.exports = app;
