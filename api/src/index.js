/**
 * Knowella RAG API - Main Entry Point
 * 
 * This server handles:
 * 1. Chat requests for Knowella bot (/chat/knowella)
 * 2. Content ingestion (/ingest/knowella)
 * 3. Health checks (/health)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const schedulerService = require('./services/scheduler.service');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====

// CORS - Allow all origins for development/testing
// For production, set WORDPRESS_DOMAIN environment variable
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// JSON body parser with size limit
app.use(express.json({ limit: '1mb' }));

// Rate limiting for chat endpoints
const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30, // 30 requests per minute
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for ingestion endpoints (more restrictive)
const ingestionLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'Too many ingestion requests.' }
});

// ===== ROUTES =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      ollama: process.env.OLLAMA_URL,
      qdrant: process.env.QDRANT_URL
    }
  });
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Knowella RAG API',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'POST /chat/knowella',
      'POST /ingest/knowella'
    ]
  });
});

// Import controllers
const ingestionController = require('./controllers/ingestion.controller');
const chatController = require('./controllers/chat.controller');

// Chat endpoints
app.post('/chat/knowella', chatLimiter, (req, res) => {
  chatController.chatKnowella(req, res);
});

// Stats endpoint
app.get('/stats', (req, res) => {
  chatController.getStats(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Metrics endpoint (basic performance stats)
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024)
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Bot configuration endpoint (for WordPress)
app.get('/config/knowella', (req, res) => {
  // In production, this could fetch from WordPress API or database
  // For now, return default configuration
  res.json({
    tone: process.env.BOT_TONE || 'helpful, professional, and friendly',
    rules: process.env.BOT_RULES || 'Keep answers concise and relevant. Focus on Knowella\'s AI-powered productivity solutions.',
    disclaimer: process.env.BOT_DISCLAIMER || 'This information is based on Knowella\'s website content. For specific inquiries, please contact Knowella directly.'
  });
});

// Ingestion endpoints
app.post('/ingest/knowella', ingestionLimiter, (req, res) => {
  ingestionController.ingestKnowella(req, res);
});

// Test endpoint - ingest single URL
app.post('/ingest/single', ingestionLimiter, (req, res) => {
  ingestionController.ingestSingleUrl(req, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    // Don't expose error details in production
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ===== START SERVER =====

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Knowella RAG API running on port ${PORT}`);
  console.log(`📊 Ollama: ${process.env.OLLAMA_URL}`);
  console.log(`🔍 Qdrant: ${process.env.QDRANT_URL}`);
  console.log(`⏱️  Rate limit: ${process.env.RATE_LIMIT_MAX} requests/minute`);
  
  // Start scheduled jobs
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    schedulerService.start();
  } else {
    console.log('⏸️  Scheduler disabled (set ENABLE_SCHEDULER=true to enable)');
  }
});
