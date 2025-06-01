const { body, param, query } = require('express-validator');

// Metric validation
const validateMetric = [
  body('contentId')
    .optional()
    .isMongoId()
    .withMessage('Content ID must be a valid MongoDB ObjectId'),
  
  body('campaignId')
    .optional()
    .isMongoId()
    .withMessage('Campaign ID must be a valid MongoDB ObjectId'),
  
  body('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube'),
  
  body('postId')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Post ID must be a string between 1 and 100 characters'),
  
  body('metricType')
    .isIn([
      'impressions',
      'reach',
      'engagement',
      'likes',
      'comments',
      'shares',
      'saves',
      'clicks',
      'views',
      'followers_gained',
      'followers_lost',
      'profile_visits'
    ])
    .withMessage('Invalid metric type'),
  
  body('value')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Value must be a non-negative number'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Batch metrics validation
const validateBatchMetrics = [
  body('metrics')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Metrics must be an array with 1-1000 items'),
  
  body('metrics.*.platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Each metric platform must be valid'),
  
  body('metrics.*.metricType')
    .isIn([
      'impressions',
      'reach',
      'engagement',
      'likes',
      'comments',
      'shares',
      'saves',
      'clicks',
      'views',
      'followers_gained',
      'followers_lost',
      'profile_visits'
    ])
    .withMessage('Each metric type must be valid'),
  
  body('metrics.*.value')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Each metric value must be a non-negative number'),
  
  body('metrics.*.contentId')
    .optional()
    .isMongoId()
    .withMessage('Each content ID must be a valid MongoDB ObjectId'),
  
  body('metrics.*.campaignId')
    .optional()
    .isMongoId()
    .withMessage('Each campaign ID must be a valid MongoDB ObjectId')
];

// Platform validation
const validatePlatform = [
  param('platform')
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be one of: linkedin, twitter, instagram, tiktok, youtube')
];

// Content ID validation
const validateContentId = [
  param('contentId')
    .isMongoId()
    .withMessage('Content ID must be a valid MongoDB ObjectId')
];

// Campaign ID validation
const validateCampaignId = [
  param('campaignId')
    .isMongoId()
    .withMessage('Campaign ID must be a valid MongoDB ObjectId')
];

// Date range validation
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Content comparison validation
const validateContentComparison = [
  body('contentIds')
    .isArray({ min: 2, max: 10 })
    .withMessage('Content IDs must be an array with 2-10 items'),
  
  body('contentIds.*')
    .isMongoId()
    .withMessage('Each content ID must be a valid MongoDB ObjectId'),
  
  body('metricTypes')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage('Metric types must be an array with 1-10 items'),
  
  body('metricTypes.*')
    .optional()
    .isIn([
      'impressions',
      'reach',
      'engagement',
      'likes',
      'comments',
      'shares',
      'saves',
      'clicks',
      'views',
      'followers_gained',
      'followers_lost',
      'profile_visits'
    ])
    .withMessage('Each metric type must be valid')
];

// Report creation validation
const validateCreateReport = [
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .trim()
    .withMessage('Description must be less than 1000 characters'),
  
  body('type')
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'custom', 'campaign'])
    .withMessage('Type must be one of: daily, weekly, monthly, quarterly, custom, campaign'),
  
  body('format')
    .optional()
    .isIn(['pdf', 'excel', 'csv', 'json'])
    .withMessage('Format must be one of: pdf, excel, csv, json'),
  
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('Is recurring must be a boolean'),
  
  body('recurringPattern.frequency')
    .if(body('isRecurring').equals(true))
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Frequency must be one of: daily, weekly, monthly'),
  
  body('recurringPattern.interval')
    .if(body('isRecurring').equals(true))
    .isInt({ min: 1, max: 30 })
    .withMessage('Interval must be between 1 and 30'),
  
  body('filters.platforms')
    .optional()
    .isArray()
    .withMessage('Platforms filter must be an array'),
  
  body('filters.platforms.*')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Each platform must be valid'),
  
  body('filters.metricTypes')
    .optional()
    .isArray()
    .withMessage('Metric types filter must be an array'),
  
  body('filters.metricTypes.*')
    .optional()
    .isIn([
      'impressions',
      'reach',
      'engagement',
      'likes',
      'comments',
      'shares',
      'saves',
      'clicks',
      'views',
      'followers_gained',
      'followers_lost',
      'profile_visits'
    ])
    .withMessage('Each metric type must be valid'),
  
  body('filters.dateRange.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('filters.dateRange.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  body('filters.campaigns')
    .optional()
    .isArray()
    .withMessage('Campaigns filter must be an array'),
  
  body('filters.campaigns.*')
    .optional()
    .isMongoId()
    .withMessage('Each campaign ID must be a valid MongoDB ObjectId'),
  
  body('template.includeSummary')
    .optional()
    .isBoolean()
    .withMessage('Include summary must be a boolean'),
  
  body('template.includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be a boolean'),
  
  body('template.includeComparisons')
    .optional()
    .isBoolean()
    .withMessage('Include comparisons must be a boolean'),
  
  body('template.sections')
    .optional()
    .isArray()
    .withMessage('Sections must be an array'),
  
  body('template.sections.*')
    .optional()
    .isIn([
      'overview',
      'platform_performance',
      'content_performance',
      'engagement_analysis',
      'audience_insights',
      'growth_metrics',
      'recommendations'
    ])
    .withMessage('Each section must be valid')
];

// Report ID validation
const validateReportId = [
  param('reportId')
    .isMongoId()
    .withMessage('Report ID must be a valid MongoDB ObjectId')
];

// Share report validation
const validateShareReport = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email must be valid'),
  
  body('accessLevel')
    .optional()
    .isIn(['view', 'download'])
    .withMessage('Access level must be either view or download')
];

// Query filters validation
const validateQueryFilters = [
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'])
    .withMessage('Platform must be valid'),
  
  query('metricType')
    .optional()
    .isIn([
      'impressions',
      'reach',
      'engagement',
      'likes',
      'comments',
      'shares',
      'saves',
      'clicks',
      'views',
      'followers_gained',
      'followers_lost',
      'profile_visits'
    ])
    .withMessage('Metric type must be valid'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  
  query('detailed')
    .optional()
    .isBoolean()
    .withMessage('Detailed must be a boolean'),
  
  query('type')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'custom', 'campaign'])
    .withMessage('Type must be valid')
];

module.exports = {
  validateMetric,
  validateBatchMetrics,
  validatePlatform,
  validateContentId,
  validateCampaignId,
  validateDateRange,
  validatePagination,
  validateContentComparison,
  validateCreateReport,
  validateReportId,
  validateShareReport,
  validateQueryFilters
};
