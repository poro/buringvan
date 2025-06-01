const jwt = require('jsonwebtoken');
const axios = require('axios');

// Authentication middleware - verify JWT token and get user from auth service
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from auth service
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      const response = await axios.get(`${authServiceUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      req.user = response.data.data.user;
      next();
    } catch (authError) {
      if (authError.response && authError.response.status === 401) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }
      
      throw authError;
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication error'
    });
  }
};

// Authorization middleware - check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Middleware to check email verification status
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
  if (!req.user.subscription || req.user.subscription.status !== 'active') {
    return res.status(403).json({
      status: 'error',
      message: 'Active subscription required to access this resource.',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }
  next();
};

// Middleware to check subscription plan for AI features
const requireSubscriptionPlan = (...plans) => {
  return (req, res, next) => {
    if (!req.user.subscription || !plans.includes(req.user.subscription.plan)) {
      return res.status(403).json({
        status: 'error',
        message: `This AI feature requires a ${plans.join(' or ')} subscription plan.`,
        code: 'UPGRADE_REQUIRED',
        requiredPlans: plans,
        currentPlan: req.user.subscription ? req.user.subscription.plan : 'none'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireEmailVerification,
  requireActiveSubscription,
  requireSubscriptionPlan
};
