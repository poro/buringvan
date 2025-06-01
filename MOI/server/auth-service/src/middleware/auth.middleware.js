const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Test user for development mode
const DEV_USER = {
  id: 'dev-user-id',
  email: 'dev@example.com',
  firstName: 'Dev',
  lastName: 'User',
  role: 'admin',
  isActive: true,
  isEmailVerified: true,
  subscription: {
    status: 'active',
    plan: 'premium'
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    req.user = DEV_USER;
    return next();
  }

  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token (support both 'id' and 'userId' for compatibility)
    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Middleware to check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Please verify your email address to access this resource.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  next();
};

// Middleware to check subscription status
const requireActiveSubscription = (req, res, next) => {
  if (req.user.subscription.status !== 'active') {
    return res.status(403).json({
      status: 'error',
      message: 'Active subscription required to access this resource.',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }
  next();
};

// Middleware to check subscription plan
const requireSubscriptionPlan = (...plans) => {
  return (req, res, next) => {
    if (!plans.includes(req.user.subscription.plan)) {
      return res.status(403).json({
        status: 'error',
        message: `This feature requires a ${plans.join(' or ')} subscription plan.`,
        code: 'UPGRADE_REQUIRED',
        requiredPlans: plans,
        currentPlan: req.user.subscription.plan
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireEmailVerification,
  requireActiveSubscription,
  requireSubscriptionPlan
};
