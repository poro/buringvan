const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, checkSubscription, checkUsageLimits } = require('../middleware/auth.middleware');
const {
  validateMetric,
  validateBatchMetrics,
  validatePlatform,
  validateContentId,
  validateCampaignId,
  validateDateRange,
  validatePagination,
  validateContentComparison,
  validateQueryFilters
} = require('../middleware/validation.middleware');

// Metrics endpoints
router.post('/metrics',
  authenticate,
  validateMetric,
  checkUsageLimits('metrics'),
  analyticsController.recordMetric
);

router.post('/metrics/batch',
  authenticate,
  validateBatchMetrics,
  checkUsageLimits('metrics'),
  analyticsController.batchRecordMetrics
);

// Overview and dashboard
router.get('/overview',
  authenticate,
  validateQueryFilters,
  analyticsController.getOverview
);

// Platform analytics
router.get('/platforms/:platform',
  authenticate,
  validatePlatform,
  validateDateRange,
  analyticsController.getPlatformAnalytics
);

// Content analytics
router.get('/content/:contentId',
  authenticate,
  validateContentId,
  validateQueryFilters,
  analyticsController.getContentAnalytics
);

// Campaign analytics
router.get('/campaigns/:campaignId',
  authenticate,
  validateCampaignId,
  analyticsController.getCampaignAnalytics
);

// Engagement metrics
router.get('/engagement',
  authenticate,
  validateDateRange,
  validateQueryFilters,
  analyticsController.getEngagementRate
);

// Top performing content
router.get('/top-content',
  authenticate,
  validateQueryFilters,
  analyticsController.getTopContent
);

// Audience insights
router.get('/insights',
  authenticate,
  checkSubscription('pro'),
  validateQueryFilters,
  analyticsController.getAudienceInsights
);

// Content comparison
router.post('/compare',
  authenticate,
  checkSubscription('pro'),
  validateContentComparison,
  analyticsController.compareContent
);

module.exports = router;
