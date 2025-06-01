const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateProfileUpdate,
  validateSocialAccount,
  validateEmailVerification,
  handleValidationErrors
} = require('../middleware/validation.middleware');

// Public routes
router.post('/register', 
  validateRegister, 
  handleValidationErrors, 
  authController.register
);

router.post('/login', 
  validateLogin, 
  handleValidationErrors, 
  authController.login
);

router.post('/refresh', authController.refreshToken);

router.post('/password-reset-request', 
  validatePasswordResetRequest, 
  handleValidationErrors, 
  authController.requestPasswordReset
);

router.post('/password-reset', 
  validatePasswordReset, 
  handleValidationErrors, 
  authController.resetPassword
);

router.get('/verify-email/:token', 
  validateEmailVerification, 
  handleValidationErrors, 
  authController.verifyEmail
);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login?error=google_auth_failed' 
  }),
  authController.googleCallback
);

// Protected routes (require authentication)
router.use(authenticate);

router.post('/logout', authController.logout);

router.get('/me', authController.getProfile);

router.get('/profile', authController.getProfile);

router.put('/profile', 
  validateProfileUpdate, 
  handleValidationErrors, 
  authController.updateProfile
);

router.post('/change-password', 
  validatePasswordChange, 
  handleValidationErrors, 
  authController.changePassword
);

router.get('/check-auth', authController.checkAuth);

router.post('/refresh-token', authController.refreshToken);

router.post('/social-accounts', 
  validateSocialAccount, 
  handleValidationErrors, 
  authController.addSocialAccount
);

router.delete('/social-accounts/:platform/:accountId', 
  authController.removeSocialAccount
);

router.post('/deactivate-account', authController.deactivateAccount);

// Admin only routes
router.get('/admin/users', 
  authorize('admin'), 
  async (req, res) => {
    try {
      // This would be implemented in a separate admin controller
      res.status(200).json({
        status: 'success',
        message: 'Admin endpoint - List users'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

module.exports = router;
