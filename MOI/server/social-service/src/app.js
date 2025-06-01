// Load environment variables
const path = require('path');
if (process.env.NODE_ENV === 'staging') {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env.staging') });
} else {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const socialRoutes = require('./routes/social.routes');

const app = express();

// Connect to database and Redis
connectDB();
connectRedis();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Service-Token']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for service-to-service requests
    return req.headers['x-service-token'] === process.env.SERVICE_SECRET;
  }
});

app.use(limiter);

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'social-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/social', socialRoutes);

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    service: 'social-service'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Social Service Error:', err);

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
      field: err.path,
      value: err.value,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: 'Duplicate value',
      field,
      message: `${field} already exists`,
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

  // Social platform API errors
  if (err.response && err.response.status) {
    const statusCode = err.response.status;
    const platformError = err.response.data;

    return res.status(statusCode).json({
      error: 'Social platform error',
      platform: req.params.platform || 'unknown',
      platformError,
      timestamp: new Date().toISOString()
    });
  }

  // Rate limiting errors
  if (err.status === 429 || err.code === 'RATE_LIMITED') {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests to social platforms',
      retryAfter: err.retryAfter || '1 hour',
      timestamp: new Date().toISOString()
    });
  }

  // Network/timeout errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'TIMEOUT') {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'External service temporarily unavailable',
      code: err.code,
      timestamp: new Date().toISOString()
    });
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      limit: err.limit,
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      field: err.field,
      timestamp: new Date().toISOString()
    });
  }

  // Database connection errors
  if (err.name === 'MongooseError' || err.name === 'MongoError') {
    return res.status(503).json({
      error: 'Database error',
      message: 'Database temporarily unavailable',
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

  // OAuth/Platform specific errors
  if (err.message && err.message.includes('OAuth')) {
    return res.status(401).json({
      error: 'OAuth authentication failed',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString(),
    service: 'social-service',
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err 
    })
  });
});

const PORT = process.env.SOCIAL_SERVICE_PORT || 3004;

const server = app.listen(PORT, () => {
  console.log(`🌐 Social Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api/social`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log('Social Service shut down');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  console.error('Promise:', promise);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
