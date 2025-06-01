const aiService = require('../services/ai.service');

class AIController {
  // Generate content
  async generateContent(req, res) {
    try {
      const userId = req.user?._id || 'test-user-id';
      const {
        topic,
        platform,
        contentType,
        tone,
        style,
        targetAudience,
        keyPoints,
        hashtags,
        campaignId,
        variations = 1
      } = req.body;

      const generationParams = {
        topic,
        platform,
        contentType,
        tone,
        style,
        targetAudience,
        keyPoints,
        hashtags,
        variations
      };

      const content = await aiService.generateContent(userId, generationParams, campaignId);

      res.status(200).json({
        status: 'success',
        message: 'Content generated successfully',
        data: {
          content
        }
      });
    } catch (error) {
      console.error('Generate content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Improve content based on feedback
  async improveContent(req, res) {
    try {
      const { contentId } = req.params;
      const { feedback, suggestions } = req.body;

      const improvedContent = await aiService.improveContent(contentId, feedback, suggestions);

      res.status(200).json({
        status: 'success',
        message: 'Content improved successfully',
        data: {
          content: improvedContent
        }
      });
    } catch (error) {
      console.error('Improve content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Optimize content for platform
  async optimizeContent(req, res) {
    try {
      const { contentId } = req.params;
      const { targetPlatform } = req.body;

      const optimizedContent = await aiService.optimizeForPlatform(contentId, targetPlatform);

      res.status(200).json({
        status: 'success',
        message: 'Content optimized successfully',
        data: {
          content: optimizedContent
        }
      });
    } catch (error) {
      console.error('Optimize content error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Generate hashtags
  async generateHashtags(req, res) {
    try {
      const { content, platform, count = 10 } = req.body;

      const hashtags = await aiService.generateHashtags(content, platform, count);

      res.status(200).json({
        status: 'success',
        data: {
          hashtags
        }
      });
    } catch (error) {
      console.error('Generate hashtags error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Analyze content performance
  async analyzePerformance(req, res) {
    try {
      const userId = req.user._id;
      const { contentIds, timeframe = '30d' } = req.body;

      const analysis = await aiService.analyzePerformance(userId, contentIds, timeframe);

      res.status(200).json({
        status: 'success',
        data: {
          analysis
        }
      });
    } catch (error) {
      console.error('Analyze performance error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get content suggestions
  async getContentSuggestions(req, res) {
    try {
      const userId = req.user._id;
      const { platform, contentType, campaignId } = req.query;

      const suggestions = await aiService.getContentSuggestions(userId, {
        platform,
        contentType,
        campaignId
      });

      res.status(200).json({
        status: 'success',
        data: {
          suggestions
        }
      });
    } catch (error) {
      console.error('Get content suggestions error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Generate content variations
  async generateVariations(req, res) {
    try {
      const { contentId } = req.params;
      const { count = 3, platform } = req.body;

      const variations = await aiService.generateVariations(contentId, count, platform);

      res.status(200).json({
        status: 'success',
        message: 'Content variations generated successfully',
        data: {
          variations
        }
      });
    } catch (error) {
      console.error('Generate variations error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get AI insights
  async getAIInsights(req, res) {
    try {
      const userId = req.user._id;
      const { period = '30d' } = req.query;

      const insights = await aiService.getAIInsights(userId, period);

      res.status(200).json({
        status: 'success',
        data: {
          insights
        }
      });
    } catch (error) {
      console.error('Get AI insights error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Train AI with user feedback
  async trainWithFeedback(req, res) {
    try {
      const userId = req.user._id;
      const { contentId, rating, feedback, performanceData } = req.body;

      await aiService.trainWithFeedback(userId, contentId, {
        rating,
        feedback,
        performanceData
      });

      res.status(200).json({
        status: 'success',
        message: 'AI training feedback recorded successfully'
      });
    } catch (error) {
      console.error('Train with feedback error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get AI model status
  async getModelStatus(req, res) {
    try {
      const status = await aiService.getModelStatus();

      res.status(200).json({
        status: 'success',
        data: {
          modelStatus: status
        }
      });
    } catch (error) {
      console.error('Get model status error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new AIController();
