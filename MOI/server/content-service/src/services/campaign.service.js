const Campaign = require('../models/campaign.model');
const Content = require('../models/content.model');

class CampaignService {
  // Create new campaign
  async createCampaign(userId, campaignData) {
    try {
      const campaign = new Campaign({
        userId,
        ...campaignData
      });

      await campaign.save();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  // Get campaign by ID
  async getCampaignById(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }
  }

  // Get user's campaigns
  async getUserCampaigns(userId, filters = {}) {
    try {
      const {
        status,
        platform,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;

      const query = {
        userId,
        isArchived: false
      };

      if (status) query.status = status;
      if (platform) query.platforms = { $in: [platform] };

      if (startDate || endDate) {
        query.$or = [
          { startDate: { $gte: startDate, $lte: endDate } },
          { endDate: { $gte: startDate, $lte: endDate } },
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
        ];
      }

      const skip = (page - 1) * limit;

      const [campaigns, totalCount] = await Promise.all([
        Campaign.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Campaign.countDocuments(query)
      ]);

      return {
        campaigns,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user campaigns: ${error.message}`);
    }
  }

  // Update campaign
  async updateCampaign(campaignId, userId, updateData) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      Object.assign(campaign, updateData);
      await campaign.save();

      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  }

  // Activate campaign
  async activateCampaign(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      await campaign.activate();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to activate campaign: ${error.message}`);
    }
  }

  // Pause campaign
  async pauseCampaign(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      await campaign.pause();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to pause campaign: ${error.message}`);
    }
  }

  // Complete campaign
  async completeCampaign(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      await campaign.complete();
      return campaign;
    } catch (error) {
      throw new Error(`Failed to complete campaign: ${error.message}`);
    }
  }

  // Archive campaign
  async archiveCampaign(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      campaign.isArchived = true;
      await campaign.save();

      return { message: 'Campaign archived successfully' };
    } catch (error) {
      throw new Error(`Failed to archive campaign: ${error.message}`);
    }
  }

  // Delete campaign
  async deleteCampaign(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if campaign has content
      const contentCount = await Content.countDocuments({
        campaignId,
        status: { $ne: 'archived' }
      });

      if (contentCount > 0) {
        throw new Error('Cannot delete campaign with existing content. Archive it instead.');
      }

      await Campaign.findByIdAndDelete(campaignId);

      return { message: 'Campaign deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

  // Get campaign content
  async getCampaignContent(campaignId, userId, filters = {}) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const {
        status,
        platform,
        page = 1,
        limit = 20
      } = filters;

      const query = {
        campaignId,
        isArchived: false
      };

      if (status) query.status = status;
      if (platform) query.platforms = { $in: [platform] };

      const skip = (page - 1) * limit;

      const [content, totalCount] = await Promise.all([
        Content.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Content.countDocuments(query)
      ]);

      return {
        campaign,
        content,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get campaign content: ${error.message}`);
    }
  }

  // Get campaign analytics
  async getCampaignAnalytics(campaignId, userId) {
    try {
      const campaign = await Campaign.findOne({
        _id: campaignId,
        userId,
        isArchived: false
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const analytics = await Content.aggregate([
        {
          $match: {
            campaignId: campaign._id,
            status: 'published',
            isArchived: false
          }
        },
        {
          $group: {
            _id: null,
            totalContent: { $sum: 1 },
            totalReach: { $sum: '$analytics.reach' },
            totalEngagement: { $sum: '$analytics.engagement' },
            totalViews: { $sum: '$analytics.views' },
            totalLikes: { $sum: '$analytics.likes' },
            totalComments: { $sum: '$analytics.comments' },
            totalShares: { $sum: '$analytics.shares' },
            avgEngagement: { $avg: '$analytics.engagement' }
          }
        }
      ]);

      const platformBreakdown = await Content.aggregate([
        {
          $match: {
            campaignId: campaign._id,
            status: 'published',
            isArchived: false
          }
        },
        { $unwind: '$platforms' },
        {
          $group: {
            _id: '$platforms',
            posts: { $sum: 1 },
            reach: { $sum: '$analytics.reach' },
            engagement: { $sum: '$analytics.engagement' }
          }
        }
      ]);

      // Update campaign analytics
      campaign.analytics.totalReach = analytics[0]?.totalReach || 0;
      campaign.analytics.totalEngagement = analytics[0]?.totalEngagement || 0;
      campaign.analytics.averageEngagementRate = analytics[0]?.avgEngagement || 0;
      campaign.analytics.platformBreakdown = platformBreakdown.map(p => ({
        platform: p._id,
        posts: p.posts,
        reach: p.reach,
        engagement: p.engagement
      }));

      await campaign.save();

      return {
        summary: analytics[0] || {
          totalContent: 0,
          totalReach: 0,
          totalEngagement: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          avgEngagement: 0
        },
        platformBreakdown,
        campaign: {
          name: campaign.name,
          status: campaign.status,
          duration: campaign.duration,
          completionRate: campaign.completionRate,
          contentCount: campaign.contentCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get campaign analytics: ${error.message}`);
    }
  }

  // Get active campaigns
  async getActiveCampaigns(userId) {
    try {
      return await Campaign.findActive(userId);
    } catch (error) {
      throw new Error(`Failed to get active campaigns: ${error.message}`);
    }
  }

  // Update campaign content count
  async updateCampaignContentCount(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        await campaign.updateContentCount();
      }
      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign content count: ${error.message}`);
    }
  }
}

module.exports = new CampaignService();
