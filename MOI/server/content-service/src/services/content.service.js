const Content = require('../models/content.model');
const Campaign = require('../models/campaign.model');
const moment = require('moment-timezone');

class ContentService {
  // Create new content
  async createContent(userId, contentData) {
    try {
      const content = new Content({
        userId,
        ...contentData
      });

      await content.save();

      // Update campaign content count if associated with a campaign
      if (content.campaignId) {
        const campaign = await Campaign.findById(content.campaignId);
        if (campaign) {
          await campaign.updateContentCount();
        }
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to create content: ${error.message}`);
    }
  }

  // Get content by ID
  async getContentById(contentId, userId) {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId,
        isArchived: false
      }).populate('campaignId', 'name theme');

      if (!content) {
        throw new Error('Content not found');
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to get content: ${error.message}`);
    }
  }

  // Get user's content with filters
  async getUserContent(userId, filters = {}) {
    try {
      const {
        status,
        platform,
        type,
        aiGenerated,
        campaignId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const query = {
        userId,
        isArchived: false
      };

      // Apply filters
      if (status) query.status = status;
      if (platform) query.platforms = { $in: [platform] };
      if (type) query.type = type;
      if (aiGenerated !== undefined) query.aiGenerated = aiGenerated;
      if (campaignId) query.campaignId = campaignId;

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [content, totalCount] = await Promise.all([
        Content.find(query)
          .populate('campaignId', 'name theme')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Content.countDocuments(query)
      ]);

      return {
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
      throw new Error(`Failed to get user content: ${error.message}`);
    }
  }

  // Update content
  async updateContent(contentId, userId, updateData) {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId,
        isArchived: false
      });

      if (!content) {
        throw new Error('Content not found');
      }

      // Don't allow updates to published content
      if (content.status === 'published') {
        throw new Error('Cannot update published content');
      }

      // Track edits for feedback
      if (content.aiGenerated && updateData.content) {
        const edits = [];
        
        if (updateData.content.text && updateData.content.text !== content.content.text) {
          edits.push({
            field: 'text',
            oldValue: content.content.text,
            newValue: updateData.content.text
          });
        }

        if (edits.length > 0) {
          content.userFeedback.editsMade.push(...edits);
        }
      }

      // Update content
      Object.assign(content, updateData);
      await content.save();

      return content;
    } catch (error) {
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  // Approve content
  async approveContent(contentId, userId, feedback = {}) {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId,
        isArchived: false
      });

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.status !== 'pending_approval' && content.status !== 'draft') {
        throw new Error('Content is not in a state that can be approved');
      }

      // Update feedback
      if (feedback.rating) content.userFeedback.rating = feedback.rating;
      if (feedback.comments) content.userFeedback.comments = feedback.comments;

      await content.approve();

      return content;
    } catch (error) {
      throw new Error(`Failed to approve content: ${error.message}`);
    }
  }

  // Reject content
  async rejectContent(contentId, userId, reason) {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId,
        isArchived: false
      });

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.status !== 'pending_approval') {
        throw new Error('Content is not pending approval');
      }

      await content.reject(reason);

      return content;
    } catch (error) {
      throw new Error(`Failed to reject content: ${error.message}`);
    }
  }

  // Schedule content
  async scheduleContent(contentId, userId, scheduledFor, timezone = 'UTC') {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId,
        isArchived: false
      });

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.status !== 'approved') {
        throw new Error('Content must be approved before scheduling');
      }

      // Convert scheduled time to UTC
      const scheduledDate = moment.tz(scheduledFor, timezone).utc().toDate();

      if (scheduledDate <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      await content.schedule(scheduledDate, timezone);

      return content;
    } catch (error) {
      throw new Error(`Failed to schedule content: ${error.message}`);
    }
  }

  // Get scheduled content ready for publishing
  async getScheduledContent() {
    try {
      return await Content.findScheduled();
    } catch (error) {
      throw new Error(`Failed to get scheduled content: ${error.message}`);
    }
  }

  // Archive content
  async archiveContent(contentId, userId) {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId
      });

      if (!content) {
        throw new Error('Content not found');
      }

      await content.archive();

      return { message: 'Content archived successfully' };
    } catch (error) {
      throw new Error(`Failed to archive content: ${error.message}`);
    }
  }

  // Delete content
  async deleteContent(contentId, userId) {
    try {
      const content = await Content.findOne({
        _id: contentId,
        userId
      });

      if (!content) {
        throw new Error('Content not found');
      }

      // Don't allow deletion of published content
      if (content.status === 'published') {
        throw new Error('Cannot delete published content. Archive it instead.');
      }

      await Content.findByIdAndDelete(contentId);

      // Update campaign content count if associated with a campaign
      if (content.campaignId) {
        const campaign = await Campaign.findById(content.campaignId);
        if (campaign) {
          await campaign.updateContentCount();
        }
      }

      return { message: 'Content deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  // Duplicate content
  async duplicateContent(contentId, userId) {
    try {
      const originalContent = await Content.findOne({
        _id: contentId,
        userId,
        isArchived: false
      });

      if (!originalContent) {
        throw new Error('Content not found');
      }

      const duplicatedContent = new Content({
        userId,
        title: `${originalContent.title} (Copy)`,
        type: originalContent.type,
        platforms: originalContent.platforms,
        content: originalContent.content,
        media: originalContent.media,
        campaignId: originalContent.campaignId,
        tags: originalContent.tags,
        priority: originalContent.priority,
        aiGenerated: false, // Reset AI generated flag
        status: 'draft' // Reset to draft
      });

      await duplicatedContent.save();

      return duplicatedContent;
    } catch (error) {
      throw new Error(`Failed to duplicate content: ${error.message}`);
    }
  }

  // Get content analytics
  async getContentAnalytics(userId, filters = {}) {
    try {
      const {
        platform,
        startDate,
        endDate,
        campaignId
      } = filters;

      const matchStage = {
        userId: userId,
        status: 'published',
        isArchived: false
      };

      if (platform) matchStage.platforms = { $in: [platform] };
      if (campaignId) matchStage.campaignId = campaignId;
      if (startDate || endDate) {
        matchStage.publishedAt = {};
        if (startDate) matchStage.publishedAt.$gte = new Date(startDate);
        if (endDate) matchStage.publishedAt.$lte = new Date(endDate);
      }

      const analytics = await Content.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalContent: { $sum: 1 },
            totalViews: { $sum: '$analytics.views' },
            totalLikes: { $sum: '$analytics.likes' },
            totalComments: { $sum: '$analytics.comments' },
            totalShares: { $sum: '$analytics.shares' },
            totalEngagement: { $sum: '$analytics.engagement' },
            totalReach: { $sum: '$analytics.reach' },
            totalImpressions: { $sum: '$analytics.impressions' },
            avgEngagement: { $avg: '$analytics.engagement' },
            topPerforming: { $max: '$analytics.engagement' }
          }
        }
      ]);

      const platformBreakdown = await Content.aggregate([
        { $match: matchStage },
        { $unwind: '$platforms' },
        {
          $group: {
            _id: '$platforms',
            count: { $sum: 1 },
            totalEngagement: { $sum: '$analytics.engagement' },
            avgEngagement: { $avg: '$analytics.engagement' }
          }
        }
      ]);

      return {
        summary: analytics[0] || {
          totalContent: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalEngagement: 0,
          totalReach: 0,
          totalImpressions: 0,
          avgEngagement: 0,
          topPerforming: 0
        },
        platformBreakdown
      };
    } catch (error) {
      throw new Error(`Failed to get content analytics: ${error.message}`);
    }
  }

  // Update content analytics
  async updateContentAnalytics(contentId, analyticsData) {
    try {
      const content = await Content.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      content.analytics = {
        ...content.analytics,
        ...analyticsData,
        lastSyncedAt: new Date()
      };

      await content.save();

      return content;
    } catch (error) {
      throw new Error(`Failed to update content analytics: ${error.message}`);
    }
  }

  // Get content by status
  async getContentByStatus(userId, status) {
    try {
      return await Content.findByUser(userId, status);
    } catch (error) {
      throw new Error(`Failed to get content by status: ${error.message}`);
    }
  }

  // Get content by platform
  async getContentByPlatform(platform, status = null) {
    try {
      return await Content.findByPlatform(platform, status);
    } catch (error) {
      throw new Error(`Failed to get content by platform: ${error.message}`);
    }
  }
}

module.exports = new ContentService();
