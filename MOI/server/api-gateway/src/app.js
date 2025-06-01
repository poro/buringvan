const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const redis = require('redis');
require('dotenv').config();

const app = express();

// Redis client for caching and rate limiting
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().then(() => {
  console.log('Redis connected successfully');
}).catch(err => {
  console.error('Redis connection failed:', err);
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: {
    incr: async (key) => {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, 900); // 15 minutes
      }
      return { totalHits: current };
    },
    decrement: async (key) => {
      return await redisClient.decr(key);
    },
    resetKey: async (key) => {
      return await redisClient.del(key);
    },
    resetAll: async () => {
      // Not implemented for Redis store
    }
  }
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is no longer valid' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Service endpoints configuration
const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/api/auth': '/api/auth' }
  },
  content: {
    target: process.env.CONTENT_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: { '^/api/content': '/api/content' }
  },
  ai: {
    target: process.env.AI_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: { '^/api/ai': '/api/ai' }
  },
  social: {
    target: process.env.SOCIAL_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: { '^/api/social': '/api/social' }
  },
  analytics: {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
    pathRewrite: { '^/api/analytics': '/api/analytics' }
  },
  notifications: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    pathRewrite: { '^/api/notifications': '/api/notifications' }
  }
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const serviceHealth = {};
  
  // Check each service health
  for (const [serviceName, config] of Object.entries(services)) {
    try {
      const response = await fetch(`${config.target}/health`, {
        method: 'GET',
        timeout: 5000
      });
      serviceHealth[serviceName] = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      serviceHealth[serviceName] = 'unreachable';
    }
  }

  res.status(200).json({
    status: 'OK',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: serviceHealth
  });
});

// Authentication routes (no auth required)
app.use('/api/auth/register', createProxyMiddleware({
  target: services.auth.target,
  changeOrigin: true,
  pathRewrite: services.auth.pathRewrite
}));

app.use('/api/auth/login', createProxyMiddleware({
  target: services.auth.target,
  changeOrigin: true,
  pathRewrite: services.auth.pathRewrite
}));

app.use('/api/auth/refresh', createProxyMiddleware({
  target: services.auth.target,
  changeOrigin: true,
  pathRewrite: services.auth.pathRewrite
}));

app.use('/api/auth/forgot-password', createProxyMiddleware({
  target: services.auth.target,
  changeOrigin: true,
  pathRewrite: services.auth.pathRewrite
}));

app.use('/api/auth/reset-password', createProxyMiddleware({
  target: services.auth.target,
  changeOrigin: true,
  pathRewrite: services.auth.pathRewrite
}));

// Protected routes (authentication required)
app.use('/api/auth', authenticateToken, createProxyMiddleware({
  target: services.auth.target,
  changeOrigin: true,
  pathRewrite: services.auth.pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    // Add user info to headers for downstream services
    proxyReq.setHeader('x-user-id', req.user.userId);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-subscription', req.user.subscription?.plan || 'free');
  }
}));

app.use('/api/content', authenticateToken, createProxyMiddleware({
  target: services.content.target,
  changeOrigin: true,
  pathRewrite: services.content.pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('x-user-id', req.user.userId);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-subscription', req.user.subscription?.plan || 'free');
  }
}));

app.use('/api/ai', authenticateToken, createProxyMiddleware({
  target: services.ai.target,
  changeOrigin: true,
  pathRewrite: services.ai.pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('x-user-id', req.user.userId);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-subscription', req.user.subscription?.plan || 'free');
  }
}));

app.use('/api/social', authenticateToken, createProxyMiddleware({
  target: services.social.target,
  changeOrigin: true,
  pathRewrite: services.social.pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('x-user-id', req.user.userId);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-subscription', req.user.subscription?.plan || 'free');
  }
}));

app.use('/api/analytics', authenticateToken, createProxyMiddleware({
  target: services.analytics.target,
  changeOrigin: true,
  pathRewrite: services.analytics.pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('x-user-id', req.user.userId);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-subscription', req.user.subscription?.plan || 'free');
  }
}));

app.use('/api/notifications', authenticateToken, createProxyMiddleware({
  target: services.notifications.target,
  changeOrigin: true,
  pathRewrite: services.notifications.pathRewrite,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('x-user-id', req.user.userId);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-subscription', req.user.subscription?.plan || 'free');
  }
}));

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'AI-Powered Social Media Management System API',
    version: '1.0.0',
    description: 'API Gateway for all microservices',
    services: {
      auth: {
        description: 'Authentication and user management',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/refresh',
          'POST /api/auth/logout',
          'GET /api/auth/profile',
          'PUT /api/auth/profile',
          'POST /api/auth/forgot-password',
          'POST /api/auth/reset-password'
        ]
      },
      content: {
        description: 'Content and campaign management',
        endpoints: [
          'GET /api/content',
          'POST /api/content',
          'GET /api/content/:id',
          'PUT /api/content/:id',
          'DELETE /api/content/:id',
          'GET /api/content/campaigns',
          'POST /api/content/campaigns',
          'GET /api/content/campaigns/:id',
          'PUT /api/content/campaigns/:id',
          'DELETE /api/content/campaigns/:id'
        ]
      },
      ai: {
        description: 'AI-powered content generation',
        endpoints: [
          'POST /api/ai/generate',
          'POST /api/ai/optimize',
          'POST /api/ai/analyze',
          'GET /api/ai/templates',
          'POST /api/ai/templates'
        ]
      },
      social: {
        description: 'Social media platform integration',
        endpoints: [
          'GET /api/social/accounts',
          'POST /api/social/accounts',
          'DELETE /api/social/accounts/:id',
          'POST /api/social/post',
          'GET /api/social/posts',
          'POST /api/social/auth/:platform'
        ]
      },
      analytics: {
        description: 'Analytics and reporting',
        endpoints: [
          'GET /api/analytics/metrics',
          'GET /api/analytics/reports',
          'POST /api/analytics/reports',
          'GET /api/analytics/reports/:id',
          'POST /api/analytics/reports/:id/generate'
        ]
      },
      notifications: {
        description: 'Notification management',
        endpoints: [
          'GET /api/notifications',
          'POST /api/notifications',
          'PUT /api/notifications/:id/read',
          'GET /api/notifications/templates',
          'POST /api/notifications/templates'
        ]
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    service: 'api-gateway'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    service: 'api-gateway'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  try {
    await redisClient.disconnect();
    console.log('Redis disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  try {
    await redisClient.disconnect();
    console.log('Redis disconnected');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
