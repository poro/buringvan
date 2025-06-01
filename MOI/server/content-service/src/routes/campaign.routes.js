const express = require('express');
const router = express.Router();

const campaignController = require('../controllers/campaign.controller');
const { authenticate, authorize, requireEmailVerification } = require('../middleware/auth.middleware');
const {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateCampaignAction,
  validateCampaignQuery,
  validateAnalyticsQuery,
  handleValidationErrors
} = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// Campaign routes
router.post('/',
  requireEmailVerification,
  validateCreateCampaign,
  handleValidationErrors,
  campaignController.createCampaign
);

router.get('/',
  validateCampaignQuery,
  handleValidationErrors,
  campaignController.getUserCampaigns
);

router.get('/active',
  campaignController.getActiveCampaigns
);

router.get('/:campaignId',
  validateCampaignAction,
  handleValidationErrors,
  campaignController.getCampaign
);

router.put('/:campaignId',
  requireEmailVerification,
  validateUpdateCampaign,
  handleValidationErrors,
  campaignController.updateCampaign
);

router.post('/:campaignId/activate',
  requireEmailVerification,
  validateCampaignAction,
  handleValidationErrors,
  campaignController.activateCampaign
);

router.post('/:campaignId/pause',
  requireEmailVerification,
  validateCampaignAction,
  handleValidationErrors,
  campaignController.pauseCampaign
);

router.post('/:campaignId/complete',
  requireEmailVerification,
  validateCampaignAction,
  handleValidationErrors,
  campaignController.completeCampaign
);

router.post('/:campaignId/archive',
  validateCampaignAction,
  handleValidationErrors,
  campaignController.archiveCampaign
);

router.delete('/:campaignId',
  validateCampaignAction,
  handleValidationErrors,
  campaignController.deleteCampaign
);

router.get('/:campaignId/content',
  validateCampaignAction,
  handleValidationErrors,
  campaignController.getCampaignContent
);

router.get('/:campaignId/analytics',
  validateAnalyticsQuery,
  handleValidationErrors,
  campaignController.getCampaignAnalytics
);

module.exports = router;
