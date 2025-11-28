/**
 * OpenBricks API Service
 * Main entry point for REST & GraphQL APIs
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(limiter); // Apply rate limiting to all requests

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://openbricks:openbricks@localhost:5432/openbricks'
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'openbricks-api',
      version: '0.1.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'OpenBricks API',
    version: '0.1.0',
    description: 'Open Source Data Lakehouse Platform API',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      workspaces: '/api/v1/workspaces',
      notebooks: '/api/v1/notebooks',
      jobs: '/api/v1/jobs',
      tables: '/api/v1/tables',
      clusters: '/api/v1/clusters'
    }
  });
});

// API v1 Routes
const apiRouter = express.Router();

// Authentication routes (with stricter rate limiting)
apiRouter.post('/auth/login', authLimiter, async (req, res) => {
  // TODO: Implement authentication
  res.json({ message: 'Login endpoint - coming soon' });
});

apiRouter.post('/auth/register', authLimiter, async (req, res) => {
  // TODO: Implement registration
  res.json({ message: 'Register endpoint - coming soon' });
});

// Workspace routes
apiRouter.get('/workspaces', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workspaces ORDER BY created_at DESC');
    res.json({ workspaces: result.rows });
  } catch (error) {
    logger.error('Failed to fetch workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

apiRouter.post('/workspaces', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO workspaces (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json({ workspace: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Notebooks routes
apiRouter.get('/notebooks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notebooks ORDER BY updated_at DESC');
    res.json({ notebooks: result.rows });
  } catch (error) {
    logger.error('Failed to fetch notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
});

apiRouter.post('/notebooks', async (req, res) => {
  const { name, workspace_id, language = 'python' } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO notebooks (name, workspace_id, language) VALUES ($1, $2, $3) RETURNING *',
      [name, workspace_id, language]
    );
    res.status(201).json({ notebook: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create notebook:', error);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

// Jobs routes
apiRouter.get('/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
    res.json({ jobs: result.rows });
  } catch (error) {
    logger.error('Failed to fetch jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

apiRouter.post('/jobs', async (req, res) => {
  const { name, notebook_id, schedule } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO jobs (name, notebook_id, schedule, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, notebook_id, schedule, 'pending']
    );
    res.status(201).json({ job: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Tables (Data Catalog) routes
apiRouter.get('/tables', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM data_tables ORDER BY created_at DESC');
    res.json({ tables: result.rows });
  } catch (error) {
    logger.error('Failed to fetch tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Clusters routes
apiRouter.get('/clusters', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clusters ORDER BY created_at DESC');
    res.json({ clusters: result.rows });
  } catch (error) {
    logger.error('Failed to fetch clusters:', error);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

apiRouter.post('/clusters', async (req, res) => {
  const { name, node_type = 'standard', num_workers = 1 } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clusters (name, node_type, num_workers, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, node_type, num_workers, 'pending']
    );
    res.status(201).json({ cluster: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create cluster:', error);
    res.status(500).json({ error: 'Failed to create cluster' });
  }
});

// Mount API router
app.use('/api/v1', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`OpenBricks API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
