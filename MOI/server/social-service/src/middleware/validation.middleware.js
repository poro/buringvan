const { body, param, query } = require('express-validator');

const validatePlatform = param('platform')
  .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
  .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube');

const validateAuthUrl = [
  validatePlatform,
  body('redirectUri')
    .isURL()
    .withMessage('Redirect URI must be a valid URL')
    .isLength({ max: 2000 })
    .withMessage('Redirect URI too long')
];

const validateCallback = [
  validatePlatform,
  body('code')
    .notEmpty()
    .withMessage('Authorization code is required')
    .isLength({ max: 1000 })
    .withMessage('Authorization code too long'),
  body('state')
    .notEmpty()
    .withMessage('State parameter is required')
    .isLength({ max: 100 })
    .withMessage('State parameter too long'),
  body('redirectUri')
    .isURL()
    .withMessage('Redirect URI must be a valid URL')
];

const validatePostContent = [
  body('contentData')
    .isObject()
    .withMessage('Content data must be an object'),
  body('contentData.contentId')
    .optional()
    .isMongoId()
    .withMessage('Content ID must be a valid MongoDB ObjectId'),
  body('contentData.text')
    .optional()
    .isString()
    .withMessage('Text must be a string')
    .isLength({ max: 10000 })
    .withMessage('Text too long (max 10000 characters)'),
  body('contentData.media')
    .optional()
    .isArray()
    .withMessage('Media must be an array'),
  body('contentData.media.*.type')
    .optional()
    .isIn(['image', 'video', 'gif'])
    .withMessage('Media type must be image, video, or gif'),
  body('contentData.media.*.url')
    .optional()
    .isURL()
    .withMessage('Media URL must be valid'),
  body('contentData.scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('contentData.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('platformIds')
    .optional()
    .isArray()
    .withMessage('Platform IDs must be an array'),
  body('platformIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each platform ID must be a valid MongoDB ObjectId')
];

const validateAccountSettings = [
  param('accountId')
    .isMongoId()
    .withMessage('Account ID must be a valid MongoDB ObjectId'),
  body('settings')
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.autoPost')
    .optional()
    .isBoolean()
    .withMessage('Auto post setting must be boolean'),
  body('settings.postTiming')
    .optional()
    .isObject()
    .withMessage('Post timing must be an object'),
  body('settings.postTiming.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('settings.postTiming.preferredTimes')
    .optional()
    .isArray()
    .withMessage('Preferred times must be an array'),
  body('settings.postTiming.preferredTimes.*.day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Day must be a valid weekday'),
  body('settings.postTiming.preferredTimes.*.time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  body('settings.contentFilters')
    .optional()
    .isObject()
    .withMessage('Content filters must be an object'),
  body('settings.contentFilters.hashtags')
    .optional()
    .isObject()
    .withMessage('Hashtag filters must be an object'),
  body('settings.contentFilters.hashtags.required')
    .optional()
    .isArray()
    .withMessage('Required hashtags must be an array'),
  body('settings.contentFilters.hashtags.forbidden')
    .optional()
    .isArray()
    .withMessage('Forbidden hashtags must be an array'),
  body('settings.contentFilters.contentTypes')
    .optional()
    .isArray()
    .withMessage('Content types must be an array'),
  body('settings.contentFilters.contentTypes.*')
    .optional()
    .isIn(['text', 'image', 'video', 'carousel', 'story'])
    .withMessage('Content type must be text, image, video, carousel, or story'),
  body('settings.contentFilters.autoHashtags')
    .optional()
    .isBoolean()
    .withMessage('Auto hashtags setting must be boolean')
];

const validateAccountId = param('accountId')
  .isMongoId()
  .withMessage('Account ID must be a valid MongoDB ObjectId');

const validatePostedContentId = param('postedContentId')
  .isMongoId()
  .withMessage('Posted content ID must be a valid MongoDB ObjectId');

const validateAnalyticsQuery = [
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const validatePostedContentQuery = [
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube'),
  query('status')
    .optional()
    .isIn(['posting', 'posted', 'failed', 'deleted'])
    .withMessage('Status must be posting, posted, failed, or deleted'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateMediaUpload = [
  body('type')
    .isIn(['image', 'video', 'gif'])
    .withMessage('Media type must be image, video, or gif'),
  body('url')
    .isURL()
    .withMessage('Media URL must be valid'),
  body('filename')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Filename must be a string with max 255 characters'),
  body('size')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Size must be a positive integer'),
  body('duration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration must be a positive number'),
  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Dimensions must be an object'),
  body('dimensions.width')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Width must be a positive integer'),
  body('dimensions.height')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Height must be a positive integer')
];

const validateBulkOperation = [
  body('accountIds')
    .isArray({ min: 1 })
    .withMessage('Account IDs must be a non-empty array'),
  body('accountIds.*')
    .isMongoId()
    .withMessage('Each account ID must be a valid MongoDB ObjectId'),
  body('operation')
    .isIn(['sync', 'validate', 'refresh'])
    .withMessage('Operation must be sync, validate, or refresh')
];

const validateWebhook = [
  body('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube'),
  body('event')
    .isString()
    .withMessage('Event must be a string'),
  body('data')
    .isObject()
    .withMessage('Data must be an object')
];

// Custom validation function for file uploads
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      error: 'No file uploaded'
    });
  }

  const file = req.file || req.files[0];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      allowed: allowedTypes
    });
  }

  if (file.size > maxSize) {
    return res.status(400).json({
      error: 'File too large',
      maxSize: '100MB'
    });
  }

  next();
};

// Rate limiting validation
const validateRateLimit = (req, res, next) => {
  const userPlan = req.user?.subscription?.plan || 'free';
  const rateLimits = {
    free: { posts: 10, requests: 100 },
    basic: { posts: 50, requests: 500 },
    premium: { posts: 200, requests: 2000 },
    enterprise: { posts: 1000, requests: 10000 }
  };

  const limit = rateLimits[userPlan];
  if (!limit) {
    return res.status(400).json({
      error: 'Invalid subscription plan'
    });
  }

  // This would typically check against a rate limiting store (Redis)
  // For now, just pass through
  req.rateLimit = limit;
  next();
};

module.exports = {
  validateAuthUrl,
  validateCallback,
  validatePostContent,
  validateAccountSettings,
  validateAccountId,
  validatePostedContentId,
  validateAnalyticsQuery,
  validatePostedContentQuery,
  validateMediaUpload,
  validateBulkOperation,
  validateWebhook,
  validateFileUpload,
  validateRateLimit,
  validatePlatform
};
