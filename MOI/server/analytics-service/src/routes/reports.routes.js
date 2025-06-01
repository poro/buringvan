const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, checkSubscription, checkUsageLimits, requireAdmin } = require('../middleware/auth.middleware');
const {
  validateCreateReport,
  validateReportId,
  validateShareReport,
  validatePagination,
  validateQueryFilters
} = require('../middleware/validation.middleware');

// Create report
router.post('/',
  authenticate,
  checkSubscription('basic'),
  validateCreateReport,
  checkUsageLimits('reports'),
  analyticsController.createReport
);

// Get user's reports
router.get('/',
  authenticate,
  validatePagination,
  validateQueryFilters,
  analyticsController.getReports
);

// Get specific report
router.get('/:reportId',
  authenticate,
  validateReportId,
  analyticsController.getReport
);

// Generate report
router.post('/:reportId/generate',
  authenticate,
  validateReportId,
  analyticsController.generateReport
);

// Get report generation status
router.get('/:reportId/status',
  authenticate,
  validateReportId,
  analyticsController.getReportStatus
);

// Download report
router.get('/:reportId/download',
  authenticate,
  validateReportId,
  analyticsController.downloadReport
);

// Share report
router.post('/:reportId/share',
  authenticate,
  validateReportId,
  validateShareReport,
  checkSubscription('pro'),
  analyticsController.shareReport
);

// Delete report
router.delete('/:reportId',
  authenticate,
  validateReportId,
  analyticsController.deleteReport
);

module.exports = router;
