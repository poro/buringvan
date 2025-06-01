const SocialService = require('../services/social.service');
const { validationResult } = require('express-validator');

class SocialController {
  constructor() {
    this.socialService = new SocialService();
  }

  // Get OAuth authorization URL
  async getAuthUrl(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { platform } = req.params;
      const { redirectUri } = req.body;
      const userId = req.user.id;

      const authUrl = await this.socialService.getAuthUrl(platform, userId, redirectUri);

      res.json({
        success: true,
        authUrl,
        platform,
        message: `Authorization URL generated for ${platform}`
      });
    } catch (error) {
      console.error('Get auth URL error:', error);
      res.status(500).json({
        error: 'Failed to generate authorization URL',
        message: error.message
      });
    }
  }

  // Handle OAuth callback
  async handleCallback(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { platform } = req.params;
      const { code, state, redirectUri } = req.body;

      const socialAccount = await this.socialService.handleOAuthCallback(
        platform, 
        code, 
        state, 
        redirectUri
      );

      res.json({
        success: true,
        account: {
          id: socialAccount._id,
          platform: socialAccount.platform,
          username: socialAccount.username,
          displayName: socialAccount.displayName,
          profileImage: socialAccount.profileImage,
          accountMetrics: socialAccount.accountMetrics,
          status: socialAccount.status
        },
        message: `Successfully connected ${platform} account`
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(400).json({
        error: 'Failed to connect social account',
        message: error.message
      });
    }
  }

  // Get user's social accounts
  async getSocialAccounts(req, res) {
    try {
      const userId = req.user.id;
      const accounts = await this.socialService.getUserSocialAccounts(userId);

      const accountsData = accounts.map(account => ({
        id: account._id,
        platform: account.platform,
        username: account.username,
        displayName: account.displayName,
        profileImage: account.profileImage,
        profileUrl: account.profileUrl,
        accountMetrics: account.accountMetrics,
        status: account.status,
        isActive: account.isActive,
        lastSync: account.lastSync,
        settings: account.settings
      }));

      res.json({
        success: true,
        accounts: accountsData,
        total: accountsData.length
      });
    } catch (error) {
      console.error('Get social accounts error:', error);
      res.status(500).json({
        error: 'Failed to fetch social accounts',
        message: error.message
      });
    }
  }

  // Post content to social platforms
  async postContent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { contentData, platformIds } = req.body;

      const results = await this.socialService.postContent(userId, contentData, platformIds);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          successful,
          failed
        },
        message: `Posted to ${successful} platform(s) successfully`
      });
    } catch (error) {
      console.error('Post content error:', error);
      res.status(500).json({
        error: 'Failed to post content',
        message: error.message
      });
    }
  }

  // Get post analytics
  async getPostAnalytics(req, res) {
    try {
      const { postedContentId } = req.params;

      const analytics = await this.socialService.getPostAnalytics(postedContentId);

      res.json({
        success: true,
        analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get post analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch post analytics',
        message: error.message
      });
    }
  }

  // Sync account metrics
  async syncAccountMetrics(req, res) {
    try {
      const userId = req.user.id;
      const { accountId } = req.params;

      let results;
      if (accountId) {
        // Sync specific account (implementation would need to be added to service)
        results = await this.socialService.syncAccountMetrics(userId);
      } else {
        // Sync all accounts
        results = await this.socialService.syncAccountMetrics(userId);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          successful,
          failed
        },
        message: `Synced ${successful} account(s) successfully`
      });
    } catch (error) {
      console.error('Sync account metrics error:', error);
      res.status(500).json({
        error: 'Failed to sync account metrics',
        message: error.message
      });
    }
  }

  // Update account settings
  async updateAccountSettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { accountId } = req.params;
      const { settings } = req.body;
      const userId = req.user.id;

      const SocialAccount = require('../models/socialAccount.model');
      const account = await SocialAccount.findOneAndUpdate(
        { _id: accountId, userId },
        { $set: { settings } },
        { new: true, runValidators: true }
      );

      if (!account) {
        return res.status(404).json({
          error: 'Social account not found'
        });
      }

      res.json({
        success: true,
        account: {
          id: account._id,
          platform: account.platform,
          username: account.username,
          settings: account.settings
        },
        message: 'Account settings updated successfully'
      });
    } catch (error) {
      console.error('Update account settings error:', error);
      res.status(500).json({
        error: 'Failed to update account settings',
        message: error.message
      });
    }
  }

  // Remove social account
  async removeSocialAccount(req, res) {
    try {
      const { accountId } = req.params;
      const userId = req.user.id;

      const account = await this.socialService.removeSocialAccount(userId, accountId);

      res.json({
        success: true,
        account: {
          id: account._id,
          platform: account.platform,
          username: account.username,
          status: account.status
        },
        message: 'Social account removed successfully'
      });
    } catch (error) {
      console.error('Remove social account error:', error);
      res.status(500).json({
        error: 'Failed to remove social account',
        message: error.message
      });
    }
  }

  // Get analytics summary
  async getAnalyticsSummary(req, res) {
    try {
      const userId = req.user.id;
      const { platform, startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : null;

      const summary = await this.socialService.getAnalyticsSummary(userId, dateRange, platform);

      res.json({
        success: true,
        summary,
        filters: {
          platform,
          dateRange
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get analytics summary error:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics summary',
        message: error.message
      });
    }
  }

  // Get posted content history
  async getPostedContent(req, res) {
    try {
      const userId = req.user.id;
      const { platform, status, page = 1, limit = 20 } = req.query;

      const PostedContent = require('../models/postedContent.model');
      
      const query = { userId };
      if (platform) query.platform = platform;
      if (status) query.status = status;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { 'scheduling.postedAt': -1 },
        populate: {
          path: 'socialAccountId',
          select: 'platform username displayName'
        }
      };

      const result = await PostedContent.paginate(query, options);

      const postedContent = result.docs.map(content => ({
        id: content._id,
        platform: content.platform,
        platformPostId: content.platformPostId,
        postUrl: content.postUrl,
        content: content.content,
        scheduling: content.scheduling,
        analytics: content.analytics,
        status: content.status,
        socialAccount: content.socialAccountId,
        engagementMetrics: content.engagementMetrics,
        createdAt: content.createdAt
      }));

      res.json({
        success: true,
        postedContent,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.totalDocs,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      });
    } catch (error) {
      console.error('Get posted content error:', error);
      res.status(500).json({
        error: 'Failed to fetch posted content',
        message: error.message
      });
    }
  }

  // Validate social account tokens
  async validateTokens(req, res) {
    try {
      const userId = req.user.id;
      const SocialAccount = require('../models/socialAccount.model');
      
      const accounts = await SocialAccount.find({ 
        userId, 
        isActive: true 
      });

      const validationResults = [];

      for (const account of accounts) {
        try {
          const platform = this.socialService.platforms[account.platform];
          
          if (!platform || !platform.validateToken) {
            validationResults.push({
              accountId: account._id,
              platform: account.platform,
              isValid: false,
              error: 'Validation not supported'
            });
            continue;
          }

          const tokens = {
            accessToken: account.accessToken,
            accessSecret: account.metadata?.accessSecret
          };

          let isValid;
          if (account.platform === 'twitter') {
            isValid = await platform.validateToken(tokens.accessToken, tokens.accessSecret);
          } else {
            isValid = await platform.validateToken(tokens.accessToken);
          }

          if (!isValid && account.status === 'active') {
            account.status = 'expired';
            await account.save();
          }

          validationResults.push({
            accountId: account._id,
            platform: account.platform,
            username: account.username,
            isValid,
            status: account.status,
            tokenExpiry: account.tokenExpiry
          });

        } catch (error) {
          validationResults.push({
            accountId: account._id,
            platform: account.platform,
            isValid: false,
            error: error.message
          });
        }
      }

      const validCount = validationResults.filter(r => r.isValid).length;
      const invalidCount = validationResults.filter(r => !r.isValid).length;

      res.json({
        success: true,
        validationResults,
        summary: {
          total: validationResults.length,
          valid: validCount,
          invalid: invalidCount
        }
      });
    } catch (error) {
      console.error('Validate tokens error:', error);
      res.status(500).json({
        error: 'Failed to validate tokens',
        message: error.message
      });
    }
  }
}

module.exports = SocialController;
