const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Notification creation validation
const validateCreateNotification = [
  body('userId')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),
  
  body('type')
    .isIn([
      'content_approved',
      'content_rejected',
      'content_published',
      'content_failed',
      'campaign_completed',
      'campaign_started',
      'analytics_report',
      'account_connected',
      'account_disconnected',
      'subscription_updated',
      'subscription_expired',
      'quota_warning',
      'quota_exceeded',
      'system_announcement',
      'security_alert'
    ])
    .withMessage('Invalid notification type'),
  
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
  
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array')
    .custom((channels) => {
      const validChannels = ['in_app', 'email', 'push', 'sms'];
      return channels.every(channel => validChannels.includes(channel));
    })
    .withMessage('Invalid channel specified'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be low, normal, high, or urgent'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Test notification validation
const validateTestNotification = [
  body('type')
    .optional()
    .isIn([
      'content_approved',
      'content_rejected',
      'content_published',
      'content_failed',
      'campaign_completed',
      'campaign_started',
      'analytics_report',
      'account_connected',
      'account_disconnected',
      'subscription_updated',
      'subscription_expired',
      'quota_warning',
      'quota_exceeded',
      'system_announcement',
      'security_alert'
    ])
    .withMessage('Invalid notification type'),
  
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array')
    .custom((channels) => {
      const validChannels = ['in_app', 'email', 'push', 'sms'];
      return channels.every(channel => validChannels.includes(channel));
    })
    .withMessage('Invalid channel specified'),
  
  handleValidationErrors
];

// Device token registration validation
const validateDeviceToken = [
  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Device ID must be between 1 and 100 characters'),
  
  body('token')
    .notEmpty()
    .withMessage('Device token is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Device token must be between 10 and 500 characters'),
  
  body('platform')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
  
  handleValidationErrors
];

// Notification preferences validation
const validatePreferences = [
  body('email')
    .optional()
    .isBoolean()
    .withMessage('Email preference must be a boolean'),
  
  body('push')
    .optional()
    .isBoolean()
    .withMessage('Push preference must be a boolean'),
  
  body('sms')
    .optional()
    .isBoolean()
    .withMessage('SMS preference must be a boolean'),
  
  body('inApp')
    .optional()
    .isBoolean()
    .withMessage('In-app preference must be a boolean'),
  
  handleValidationErrors
];

// Bulk notifications validation
const validateBulkNotifications = [
  body('notifications')
    .isArray({ min: 1, max: 100 })
    .withMessage('Notifications must be an array with 1-100 items'),
  
  body('notifications.*.userId')
    .isMongoId()
    .withMessage('Each notification must have a valid user ID'),
  
  body('notifications.*.type')
    .isIn([
      'content_approved',
      'content_rejected',
      'content_published',
      'content_failed',
      'campaign_completed',
      'campaign_started',
      'analytics_report',
      'account_connected',
      'account_disconnected',
      'subscription_updated',
      'subscription_expired',
      'quota_warning',
      'quota_exceeded',
      'system_announcement',
      'security_alert'
    ])
    .withMessage('Each notification must have a valid type'),
  
  body('notifications.*.data')
    .optional()
    .isObject()
    .withMessage('Notification data must be an object'),
  
  body('notifications.*.channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array'),
  
  handleValidationErrors
];

// Topic subscription validation
const validateTopicSubscription = [
  body('topic')
    .notEmpty()
    .withMessage('Topic is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Topic must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Topic can only contain letters, numbers, underscores, and hyphens'),
  
  body('deviceTokens')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Device tokens must be an array with 1-1000 items'),
  
  body('deviceTokens.*')
    .notEmpty()
    .withMessage('Each device token must not be empty')
    .isLength({ min: 10, max: 500 })
    .withMessage('Each device token must be between 10 and 500 characters'),
  
  handleValidationErrors
];

// Topic notification validation
const validateTopicNotification = [
  body('topic')
    .notEmpty()
    .withMessage('Topic is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Topic must be between 1 and 100 characters'),
  
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  
  body('body')
    .notEmpty()
    .withMessage('Body is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Body must be between 1 and 200 characters'),
  
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
  
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  
  handleValidationErrors
];

// Parameter validation
const validateNotificationId = [
  param('notificationId')
    .isMongoId()
    .withMessage('Notification ID must be a valid MongoDB ObjectId'),
  
  handleValidationErrors
];

const validateDeviceId = [
  param('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Device ID must be between 1 and 100 characters'),
  
  handleValidationErrors
];

// Query validation
const validateNotificationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('UnreadOnly must be a boolean'),
  
  query('type')
    .optional()
    .isIn([
      'content_approved',
      'content_rejected',
      'content_published',
      'content_failed',
      'campaign_completed',
      'campaign_started',
      'analytics_report',
      'account_connected',
      'account_disconnected',
      'subscription_updated',
      'subscription_expired',
      'quota_warning',
      'quota_exceeded',
      'system_announcement',
      'security_alert'
    ])
    .withMessage('Invalid notification type'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  handleValidationErrors
];

const validateStatsQuery = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  
  handleValidationErrors
];

// SMS webhook validation
const validateSmsWebhook = [
  body('MessageSid')
    .notEmpty()
    .withMessage('MessageSid is required'),
  
  body('MessageStatus')
    .notEmpty()
    .withMessage('MessageStatus is required'),
  
  body('To')
    .notEmpty()
    .withMessage('To is required'),
  
  body('From')
    .notEmpty()
    .withMessage('From is required'),
  
  handleValidationErrors
];

// Email unsubscribe validation
const validateEmailUnsubscribe = [
  query('token')
    .notEmpty()
    .withMessage('Unsubscribe token is required')
    .isBase64()
    .withMessage('Invalid unsubscribe token format'),
  
  handleValidationErrors
];

module.exports = {
  validateCreateNotification,
  validateTestNotification,
  validateDeviceToken,
  validatePreferences,
  validateBulkNotifications,
  validateTopicSubscription,
  validateTopicNotification,
  validateNotificationId,
  validateDeviceId,
  validateNotificationQuery,
  validateStatsQuery,
  validateSmsWebhook,
  validateEmailUnsubscribe,
  handleValidationErrors
};
