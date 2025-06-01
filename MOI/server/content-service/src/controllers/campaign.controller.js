const campaignService = require('../services/campaign.service');

class CampaignController {
  // Create new campaign
  async createCampaign(req, res) {
    try {
      const userId = req.user._id;
      const campaignData = req.body;
      
      const campaign = await campaignService.createCampaign(userId, campaignData);
      
      res.status(201).json({
        status: 'success',
        message: 'Campaign created successfully',
        data: {
          campaign
        }
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get campaign by ID
  async getCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const campaign = await campaignService.getCampaignById(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          campaign
        }
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get user's campaigns
  async getUserCampaigns(req, res) {
    try {
      const userId = req.user._id;
      const filters = req.query;
      
      const result = await campaignService.getUserCampaigns(userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Get user campaigns error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Update campaign
  async updateCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      const updateData = req.body;
      
      const campaign = await campaignService.updateCampaign(campaignId, userId, updateData);
      
      res.status(200).json({
        status: 'success',
        message: 'Campaign updated successfully',
        data: {
          campaign
        }
      });
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Activate campaign
  async activateCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const campaign = await campaignService.activateCampaign(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Campaign activated successfully',
        data: {
          campaign
        }
      });
    } catch (error) {
      console.error('Activate campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Pause campaign
  async pauseCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const campaign = await campaignService.pauseCampaign(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Campaign paused successfully',
        data: {
          campaign
        }
      });
    } catch (error) {
      console.error('Pause campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Complete campaign
  async completeCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const campaign = await campaignService.completeCampaign(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Campaign completed successfully',
        data: {
          campaign
        }
      });
    } catch (error) {
      console.error('Complete campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Archive campaign
  async archiveCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const result = await campaignService.archiveCampaign(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Archive campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Delete campaign
  async deleteCampaign(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const result = await campaignService.deleteCampaign(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get campaign content
  async getCampaignContent(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      const filters = req.query;
      
      const result = await campaignService.getCampaignContent(campaignId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Get campaign content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get campaign analytics
  async getCampaignAnalytics(req, res) {
    try {
      const userId = req.user._id;
      const { campaignId } = req.params;
      
      const analytics = await campaignService.getCampaignAnalytics(campaignId, userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          analytics
        }
      });
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get active campaigns
  async getActiveCampaigns(req, res) {
    try {
      const userId = req.user._id;
      
      const campaigns = await campaignService.getActiveCampaigns(userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          campaigns
        }
      });
    } catch (error) {
      console.error('Get active campaigns error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new CampaignController();
