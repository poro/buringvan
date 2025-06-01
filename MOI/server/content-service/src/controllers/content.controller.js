const contentService = require('../services/content.service');

class ContentController {
  // Create new content
  async createContent(req, res) {
    try {
      const userId = req.user._id;
      const contentData = req.body;
      
      const content = await contentService.createContent(userId, contentData);
      
      res.status(201).json({
        status: 'success',
        message: 'Content created successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Create content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get content by ID
  async getContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      
      const content = await contentService.getContentById(contentId, userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Get content error:', error);
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get user's content with filters
  async getUserContent(req, res) {
    try {
      const userId = req.user._id;
      const filters = req.query;
      
      const result = await contentService.getUserContent(userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Get user content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Update content
  async updateContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      const updateData = req.body;
      
      const content = await contentService.updateContent(contentId, userId, updateData);
      
      res.status(200).json({
        status: 'success',
        message: 'Content updated successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Update content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Approve content
  async approveContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      const feedback = req.body;
      
      const content = await contentService.approveContent(contentId, userId, feedback);
      
      res.status(200).json({
        status: 'success',
        message: 'Content approved successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Approve content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Reject content
  async rejectContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      const { reason } = req.body;
      
      const content = await contentService.rejectContent(contentId, userId, reason);
      
      res.status(200).json({
        status: 'success',
        message: 'Content rejected successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Reject content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Schedule content
  async scheduleContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      const { scheduledFor, timezone } = req.body;
      
      const content = await contentService.scheduleContent(contentId, userId, scheduledFor, timezone);
      
      res.status(200).json({
        status: 'success',
        message: 'Content scheduled successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Schedule content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get scheduled content
  async getScheduledContent(req, res) {
    try {
      const content = await contentService.getScheduledContent();
      
      res.status(200).json({
        status: 'success',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Get scheduled content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Archive content
  async archiveContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      
      const result = await contentService.archiveContent(contentId, userId);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Archive content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Delete content
  async deleteContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      
      const result = await contentService.deleteContent(contentId, userId);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Delete content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Duplicate content
  async duplicateContent(req, res) {
    try {
      const userId = req.user._id;
      const { contentId } = req.params;
      
      const content = await contentService.duplicateContent(contentId, userId);
      
      res.status(201).json({
        status: 'success',
        message: 'Content duplicated successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Duplicate content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get content analytics
  async getContentAnalytics(req, res) {
    try {
      const userId = req.user._id;
      const filters = req.query;
      
      const analytics = await contentService.getContentAnalytics(userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: {
          analytics
        }
      });
    } catch (error) {
      console.error('Get content analytics error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Update content analytics
  async updateContentAnalytics(req, res) {
    try {
      const { contentId } = req.params;
      const analyticsData = req.body;
      
      const content = await contentService.updateContentAnalytics(contentId, analyticsData);
      
      res.status(200).json({
        status: 'success',
        message: 'Analytics updated successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Update analytics error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get content by status
  async getContentByStatus(req, res) {
    try {
      const userId = req.user._id;
      const { status } = req.params;
      
      const content = await contentService.getContentByStatus(userId, status);
      
      res.status(200).json({
        status: 'success',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Get content by status error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get content by platform
  async getContentByPlatform(req, res) {
    try {
      const { platform } = req.params;
      const { status } = req.query;
      
      const content = await contentService.getContentByPlatform(platform, status);
      
      res.status(200).json({
        status: 'success',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Get content by platform error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new ContentController();
