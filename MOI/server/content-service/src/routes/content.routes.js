const express = require('express');
const router = express.Router();

const contentController = require('../controllers/content.controller');
const { authenticate, authorize, requireEmailVerification } = require('../middleware/auth.middleware');
const {
  validateCreateContent,
  validateUpdateContent,
  validateContentAction,
  validateApproveContent,
  validateRejectContent,
  validateScheduleContent,
  validateContentQuery,
  validateAnalyticsQuery,
  handleValidationErrors
} = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// Content routes
router.post('/',
  requireEmailVerification,
  validateCreateContent,
  handleValidationErrors,
  contentController.createContent
);

router.get('/',
  validateContentQuery,
  handleValidationErrors,
  contentController.getUserContent
);

router.get('/scheduled',
  authorize('admin'),
  contentController.getScheduledContent
);

router.get('/analytics',
  validateAnalyticsQuery,
  handleValidationErrors,
  contentController.getContentAnalytics
);

router.get('/status/:status',
  validateContentAction,
  handleValidationErrors,
  contentController.getContentByStatus
);

router.get('/platform/:platform',
  validateContentAction,
  handleValidationErrors,
  contentController.getContentByPlatform
);

router.get('/:contentId',
  validateContentAction,
  handleValidationErrors,
  contentController.getContent
);

router.put('/:contentId',
  requireEmailVerification,
  validateUpdateContent,
  handleValidationErrors,
  contentController.updateContent
);

router.post('/:contentId/approve',
  requireEmailVerification,
  validateApproveContent,
  handleValidationErrors,
  contentController.approveContent
);

router.post('/:contentId/reject',
  requireEmailVerification,
  validateRejectContent,
  handleValidationErrors,
  contentController.rejectContent
);

router.post('/:contentId/schedule',
  requireEmailVerification,
  validateScheduleContent,
  handleValidationErrors,
  contentController.scheduleContent
);

router.post('/:contentId/duplicate',
  requireEmailVerification,
  validateContentAction,
  handleValidationErrors,
  contentController.duplicateContent
);

router.post('/:contentId/archive',
  validateContentAction,
  handleValidationErrors,
  contentController.archiveContent
);

router.delete('/:contentId',
  validateContentAction,
  handleValidationErrors,
  contentController.deleteContent
);

// Analytics update route (for social service to update metrics)
router.put('/:contentId/analytics',
  authorize('system'), // Only system/internal services can update analytics
  contentController.updateContentAnalytics
);

module.exports = router;
