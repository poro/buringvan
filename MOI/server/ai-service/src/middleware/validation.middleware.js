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

// Content generation validation
const validateGenerateContent = [
  body('topic')
    .notEmpty()
    .withMessage('Topic is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic must be between 1 and 200 characters'),
    
  body('platform')
    .notEmpty()
    .withMessage('Platform is required')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform'),
    
  body('contentType')
    .notEmpty()
    .withMessage('Content type is required')
    .isIn(['text', 'image', 'video', 'carousel', 'story'])
    .withMessage('Invalid content type'),
    
  body('tone')
    .optional()
    .isIn(['professional', 'casual', 'humorous', 'inspirational', 'educational', 'promotional'])
    .withMessage('Invalid tone'),
    
  body('style')
    .optional()
    .isIn(['formal', 'informal', 'conversational', 'storytelling', 'listicle', 'question'])
    .withMessage('Invalid style'),
    
  body('targetAudience')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Target audience must be less than 200 characters'),
    
  body('keyPoints')
    .optional()
    .isArray()
    .withMessage('Key points must be an array'),
    
  body('keyPoints.*')
    .optional()
    .isString()
    .withMessage('Each key point must be a string'),
    
  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array'),
    
  body('hashtags.*')
    .optional()
    .isString()
    .withMessage('Each hashtag must be a string'),
    
  body('campaignId')
    .optional()
    .isMongoId()
    .withMessage('Invalid campaign ID'),
    
  body('variations')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Variations must be between 1 and 5')
];

// Content improvement validation
const validateImproveContent = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('feedback')
    .notEmpty()
    .withMessage('Feedback is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Feedback must be between 1 and 1000 characters'),
    
  body('suggestions')
    .optional()
    .isArray()
    .withMessage('Suggestions must be an array'),
    
  body('suggestions.*')
    .optional()
    .isString()
    .withMessage('Each suggestion must be a string')
];

// Content optimization validation
const validateOptimizeContent = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('targetPlatform')
    .notEmpty()
    .withMessage('Target platform is required')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid target platform')
];

// Hashtag generation validation
const validateGenerateHashtags = [
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters'),
    
  body('platform')
    .notEmpty()
    .withMessage('Platform is required')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform'),
    
  body('count')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Count must be between 1 and 30')
];

// Performance analysis validation
const validateAnalyzePerformance = [
  body('contentIds')
    .isArray({ min: 1 })
    .withMessage('At least one content ID is required'),
    
  body('contentIds.*')
    .isMongoId()
    .withMessage('Each content ID must be valid'),
    
  body('timeframe')
    .optional()
    .isIn(['7d', '30d', '90d', '6m', '1y'])
    .withMessage('Invalid timeframe')
];

// Content variations validation
const validateGenerateVariations = [
  param('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('count')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Count must be between 1 and 5'),
    
  body('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform')
];

// Training feedback validation
const validateTrainFeedback = [
  body('contentId')
    .isMongoId()
    .withMessage('Invalid content ID'),
    
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Feedback must be less than 1000 characters'),
    
  body('performanceData')
    .optional()
    .isObject()
    .withMessage('Performance data must be an object')
];

// Query validation
const validateAIQuery = [
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Invalid platform'),
    
  query('contentType')
    .optional()
    .isIn(['text', 'image', 'video', 'carousel', 'story'])
    .withMessage('Invalid content type'),
    
  query('campaignId')
    .optional()
    .isMongoId()
    .withMessage('Invalid campaign ID'),
    
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '6m', '1y'])
    .withMessage('Invalid period')
];

module.exports = {
  handleValidationErrors,
  validateGenerateContent,
  validateImproveContent,
  validateOptimizeContent,
  validateGenerateHashtags,
  validateAnalyzePerformance,
  validateGenerateVariations,
  validateTrainFeedback,
  validateAIQuery
};
