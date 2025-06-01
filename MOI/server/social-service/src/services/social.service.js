const axios = require('axios');
const logger = require('../utils/logger');
const SocialAccount = require('../models/socialAccount.model');
// const { Content } = require('../models/content.model'); // Remove since we don't have this model
const LinkedInService = require('./platforms/linkedin.service');
const TwitterService = require('./platforms/twitter.service');
const InstagramService = require('./platforms/instagram.service');
const { setCache, getCache, deleteCache } = require('../config/redis');

class SocialService {
  constructor() {
    this.platforms = {
      linkedin: {
        baseUrl: 'https://api.linkedin.com/v2',
        endpoints: {
          post: '/ugcPosts',
          profile: '/me',
          analytics: '/organizationalEntityFollowerStatistics'
        }
      },
      twitter: {
        baseUrl: 'https://api.twitter.com/2',
        endpoints: {
          tweet: '/tweets',
          profile: '/users/me',
          analytics: '/tweets/search/recent'
        }
      },
      instagram: {
        baseUrl: 'https://graph.instagram.com',
        endpoints: {
          post: '/media',
          profile: '/me',
          analytics: '/insights'
        }
      },
      tiktok: {
        baseUrl: 'https://open.tiktokapis.com/v2',
        endpoints: {
          post: '/post/publish',
          profile: '/user/info',
          analytics: '/research/video/query'
        }
      },
      youtube: {
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        endpoints: {
          post: '/videos',
          profile: '/channels',
          analytics: '/analytics'
        }
      }
    };
  }

  async publishContent(contentId, platform) {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      const account = await SocialAccount.findOne({
        userId: content.userId,
        platform
      });

      if (!account) {
        throw new Error(`No ${platform} account connected`);
      }

      const platformConfig = this.platforms[platform];
      const endpoint = platformConfig.endpoints.post;

      // Prepare content based on platform requirements
      const preparedContent = await this.prepareContentForPlatform(content, platform);

      // Publish to platform
      const response = await axios.post(
        `${platformConfig.baseUrl}${endpoint}`,
        preparedContent,
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update content status
      await Content.findByIdAndUpdate(contentId, {
        status: 'published',
        publishedAt: new Date(),
        platformData: {
          ...content.platformData,
          [platform]: {
            postId: response.data.id,
            status: 'published',
            publishedAt: new Date()
          }
        }
      });

      return {
        success: true,
        platform,
        postId: response.data.id
      };
    } catch (error) {
      logger.error(`Error publishing to ${platform}:`, error);
      throw error;
    }
  }

  async prepareContentForPlatform(content, platform) {
    const baseContent = {
      text: content.text,
      media: content.media
    };

    switch (platform) {
      case 'linkedin':
        return {
          author: `urn:li:person:${content.userId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content.text
              },
              shareMediaCategory: content.media ? 'IMAGE' : 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        };

      case 'twitter':
        return {
          text: content.text,
          media: content.media ? {
            media_ids: [content.media]
          } : undefined
        };

      case 'instagram':
        return {
          caption: content.text,
          media_type: content.media ? 'IMAGE' : 'CAROUSEL',
          children: content.media ? [content.media] : undefined
        };

      case 'tiktok':
        return {
          post_info: {
            title: content.text.substring(0, 100),
            description: content.text,
            video_id: content.media
          },
          privacy_level: 'PUBLIC'
        };

      case 'youtube':
        return {
          snippet: {
            title: content.text.substring(0, 100),
            description: content.text,
            categoryId: '22' // People & Blogs
          },
          status: {
            privacyStatus: 'public'
          }
        };

      default:
        return baseContent;
    }
  }

  async getAnalytics(contentId, platform) {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      const account = await SocialAccount.findOne({
        userId: content.userId,
        platform
      });

      if (!account) {
        throw new Error(`No ${platform} account connected`);
      }

      const platformConfig = this.platforms[platform];
      const endpoint = platformConfig.endpoints.analytics;

      const response = await axios.get(
        `${platformConfig.baseUrl}${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`
          },
          params: {
            id: content.platformData[platform]?.postId
          }
        }
      );

      return this.formatAnalytics(response.data, platform);
    } catch (error) {
      logger.error(`Error fetching analytics from ${platform}:`, error);
      throw error;
    }
  }

  formatAnalytics(data, platform) {
    switch (platform) {
      case 'linkedin':
        return {
          impressions: data.impressions,
          clicks: data.clicks,
          engagement: data.engagement,
          shares: data.shares
        };

      case 'twitter':
        return {
          impressions: data.impression_count,
          retweets: data.retweet_count,
          likes: data.like_count,
          replies: data.reply_count
        };

      case 'instagram':
        return {
          reach: data.reach,
          impressions: data.impressions,
          saved: data.saved,
          engagement: data.engagement
        };

      case 'tiktok':
        return {
          views: data.view_count,
          likes: data.like_count,
          comments: data.comment_count,
          shares: data.share_count
        };

      case 'youtube':
        return {
          views: data.statistics.viewCount,
          likes: data.statistics.likeCount,
          comments: data.statistics.commentCount,
          shares: data.statistics.shareCount
        };

      default:
        return data;
    }
  }

  async connectAccount(userId, platform, accessToken) {
    try {
      const platformConfig = this.platforms[platform];
      const endpoint = platformConfig.endpoints.profile;

      // Verify token and get account info
      const response = await axios.get(
        `${platformConfig.baseUrl}${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Create or update account
      await SocialAccount.findOneAndUpdate(
        { userId, platform },
        {
          userId,
          platform,
          accessToken,
          refreshToken: response.data.refresh_token,
          accountId: response.data.id,
          accountName: response.data.name,
          accountUsername: response.data.username,
          lastSynced: new Date()
        },
        { upsert: true }
      );

      return {
        success: true,
        platform,
        accountId: response.data.id
      };
    } catch (error) {
      logger.error(`Error connecting ${platform} account:`, error);
      throw error;
    }
  }

  // Get OAuth URL for platform authorization
  async getAuthUrl(platform, userId, redirectUri) {
    try {
      if (!this.platforms[platform]) {
        throw new Error(`Platform ${platform} is not supported`);
      }

      const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await setCache(`oauth_state:${state}`, { userId, platform, redirectUri }, 600); // 10 minutes

      return this.platforms[platform].getAuthUrl(redirectUri, state);
    } catch (error) {
      console.error('Get auth URL error:', error);
      throw error;
    }
  }

  // Handle OAuth callback and create social account
  async handleOAuthCallback(platform, code, state, redirectUri) {
    try {
      // Verify state
      const stateData = await getCache(`oauth_state:${state}`);
      if (!stateData) {
        throw new Error('Invalid or expired OAuth state');
      }

      await deleteCache(`oauth_state:${state}`);

      const { userId } = stateData;

      // Exchange code for tokens
      const tokenData = await this.platforms[platform].getAccessToken(code, redirectUri);
      
      // Get user profile from platform
      const profileData = await this.platforms[platform].getUserProfile(
        tokenData.accessToken || tokenData.access_token,
        tokenData.accessSecret // For Twitter
      );

      // Create or update social account
      const socialAccount = await this.createOrUpdateSocialAccount({
        userId,
        platform,
        profileData,
        tokenData
      });

      return socialAccount;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  // Create or update social account
  async createOrUpdateSocialAccount(data) {
    const { userId, platform, profileData, tokenData } = data;

    try {
      const accountData = {
        userId,
        platform,
        platformId: profileData.id,
        username: profileData.username || profileData.name || profileData.firstName,
        displayName: profileData.name || `${profileData.firstName} ${profileData.lastName}`,
        profileImage: profileData.profileImage || profileData.profilePicture,
        accessToken: tokenData.accessToken || tokenData.access_token,
        refreshToken: tokenData.refreshToken || tokenData.refresh_token,
        tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        accountMetrics: {
          followers: profileData.followers || 0,
          following: profileData.following || 0,
          posts: profileData.posts || profileData.tweets || profileData.mediaCount || 0
        },
        status: 'active',
        lastSync: new Date()
      };

      // For Twitter, store access secret
      if (platform === 'twitter' && tokenData.accessSecret) {
        accountData.metadata = { accessSecret: tokenData.accessSecret };
      }

      const socialAccount = await SocialAccount.findOneAndUpdate(
        { userId, platform },
        accountData,
        { upsert: true, new: true, runValidators: true }
      );

      return socialAccount;
    } catch (error) {
      console.error('Create/update social account error:', error);
      throw error;
    }
  }

  // Get user's social accounts
  async getUserSocialAccounts(userId) {
    try {
      const accounts = await SocialAccount.find({ userId, isActive: true });
      return accounts;
    } catch (error) {
      console.error('Get user social accounts error:', error);
      throw error;
    }
  }

  // Post content to multiple platforms
  async postContent(userId, contentData, platformIds = []) {
    try {
      const results = [];
      let socialAccounts;

      if (platformIds.length > 0) {
        socialAccounts = await SocialAccount.find({
          _id: { $in: platformIds },
          userId,
          isActive: true,
          status: 'active'
        });
      } else {
        socialAccounts = await SocialAccount.find({
          userId,
          isActive: true,
          status: 'active',
          'settings.autoPost': true
        });
      }

      for (const account of socialAccounts) {
        try {
          // Check if token needs refresh
          if (account.needsTokenRefresh()) {
            await this.refreshAccountToken(account);
          }

          // Platform-specific content optimization
          const optimizedContent = this.optimizeContentForPlatform(contentData, account.platform);

          // Post to platform
          const postResult = await this.postToPlatform(account, optimizedContent);

          // Create posted content record
          const postedContent = new PostedContent({
            userId,
            contentId: contentData.contentId,
            socialAccountId: account._id,
            platform: account.platform,
            platformPostId: postResult.id,
            postUrl: postResult.url,
            content: {
              text: optimizedContent.text,
              media: optimizedContent.media || [],
              hashtags: this.extractHashtags(optimizedContent.text),
              mentions: this.extractMentions(optimizedContent.text)
            },
            scheduling: {
              scheduledAt: contentData.scheduledAt,
              timezone: contentData.timezone
            },
            status: 'posted'
          });

          await postedContent.save();

          results.push({
            platform: account.platform,
            success: true,
            postId: postResult.id,
            url: postResult.url,
            postedContentId: postedContent._id
          });

        } catch (platformError) {
          console.error(`Failed to post to ${account.platform}:`, platformError);
          
          // Log error to account
          await account.logError(platformError);

          results.push({
            platform: account.platform,
            success: false,
            error: platformError.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Post content error:', error);
      throw error;
    }
  }

  // Post to specific platform
  async postToPlatform(account, content) {
    const platform = this.platforms[account.platform];
    
    if (!platform) {
      throw new Error(`Platform ${account.platform} is not supported`);
    }

    const tokens = {
      accessToken: account.accessToken,
      accessSecret: account.metadata?.accessSecret // For Twitter
    };

    if (account.platform === 'twitter') {
      return await platform.postContent(tokens.accessToken, tokens.accessSecret, content);
    } else {
      return await platform.postContent(tokens.accessToken, content, account.platformId);
    }
  }

  // Optimize content for specific platform
  optimizeContentForPlatform(content, platform) {
    const optimized = { ...content };

    switch (platform) {
      case 'twitter':
        // Twitter has character limits
        if (optimized.text && optimized.text.length > 280) {
          // This will be handled by the Twitter service's splitIntoTweets method
        }
        break;

      case 'linkedin':
        // LinkedIn prefers professional tone
        if (optimized.text) {
          // Add professional hashtags if configured
          if (!optimized.text.includes('#')) {
            optimized.text += ' #professional #business';
          }
        }
        break;

      case 'instagram':
        // Instagram requires media
        if (!optimized.media || optimized.media.length === 0) {
          throw new Error('Instagram posts require at least one media file');
        }
        // Add trending hashtags
        if (optimized.text && !optimized.text.includes('#')) {
          optimized.text += ' #instagram #content';
        }
        break;
    }

    return optimized;
  }

  // Extract hashtags from text
  extractHashtags(text) {
    if (!text) return [];
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return text.match(hashtagRegex) || [];
  }

  // Extract mentions from text
  extractMentions(text) {
    if (!text) return [];
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    return text.match(mentionRegex) || [];
  }

  // Refresh account token
  async refreshAccountToken(account) {
    try {
      const platform = this.platforms[account.platform];
      
      if (!platform.refreshToken) {
        throw new Error(`Token refresh not supported for ${account.platform}`);
      }

      const newTokenData = await platform.refreshToken(account.refreshToken);
      
      account.accessToken = newTokenData.access_token;
      account.tokenExpiry = newTokenData.expires_in ? 
        new Date(Date.now() + newTokenData.expires_in * 1000) : null;
      
      if (newTokenData.refresh_token) {
        account.refreshToken = newTokenData.refresh_token;
      }

      await account.save();
      return account;
    } catch (error) {
      console.error('Token refresh error:', error);
      account.status = 'expired';
      await account.save();
      throw error;
    }
  }

  // Get post analytics
  async getPostAnalytics(postedContentId) {
    try {
      const postedContent = await PostedContent.findById(postedContentId)
        .populate('socialAccountId');

      if (!postedContent) {
        throw new Error('Posted content not found');
      }

      const account = postedContent.socialAccountId;
      const platform = this.platforms[account.platform];

      if (!platform.getPostAnalytics) {
        return postedContent.analytics;
      }

      const tokens = {
        accessToken: account.accessToken,
        accessSecret: account.metadata?.accessSecret
      };

      let analyticsData;
      if (account.platform === 'twitter') {
        analyticsData = await platform.getTweetAnalytics(
          tokens.accessToken, 
          tokens.accessSecret, 
          postedContent.platformPostId
        );
      } else {
        analyticsData = await platform.getPostAnalytics(
          tokens.accessToken, 
          postedContent.platformPostId
        );
      }

      // Update analytics in database
      await postedContent.updateAnalytics(analyticsData);

      return analyticsData;
    } catch (error) {
      console.error('Get post analytics error:', error);
      throw error;
    }
  }

  // Sync all account metrics
  async syncAccountMetrics(userId) {
    try {
      const accounts = await SocialAccount.find({ 
        userId, 
        isActive: true, 
        status: 'active' 
      });

      const results = [];

      for (const account of accounts) {
        try {
          const platform = this.platforms[account.platform];
          
          const tokens = {
            accessToken: account.accessToken,
            accessSecret: account.metadata?.accessSecret
          };

          let profileData;
          if (account.platform === 'twitter') {
            profileData = await platform.getUserProfile(tokens.accessToken, tokens.accessSecret);
          } else {
            profileData = await platform.getUserProfile(tokens.accessToken);
          }

          await account.updateMetrics({
            followers: profileData.followers,
            following: profileData.following,
            posts: profileData.posts || profileData.tweets || profileData.mediaCount || 0
          });

          results.push({
            platform: account.platform,
            success: true,
            metrics: account.accountMetrics
          });

        } catch (error) {
          console.error(`Failed to sync ${account.platform} metrics:`, error);
          results.push({
            platform: account.platform,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Sync account metrics error:', error);
      throw error;
    }
  }

  // Remove social account
  async removeSocialAccount(userId, accountId) {
    try {
      const account = await SocialAccount.findOneAndUpdate(
        { _id: accountId, userId },
        { isActive: false, status: 'revoked' },
        { new: true }
      );

      if (!account) {
        throw new Error('Social account not found');
      }

      return account;
    } catch (error) {
      console.error('Remove social account error:', error);
      throw error;
    }
  }

  // Get analytics summary for user
  async getAnalyticsSummary(userId, dateRange, platform) {
    try {
      return await PostedContent.getAnalyticsSummary(userId, platform, dateRange);
    } catch (error) {
      console.error('Get analytics summary error:', error);
      throw error;
    }
  }
}

module.exports = SocialService;
