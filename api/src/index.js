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

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====

// CORS - Allow requests from WordPress domain and local file testing
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like local file:// or mobile apps)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.WORDPRESS_DOMAIN,
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:8080',
      'null' // Allow direct file:// access for testing
    ].filter(Boolean);
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
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
      'POST /ingest/knowella',
      'POST /webhook/wordpress-update'
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

// Ingestion endpoints
app.post('/ingest/knowella', ingestionLimiter, (req, res) => {
  ingestionController.ingestKnowella(req, res);
});

// Webhook endpoint for WordPress (no rate limiting for reliability)
app.post('/webhook/wordpress-update', (req, res) => {
  // Verify webhook secret
  const webhookSecret = req.headers['x-webhook-secret'];
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
  }

  // Set webhook trigger header
  req.headers['x-webhook-trigger'] = 'wordpress';
  req.body.trigger = 'wordpress';

  // Trigger ingestion asynchronously
  ingestionController.ingestKnowella(req, res)
    .catch(error => {
      console.error('Webhook ingestion error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    });
});

app.post('/rebuild-bm25', ingestionLimiter, async (req, res) => {
  try {
    console.log('\n🔨 Rebuilding BM25 index from existing Qdrant chunks...\n');
    await ingestionController.buildBM25Index();
    res.json({ success: true, message: 'BM25 index rebuilt successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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

const bm25Service = require('./services/bm25.service');

async function startServer() {
  // Load BM25 index on startup
  console.log('🔨 Loading BM25 index...');
  const loaded = await bm25Service.loadIndex();

  if (loaded) {
    const stats = bm25Service.getStats();
    console.log(`✅ BM25 index loaded: ${stats.totalDocuments} documents`);
  } else {
    console.log('⚠️  BM25 index not found, will build during first ingestion');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Knowella RAG API running on port ${PORT}`);
    console.log(`📊 Ollama: ${process.env.OLLAMA_URL}`);
    console.log(`🔍 Qdrant: ${process.env.QDRANT_URL}`);
    console.log(`⏱️  Rate limit: ${process.env.RATE_LIMIT_MAX} requests/minute`);
    console.log(`🔀 Hybrid search: ENABLED (BM25 + Semantic)\n`);
  });
}

startServer();
