// Only load dotenv in non-test environments FIRST
if (process.env.NODE_ENV !== 'test') {
  const path = require('path');
  // Load staging environment if NODE_ENV is staging
  if (process.env.NODE_ENV === 'staging') {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env.staging') });
  } else {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/database');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conditional requireAuth middleware for test mode
const { authenticate } = require('./middleware/auth.middleware');

let requireAuth;
if (process.env.NODE_ENV === 'test') {
  requireAuth = (req, res, next) => next(); // No-op middleware for test mode
} else {
  requireAuth = authenticate;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ai-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/ai', aiRoutes);

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('AI Service Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      timestamp: new Date().toISOString()
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      timestamp: new Date().toISOString()
    });
  }

  // OpenAI API errors
  if (err.type === 'insufficient_quota') {
    return res.status(429).json({
      error: 'AI service quota exceeded',
      message: 'Please try again later or upgrade your plan',
      timestamp: new Date().toISOString()
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      error: 'AI service rate limit exceeded',
      message: 'Please wait before making another request',
      timestamp: new Date().toISOString()
    });
  }

  // Redis connection errors
  if (err.code === 'ECONNREFUSED' && err.address === '127.0.0.1') {
    console.warn('Redis connection failed, continuing without cache');
    return res.status(500).json({
      error: 'Cache service unavailable',
      message: 'The request was processed but caching is temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const PORT = process.env.NODE_ENV === 'test' ? 0 : process.env.AI_SERVICE_PORT || 3003;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Service running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 OpenAI API: ${process.env.OPENAI_API_KEY ? 'configured' : 'missing'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('AI Service shut down');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('AI Service shut down');
    process.exit(0);
  });
});

module.exports = app;
