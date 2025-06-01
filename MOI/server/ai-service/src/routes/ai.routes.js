const express = require('express');
const router = express.Router();

const aiController = require('../controllers/ai.controller');
const { 
  authenticate, 
  authorize,
  requireEmailVerification, 
  requireActiveSubscription,
  requireSubscriptionPlan 
} = require('../middleware/auth.middleware');
const {
  validateGenerateContent,
  validateImproveContent,
  validateOptimizeContent,
  validateGenerateHashtags,
  validateAnalyzePerformance,
  validateGenerateVariations,
  validateTrainFeedback,
  validateAIQuery,
  handleValidationErrors
} = require('../middleware/validation.middleware');

// All routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// Content generation routes
router.post('/generate',
  // requireEmailVerification,
  // requireActiveSubscription,
  validateGenerateContent,
  handleValidationErrors,
  aiController.generateContent
);

router.post('/content/:contentId/improve',
  requireEmailVerification,
  requireActiveSubscription,
  validateImproveContent,
  handleValidationErrors,
  aiController.improveContent
);

router.post('/content/:contentId/optimize',
  requireEmailVerification,
  requireActiveSubscription,
  validateOptimizeContent,
  handleValidationErrors,
  aiController.optimizeContent
);

router.post('/content/:contentId/variations',
  requireEmailVerification,
  requireActiveSubscription,
  validateGenerateVariations,
  handleValidationErrors,
  aiController.generateVariations
);

// Hashtag generation
router.post('/hashtags',
  requireEmailVerification,
  requireActiveSubscription,
  validateGenerateHashtags,
  handleValidationErrors,
  aiController.generateHashtags
);

// Analysis and insights routes
router.post('/analyze/performance',
  requireEmailVerification,
  requireSubscriptionPlan('pro', 'enterprise'),
  validateAnalyzePerformance,
  handleValidationErrors,
  aiController.analyzePerformance
);

router.get('/suggestions',
  requireEmailVerification,
  requireActiveSubscription,
  validateAIQuery,
  handleValidationErrors,
  aiController.getContentSuggestions
);

router.get('/insights',
  requireEmailVerification,
  requireSubscriptionPlan('pro', 'enterprise'),
  validateAIQuery,
  handleValidationErrors,
  aiController.getAIInsights
);

// Training and feedback routes
router.post('/train/feedback',
  requireEmailVerification,
  requireActiveSubscription,
  validateTrainFeedback,
  handleValidationErrors,
  aiController.trainWithFeedback
);

// Model status (admin only)
router.get('/model/status',
  authorize('admin'),
  aiController.getModelStatus
);

module.exports = router;
