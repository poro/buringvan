const { body, param, query } = require('express-validator');

// Validation rules for user registration
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces')
];

// Validation rules for user login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Validation rules for password reset request
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

// Validation rules for password reset
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Validation rules for profile update
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('preferences.themes')
    .optional()
    .isArray()
    .withMessage('Themes must be an array'),
  
  body('preferences.platforms')
    .optional()
    .isArray()
    .withMessage('Platforms must be an array')
    .custom((platforms) => {
      const validPlatforms = ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'];
      const invalidPlatforms = platforms.filter(platform => !validPlatforms.includes(platform));
      if (invalidPlatforms.length > 0) {
        throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
      }
      return true;
    }),
  
  body('preferences.contentStyle')
    .optional()
    .isIn(['professional', 'casual', 'creative', 'educational'])
    .withMessage('Content style must be one of: professional, casual, creative, educational'),
  
  body('preferences.postFrequency')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Post frequency must be between 1 and 10'),
  
  body('preferences.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),
  
  body('preferences.autoApprove')
    .optional()
    .isBoolean()
    .withMessage('Auto approve must be a boolean'),
  
  body('preferences.notificationPreferences.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be a boolean'),
  
  body('preferences.notificationPreferences.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be a boolean'),
  
  body('preferences.notificationPreferences.inApp')
    .optional()
    .isBoolean()
    .withMessage('In-app notification preference must be a boolean')
];

// Validation rules for social account addition
const validateSocialAccount = [
  body('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube'),
  
  body('accountId')
    .notEmpty()
    .withMessage('Account ID is required'),
  
  body('accessToken')
    .notEmpty()
    .withMessage('Access token is required'),
  
  body('username')
    .optional()
    .isString()
    .withMessage('Username must be a string')
];

// Validation rules for email verification
const validateEmailVerification = [
  param('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid verification token format')
];

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateProfileUpdate,
  validateSocialAccount,
  validateEmailVerification,
  handleValidationErrors
};
