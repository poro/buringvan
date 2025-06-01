const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const authenticateService = async (req, res, next) => {
  try {
    const serviceToken = req.headers['x-service-token'];
    
    if (!serviceToken) {
      return res.status(401).json({
        success: false,
        message: 'Service token required'
      });
    }

    if (serviceToken !== process.env.SERVICE_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Invalid service token'
      });
    }

    next();
  } catch (error) {
    console.error('Service authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Service authentication failed'
    });
  }
};

const authorizeAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

const authorizeUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is accessing their own resources
    const userId = req.params.userId || req.body.userId;
    if (userId && userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    next();
  } catch (error) {
    console.error('User authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

const checkSubscriptionPlan = (requiredPlan = 'basic') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userPlan = req.user.subscriptionPlan || 'free';
      
      // Plan hierarchy: free < basic < premium < enterprise
      const planLevels = {
        free: 0,
        basic: 1,
        premium: 2,
        enterprise: 3
      };

      const userLevel = planLevels[userPlan] || 0;
      const requiredLevel = planLevels[requiredPlan] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `${requiredPlan} plan or higher required`,
          userPlan,
          requiredPlan
        });
      }

      req.userPlan = userPlan;
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Subscription verification failed'
      });
    }
  };
};

const checkNotificationLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPlan = req.user.subscriptionPlan || 'free';
    
    // Define notification limits per plan
    const notificationLimits = {
      free: {
        daily: 10,
        monthly: 100,
        channels: ['in_app']
      },
      basic: {
        daily: 50,
        monthly: 1000,
        channels: ['in_app', 'email', 'push']
      },
      premium: {
        daily: 200,
        monthly: 5000,
        channels: ['in_app', 'email', 'push', 'sms']
      },
      enterprise: {
        daily: -1, // unlimited
        monthly: -1, // unlimited
        channels: ['in_app', 'email', 'push', 'sms']
      }
    };

    const limits = notificationLimits[userPlan];
    
    // Check if requested channels are allowed
    const requestedChannels = req.body.channels || ['in_app'];
    const unauthorizedChannels = requestedChannels.filter(
      channel => !limits.channels.includes(channel)
    );

    if (unauthorizedChannels.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Channels not allowed for ${userPlan} plan: ${unauthorizedChannels.join(', ')}`,
        allowedChannels: limits.channels
      });
    }

    // TODO: Implement actual usage checking
    // This would require tracking daily/monthly notification counts per user
    
    req.notificationLimits = limits;
    next();
  } catch (error) {
    console.error('Notification limits check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Limits verification failed'
    });
  }
};

const rateLimitByUser = (windowMs = 60000, maxRequests = 100) => {
  const userRequests = new Map();

  return (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for rate limiting'
        });
      }

      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      if (userRequests.has(userId)) {
        const userRequestTimes = userRequests.get(userId);
        const recentRequests = userRequestTimes.filter(time => time > windowStart);
        userRequests.set(userId, recentRequests);
      }

      // Check current request count
      const currentRequests = userRequests.get(userId) || [];
      
      if (currentRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil((currentRequests[0] + windowMs - now) / 1000)
        });
      }

      // Add current request
      currentRequests.push(now);
      userRequests.set(userId, currentRequests);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - currentRequests.length),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
};

const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    // In a real implementation, you would validate the API key against a database
    // For now, we'll use a simple check
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'API key validation failed'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (error) {
        // Token is invalid but we continue without authentication
        console.warn('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue even on error for optional auth
  }
};

module.exports = {
  authenticateToken,
  authenticateService,
  authorizeAdmin,
  authorizeUser,
  checkSubscriptionPlan,
  checkNotificationLimits,
  rateLimitByUser,
  validateApiKey,
  optionalAuth
};
