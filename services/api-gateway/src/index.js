const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'OpenBricks API Gateway',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      api: '/api',
      query: '/api/query',
      storage: '/api/storage',
      auth: '/api/auth'
    }
  });
});

// Query endpoint (proxy to query engine)
app.post('/api/query', async (req, res) => {
  try {
    // TODO: Implement query routing to Spark
    res.json({ 
      message: 'Query endpoint - Implementation pending',
      query: req.body 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Storage endpoint (proxy to MinIO/Storage service)
app.get('/api/storage/*', async (req, res) => {
  try {
    // TODO: Implement storage routing
    res.json({ 
      message: 'Storage endpoint - Implementation pending',
      path: req.params[0] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth endpoint (proxy to auth service)
app.post('/api/auth/login', async (req, res) => {
  try {
    // TODO: Implement auth routing
    res.json({ 
      message: 'Auth endpoint - Implementation pending' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`OpenBricks API Gateway running on port ${PORT}`);
});

module.exports = app;
