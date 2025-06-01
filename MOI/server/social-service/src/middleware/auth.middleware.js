const jwt = require('jsonwebtoken');
const axios = require('axios');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided or invalid format'
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
          error: 'Token expired',
          message: 'Please login again'
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token is malformed or invalid'
        });
      }

      throw jwtError;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to verify token'
    });
  }
};

// Verify token with auth service
const verifyWithAuthService = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided or invalid format'
      });
    }

    const token = authHeader.substring(7);

    try {
      // Verify token with auth service
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const response = await axios.get(`${authServiceUrl}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });

      req.user = response.data.user;
      next();
    } catch (authError) {
      if (authError.response?.status === 401) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token verification failed'
        });
      }

      if (authError.code === 'ECONNREFUSED') {
        console.warn('Auth service unavailable, falling back to local verification');
        return verifyToken(req, res, next);
      }

      throw authError;
    }
  } catch (error) {
    console.error('Auth service verification error:', error);
    
    // Fallback to local token verification
    return verifyToken(req, res, next);
  }
};

// Check subscription plan for social features
const checkSubscription = (requiredPlan = 'basic') => {
  const planHierarchy = {
    free: 0,
    basic: 1,
    premium: 2,
    enterprise: 3
  };

  return (req, res, next) => {
    try {
      const userPlan = req.user?.subscription?.plan || 'free';
      const userPlanLevel = planHierarchy[userPlan];
      const requiredPlanLevel = planHierarchy[requiredPlan];

      if (userPlanLevel === undefined || requiredPlanLevel === undefined) {
        return res.status(400).json({
          error: 'Invalid subscription plan'
        });
      }

      if (userPlanLevel < requiredPlanLevel) {
        return res.status(403).json({
          error: 'Subscription upgrade required',
          message: `This feature requires ${requiredPlan} plan or higher`,
          currentPlan: userPlan,
          requiredPlan
        });
      }

      req.userPlan = userPlan;
      req.planLevel = userPlanLevel;
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({
        error: 'Failed to verify subscription',
        message: error.message
      });
    }
  };
};

// Check platform limits based on subscription
const checkPlatformLimits = async (req, res, next) => {
  try {
    const userPlan = req.user?.subscription?.plan || 'free';
    const userId = req.user.id;

    const platformLimits = {
      free: {
        maxAccounts: 2,
        maxPosts: 10,
        platforms: ['linkedin', 'twitter']
      },
      basic: {
        maxAccounts: 5,
        maxPosts: 50,
        platforms: ['linkedin', 'twitter', 'instagram']
      },
      premium: {
        maxAccounts: 10,
        maxPosts: 200,
        platforms: ['linkedin', 'twitter', 'instagram', 'tiktok']
      },
      enterprise: {
        maxAccounts: 50,
        maxPosts: 1000,
        platforms: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
      }
    };

    const limits = platformLimits[userPlan];
    if (!limits) {
      return res.status(400).json({
        error: 'Invalid subscription plan'
      });
    }

    // Check if requested platform is allowed
    const requestedPlatform = req.params.platform || req.body.platform;
    if (requestedPlatform && !limits.platforms.includes(requestedPlatform)) {
      return res.status(403).json({
        error: 'Platform not available',
        message: `${requestedPlatform} is not available in your ${userPlan} plan`,
        availablePlatforms: limits.platforms
      });
    }

    // Check account limits for new connections
    if (req.route.path.includes('callback') || req.route.path.includes('connect')) {
      const SocialAccount = require('../models/socialAccount.model');
      const accountCount = await SocialAccount.countDocuments({ 
        userId, 
        isActive: true 
      });

      if (accountCount >= limits.maxAccounts) {
        return res.status(403).json({
          error: 'Account limit reached',
          message: `Your ${userPlan} plan allows up to ${limits.maxAccounts} social accounts`,
          currentCount: accountCount,
          maxAllowed: limits.maxAccounts
        });
      }
    }

    // Check daily post limits
    if (req.route.path.includes('post') && req.method === 'POST') {
      const PostedContent = require('../models/postedContent.model');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayPosts = await PostedContent.countDocuments({
        userId,
        'scheduling.postedAt': {
          $gte: today,
          $lt: tomorrow
        },
        status: { $in: ['posting', 'posted'] }
      });

      if (todayPosts >= limits.maxPosts) {
        return res.status(429).json({
          error: 'Daily post limit reached',
          message: `Your ${userPlan} plan allows up to ${limits.maxPosts} posts per day`,
          currentCount: todayPosts,
          maxAllowed: limits.maxPosts,
          resetTime: tomorrow.toISOString()
        });
      }
    }

    req.platformLimits = limits;
    next();
  } catch (error) {
    console.error('Platform limits check error:', error);
    res.status(500).json({
      error: 'Failed to verify platform limits',
      message: error.message
    });
  }
};

// Check if user owns the social account
const checkAccountOwnership = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    if (!accountId) {
      return next();
    }

    const SocialAccount = require('../models/socialAccount.model');
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId,
      isActive: true
    });

    if (!account) {
      return res.status(404).json({
        error: 'Social account not found',
        message: 'Account does not exist or you do not have access to it'
      });
    }

    req.socialAccount = account;
    next();
  } catch (error) {
    console.error('Account ownership check error:', error);
    res.status(500).json({
      error: 'Failed to verify account ownership',
      message: error.message
    });
  }
};

// Check if user owns the posted content
const checkContentOwnership = async (req, res, next) => {
  try {
    const { postedContentId } = req.params;
    const userId = req.user.id;

    if (!postedContentId) {
      return next();
    }

    const PostedContent = require('../models/postedContent.model');
    const content = await PostedContent.findOne({
      _id: postedContentId,
      userId
    });

    if (!content) {
      return res.status(404).json({
        error: 'Posted content not found',
        message: 'Content does not exist or you do not have access to it'
      });
    }

    req.postedContent = content;
    next();
  } catch (error) {
    console.error('Content ownership check error:', error);
    res.status(500).json({
      error: 'Failed to verify content ownership',
      message: error.message
    });
  }
};

// Service-to-service authentication
const verifyServiceToken = (req, res, next) => {
  try {
    const serviceToken = req.headers['x-service-token'];
    const expectedToken = process.env.SERVICE_SECRET;

    if (!serviceToken || !expectedToken) {
      return res.status(401).json({
        error: 'Service authentication required'
      });
    }

    if (serviceToken !== expectedToken) {
      return res.status(401).json({
        error: 'Invalid service token'
      });
    }

    req.isServiceRequest = true;
    next();
  } catch (error) {
    console.error('Service token verification error:', error);
    res.status(500).json({
      error: 'Service authentication failed',
      message: error.message
    });
  }
};

// Optional authentication (for public endpoints)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (jwtError) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  verifyToken,
  verifyWithAuthService,
  checkSubscription,
  checkPlatformLimits,
  checkAccountOwnership,
  checkContentOwnership,
  verifyServiceToken,
  optionalAuth
};
