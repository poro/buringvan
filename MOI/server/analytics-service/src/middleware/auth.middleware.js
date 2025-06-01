const jwt = require('jsonwebtoken');
const axios = require('axios');

// Cache for user data to avoid repeated requests
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class AuthMiddleware {
  // Basic authentication middleware
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired'
          });
        }
        
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  // Service-to-service authentication
  async authenticateService(req, res, next) {
    try {
      const serviceKey = req.headers['x-service-key'];
      const serviceName = req.headers['x-service-name'];

      if (!serviceKey || !serviceName) {
        return res.status(401).json({
          success: false,
          message: 'Service authentication required'
        });
      }

      // Verify service key
      const expectedKey = process.env[`${serviceName.toUpperCase()}_SERVICE_KEY`];
      
      if (!expectedKey || serviceKey !== expectedKey) {
        return res.status(401).json({
          success: false,
          message: 'Invalid service credentials'
        });
      }

      req.service = { name: serviceName };
      next();
    } catch (error) {
      console.error('Service authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Service authentication failed'
      });
    }
  }

  // Get user details with caching
  async getUserDetails(userId) {
    const cacheKey = `user:${userId}`;
    const cached = userCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${userId}`, {
        headers: {
          'x-service-key': process.env.ANALYTICS_SERVICE_KEY,
          'x-service-name': 'analytics-service'
        },
        timeout: 5000
      });

      const userData = response.data.data.user;
      
      // Cache the result
      userCache.set(cacheKey, {
        data: userData,
        timestamp: Date.now()
      });

      return userData;
    } catch (error) {
      console.error('Failed to fetch user details:', error.message);
      throw new Error('User not found');
    }
  }

  // Subscription-based authorization
  async checkSubscription(requiredPlan = 'basic') {
    return async (req, res, next) => {
      try {
        const { userId } = req.user;

        // Get user details
        const user = await this.getUserDetails(userId);

        if (!user.subscription || !user.subscription.plan) {
          return res.status(403).json({
            success: false,
            message: 'Active subscription required'
          });
        }

        // Check if subscription is active
        if (user.subscription.status !== 'active') {
          return res.status(403).json({
            success: false,
            message: 'Active subscription required'
          });
        }

        // Check plan level
        const planHierarchy = {
          basic: 1,
          pro: 2,
          enterprise: 3
        };

        const userPlanLevel = planHierarchy[user.subscription.plan] || 0;
        const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

        if (userPlanLevel < requiredPlanLevel) {
          return res.status(403).json({
            success: false,
            message: `${requiredPlan} plan required for this feature`
          });
        }

        req.user.subscription = user.subscription;
        next();
      } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({
          success: false,
          message: 'Subscription verification failed'
        });
      }
    };
  }

  // Rate limiting based on subscription plan
  async checkUsageLimits(feature) {
    return async (req, res, next) => {
      try {
        const { userId, subscription } = req.user;

        if (!subscription) {
          return res.status(403).json({
            success: false,
            message: 'Subscription required'
          });
        }

        // Define usage limits per plan
        const limits = {
          basic: {
            metricsPerDay: 1000,
            reportsPerMonth: 5,
            exportFormats: ['csv'],
            retentionDays: 30
          },
          pro: {
            metricsPerDay: 10000,
            reportsPerMonth: 25,
            exportFormats: ['csv', 'excel', 'pdf'],
            retentionDays: 90
          },
          enterprise: {
            metricsPerDay: 100000,
            reportsPerMonth: 100,
            exportFormats: ['csv', 'excel', 'pdf', 'json'],
            retentionDays: 365
          }
        };

        const userLimits = limits[subscription.plan] || limits.basic;

        // Check feature-specific limits
        switch (feature) {
          case 'report_export':
            const { format } = req.body;
            if (format && !userLimits.exportFormats.includes(format)) {
              return res.status(403).json({
                success: false,
                message: `${format} export not available in ${subscription.plan} plan`
              });
            }
            break;

          case 'advanced_analytics':
            if (subscription.plan === 'basic') {
              return res.status(403).json({
                success: false,
                message: 'Advanced analytics available in Pro and Enterprise plans'
              });
            }
            break;

          case 'custom_reports':
            if (subscription.plan === 'basic') {
              return res.status(403).json({
                success: false,
                message: 'Custom reports available in Pro and Enterprise plans'
              });
            }
            break;
        }

        req.user.limits = userLimits;
        next();
      } catch (error) {
        console.error('Usage limits check error:', error);
        res.status(500).json({
          success: false,
          message: 'Usage verification failed'
        });
      }
    };
  }

  // Admin access check
  async requireAdmin(req, res, next) {
    try {
      const { userId } = req.user;
      const user = await this.getUserDetails(userId);

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      next();
    } catch (error) {
      console.error('Admin check error:', error);
      res.status(500).json({
        success: false,
        message: 'Admin verification failed'
      });
    }
  }

  // Optional authentication for public endpoints
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
        } catch (jwtError) {
          // Continue without user for public access
          req.user = null;
        }
      }

      next();
    } catch (error) {
      console.error('Optional authentication error:', error);
      next();
    }
  }

  // Clear user cache when needed
  clearUserCache(userId) {
    if (userId) {
      userCache.delete(`user:${userId}`);
    } else {
      userCache.clear();
    }
  }

  // Cleanup expired cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of userCache.entries()) {
      if (now - value.timestamp >= CACHE_TTL) {
        userCache.delete(key);
      }
    }
  }
}

const authMiddleware = new AuthMiddleware();

// Cleanup cache every 10 minutes
setInterval(() => {
  authMiddleware.cleanupCache();
}, 10 * 60 * 1000);

module.exports = {
  authenticate: authMiddleware.authenticate.bind(authMiddleware),
  authenticateService: authMiddleware.authenticateService.bind(authMiddleware),
  checkSubscription: authMiddleware.checkSubscription.bind(authMiddleware),
  checkUsageLimits: authMiddleware.checkUsageLimits.bind(authMiddleware),
  requireAdmin: authMiddleware.requireAdmin.bind(authMiddleware),
  optionalAuth: authMiddleware.optionalAuth.bind(authMiddleware),
  clearUserCache: authMiddleware.clearUserCache.bind(authMiddleware)
};
