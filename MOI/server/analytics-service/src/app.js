require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const cronService = require('./services/cron.service');

// Routes
const analyticsRoutes = require('./routes/analytics.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

// Connect to database
connectDB();

// Connect to Redis
connectRedis();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-key', 'x-service-name']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(limiter.windowMs / 1000)
    });
  }
});

app.use(limiter);

// Logging
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics service is healthy',
    timestamp: new Date().toISOString(),
    service: 'analytics-service',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'analytics-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cronJobs: cronService.listJobs()
    }
  });
});

// API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/reports', reportsRoutes);

// Admin endpoints for cron job management
app.post('/admin/cron/:jobName/trigger', async (req, res) => {
  try {
    const { jobName } = req.params;
    await cronService.triggerJob(jobName);
    
    res.json({
      success: true,
      message: `Job ${jobName} triggered successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/admin/cron/jobs', (req, res) => {
  res.json({
    success: true,
    data: { jobs: cronService.listJobs() }
  });
});

app.post('/admin/cron/:jobName/stop', (req, res) => {
  const { jobName } = req.params;
  const success = cronService.stopJob(jobName);
  
  res.json({
    success,
    message: success ? `Job ${jobName} stopped` : `Job ${jobName} not found`
  });
});

app.post('/admin/cron/:jobName/start', (req, res) => {
  const { jobName } = req.params;
  const success = cronService.startJob(jobName);
  
  res.json({
    success,
    message: success ? `Job ${jobName} started` : `Job ${jobName} not found`
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Analytics service endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Analytics service error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // CORS error
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  cronService.stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  cronService.stopAllJobs();
  process.exit(0);
});

const PORT = process.env.ANALYTICS_PORT || 5004;

app.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
