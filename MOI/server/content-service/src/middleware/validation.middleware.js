const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
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

// Content validation rules
const validateCreateContent = [
  body('content.text')
    .notEmpty()
    .withMessage('Content text is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content text must be between 1 and 5000 characters'),
    
  body('platforms')
    .isArray({ min: 1 })
    .withMessage('At least one platform is required')
    .custom((platforms) => {
      const validPlatforms = ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'];
      const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
      if (invalidPlatforms.length > 0) {
        throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
      }
      return true;
    }),
    
  body('type')
    .isIn(['text', 'image', 'video', 'carousel', 'story'])
    .withMessage('Invalid content type'),
    
  body('aiGenerated')
    .optional()
    .isBoolean()
    .withMessage('aiGenerated must be a boolean'),
    
  body('campaignId')
    .optional()
    .isMongoId()
    .withMessage('Invalid campaign ID'),
    
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('scheduledFor must be a valid ISO date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('scheduledFor must be in the future');
      }
      return true;
    }),
    
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array'),
    
  body('media.*.url')
    .optional()
    .isURL()
    .withMessage('Media URL must be valid'),
    
  body('media.*.type')
    .optional()
    .isIn(['image', 'video', 'gif'])
    .withMessage('Invalid media type')
];

const validateUpdateContent = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('content.text')
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content text must be between 1 and 5000 characters'),
    
  body('platforms')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one platform is required if provided')
    .custom((platforms) => {
      const validPlatforms = ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'];
      const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
      if (invalidPlatforms.length > 0) {
        throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
      }
      return true;
    }),
    
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'carousel', 'story'])
    .withMessage('Invalid content type')
];

const validateContentAction = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID')
];

const validateApproveContent = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comments must be less than 1000 characters')
];

const validateRejectContent = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 1000 })
    .withMessage('Reason must be less than 1000 characters')
];

const validateScheduleContent = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('scheduledFor')
    .notEmpty()
    .withMessage('Scheduled time is required')
    .isISO8601()
    .withMessage('scheduledFor must be a valid ISO date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('scheduledFor must be in the future');
      }
      return true;
    }),
    
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string')
];

// Campaign validation rules
const validateCreateCampaign = [
  body('name')
    .notEmpty()
    .withMessage('Campaign name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Campaign name must be between 1 and 100 characters'),
    
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
    
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
    
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
    
  body('platforms')
    .isArray({ min: 1 })
    .withMessage('At least one platform is required')
    .custom((platforms) => {
      const validPlatforms = ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'];
      const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
      if (invalidPlatforms.length > 0) {
        throw new Error(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
      }
      return true;
    }),
    
  body('theme')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Theme must be less than 100 characters'),
    
  body('objectives')
    .optional()
    .isArray()
    .withMessage('Objectives must be an array'),
    
  body('objectives.*')
    .optional()
    .isString()
    .withMessage('Each objective must be a string'),
    
  body('contentGuidelines.tone')
    .optional()
    .isString()
    .withMessage('Tone must be a string'),
    
  body('contentGuidelines.style')
    .optional()
    .isString()
    .withMessage('Style must be a string'),
    
  body('contentGuidelines.keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
    
  body('contentGuidelines.keywords.*')
    .optional()
    .isString()
    .withMessage('Each keyword must be a string')
];

const validateUpdateCampaign = [
  param('campaignId')
    .isMongoId()
    .withMessage('Invalid campaign ID'),
    
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Campaign name must be between 1 and 100 characters'),
    
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
    
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const validateCampaignAction = [
  param('campaignId')
    .isMongoId()
    .withMessage('Invalid campaign ID')
];

// Query validation
const validateContentQuery = [
  query('status')
    .optional()
    .isIn(['draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed', 'archived'])
    .withMessage('Invalid status'),
    
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform'),
    
  query('type')
    .optional()
    .isIn(['text', 'image', 'video', 'carousel', 'story'])
    .withMessage('Invalid content type'),
    
  query('aiGenerated')
    .optional()
    .isBoolean()
    .withMessage('aiGenerated must be a boolean'),
    
  query('campaignId')
    .optional()
    .isMongoId()
    .withMessage('Invalid campaign ID'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publishedAt', 'scheduledFor'])
    .withMessage('Invalid sortBy field'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc')
];

const validateCampaignQuery = [
  query('status')
    .optional()
    .isIn(['draft', 'active', 'paused', 'completed'])
    .withMessage('Invalid status'),
    
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateAnalyticsQuery = [
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO date'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('endDate must be after startDate');
      }
      return true;
    }),
    
  query('campaignId')
    .optional()
    .isMongoId()
    .withMessage('Invalid campaign ID')
];

module.exports = {
  handleValidationErrors,
  
  // Content validations
  validateCreateContent,
  validateUpdateContent,
  validateContentAction,
  validateApproveContent,
  validateRejectContent,
  validateScheduleContent,
  validateContentQuery,
  
  // Campaign validations
  validateCreateCampaign,
  validateUpdateCampaign,
  validateCampaignAction,
  validateCampaignQuery,
  
  // Analytics validations
  validateAnalyticsQuery
};
