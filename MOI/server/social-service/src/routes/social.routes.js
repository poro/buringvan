const express = require('express');
const SocialController = require('../controllers/social.controller');
const {
  verifyWithAuthService,
  checkSubscription,
  checkPlatformLimits,
  checkAccountOwnership,
  checkContentOwnership
} = require('../middleware/auth.middleware');
const {
  validateAuthUrl,
  validateCallback,
  validatePostContent,
  validateAccountSettings,
  validateAccountId,
  validatePostedContentId,
  validateAnalyticsQuery,
  validatePostedContentQuery,
  validateRateLimit
} = require('../middleware/validation.middleware');

const router = express.Router();
const socialController = new SocialController();

// Apply authentication to all routes
router.use(verifyWithAuthService);

// OAuth authorization routes
router.post('/auth/:platform/url', 
  validateAuthUrl,
  checkPlatformLimits,
  socialController.getAuthUrl.bind(socialController)
);

router.post('/auth/:platform/callback',
  validateCallback,
  checkPlatformLimits,
  socialController.handleCallback.bind(socialController)
);

// Social accounts management
router.get('/accounts',
  socialController.getSocialAccounts.bind(socialController)
);

router.put('/accounts/:accountId/settings',
  validateAccountSettings,
  checkAccountOwnership,
  socialController.updateAccountSettings.bind(socialController)
);

router.delete('/accounts/:accountId',
  validateAccountId,
  checkAccountOwnership,
  socialController.removeSocialAccount.bind(socialController)
);

router.post('/accounts/validate',
  socialController.validateTokens.bind(socialController)
);

router.post('/accounts/sync',
  socialController.syncAccountMetrics.bind(socialController)
);

router.post('/accounts/:accountId/sync',
  validateAccountId,
  checkAccountOwnership,
  socialController.syncAccountMetrics.bind(socialController)
);

// Content posting
router.post('/post',
  validatePostContent,
  validateRateLimit,
  checkSubscription('basic'),
  checkPlatformLimits,
  socialController.postContent.bind(socialController)
);

// Analytics and reporting
router.get('/analytics/summary',
  validateAnalyticsQuery,
  socialController.getAnalyticsSummary.bind(socialController)
);

router.get('/analytics/:postedContentId',
  validatePostedContentId,
  checkContentOwnership,
  socialController.getPostAnalytics.bind(socialController)
);

// Posted content management
router.get('/posted-content',
  validatePostedContentQuery,
  socialController.getPostedContent.bind(socialController)
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'social-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Platform-specific routes

// LinkedIn specific routes
router.get('/platforms/linkedin/profile',
  checkPlatformLimits,
  async (req, res) => {
    try {
      const SocialAccount = require('../models/socialAccount.model');
      const account = await SocialAccount.findOne({
        userId: req.user.id,
        platform: 'linkedin',
        isActive: true,
        status: 'active'
      });

      if (!account) {
        return res.status(404).json({
          error: 'LinkedIn account not connected'
        });
      }

      const LinkedInService = require('../services/platforms/linkedin.service');
      const linkedInService = new LinkedInService();
      
      const profile = await linkedInService.getUserProfile(account.accessToken);
      
      res.json({
        success: true,
        profile,
        account: {
          id: account._id,
          username: account.username,
          displayName: account.displayName
        }
      });
    } catch (error) {
      console.error('LinkedIn profile error:', error);
      res.status(500).json({
        error: 'Failed to fetch LinkedIn profile',
        message: error.message
      });
    }
  }
);

// Twitter specific routes
router.get('/platforms/twitter/profile',
  checkPlatformLimits,
  async (req, res) => {
    try {
      const SocialAccount = require('../models/socialAccount.model');
      const account = await SocialAccount.findOne({
        userId: req.user.id,
        platform: 'twitter',
        isActive: true,
        status: 'active'
      });

      if (!account) {
        return res.status(404).json({
          error: 'Twitter account not connected'
        });
      }

      const TwitterService = require('../services/platforms/twitter.service');
      const twitterService = new TwitterService();
      
      const profile = await twitterService.getUserProfile(
        account.accessToken,
        account.metadata?.accessSecret
      );
      
      res.json({
        success: true,
        profile,
        account: {
          id: account._id,
          username: account.username,
          displayName: account.displayName
        }
      });
    } catch (error) {
      console.error('Twitter profile error:', error);
      res.status(500).json({
        error: 'Failed to fetch Twitter profile',
        message: error.message
      });
    }
  }
);

// Instagram specific routes
router.get('/platforms/instagram/profile',
  checkPlatformLimits,
  async (req, res) => {
    try {
      const SocialAccount = require('../models/socialAccount.model');
      const account = await SocialAccount.findOne({
        userId: req.user.id,
        platform: 'instagram',
        isActive: true,
        status: 'active'
      });

      if (!account) {
        return res.status(404).json({
          error: 'Instagram account not connected'
        });
      }

      const InstagramService = require('../services/platforms/instagram.service');
      const instagramService = new InstagramService();
      
      const profile = await instagramService.getUserProfile(account.accessToken);
      
      res.json({
        success: true,
        profile,
        account: {
          id: account._id,
          username: account.username,
          displayName: account.displayName
        }
      });
    } catch (error) {
      console.error('Instagram profile error:', error);
      res.status(500).json({
        error: 'Failed to fetch Instagram profile',
        message: error.message
      });
    }
  }
);

// Get platform-specific posts
router.get('/platforms/:platform/posts',
  validateAnalyticsQuery,
  checkPlatformLimits,
  async (req, res) => {
    try {
      const { platform } = req.params;
      const { limit = 10 } = req.query;

      const SocialAccount = require('../models/socialAccount.model');
      const account = await SocialAccount.findOne({
        userId: req.user.id,
        platform,
        isActive: true,
        status: 'active'
      });

      if (!account) {
        return res.status(404).json({
          error: `${platform} account not connected`
        });
      }

      const platforms = {
        linkedin: require('../services/platforms/linkedin.service'),
        twitter: require('../services/platforms/twitter.service'),
        instagram: require('../services/platforms/instagram.service')
      };

      const PlatformService = platforms[platform];
      if (!PlatformService) {
        return res.status(400).json({
          error: 'Platform not supported'
        });
      }

      const platformService = new PlatformService();
      
      let posts;
      if (platform === 'twitter') {
        posts = await platformService.getUserTweets(
          account.accessToken,
          account.metadata?.accessSecret,
          account.platformId,
          parseInt(limit)
        );
      } else {
        posts = await platformService.getUserPosts(
          account.accessToken,
          account.platformId,
          parseInt(limit)
        );
      }
      
      res.json({
        success: true,
        posts,
        platform,
        total: posts.length
      });
    } catch (error) {
      console.error('Platform posts error:', error);
      res.status(500).json({
        error: 'Failed to fetch platform posts',
        message: error.message
      });
    }
  }
);

// Error handling for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    service: 'social-service'
  });
});

module.exports = router;
