const OpenAI = require('openai');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { LearningModel } = require('../models/learning.model');

class LearningService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.modelVersion = process.env.AI_MODEL_VERSION || 'gpt-4';
    this.cacheTTL = 3600; // 1 hour cache
  }

  async trainWithFeedback(feedbackData) {
    try {
      const { contentId, feedback, metrics, platform } = feedbackData;

      // Store feedback in database
      const learningRecord = await LearningModel.create({
        contentId,
        feedback,
        metrics,
        platform,
        timestamp: new Date()
      });

      // Update model weights based on feedback
      await this.updateModelWeights(learningRecord);

      // Cache the updated weights
      await this.cacheModelWeights();

      return {
        success: true,
        message: 'Feedback processed successfully',
        learningRecord
      };
    } catch (error) {
      logger.error('Error in trainWithFeedback:', error);
      throw error;
    }
  }

  async updateModelWeights(learningRecord) {
    try {
      // Get current weights from cache or database
      const currentWeights = await this.getModelWeights();

      // Calculate new weights based on feedback
      const newWeights = await this.calculateNewWeights(currentWeights, learningRecord);

      // Update weights in database
      await LearningModel.updateWeights(newWeights);

      return newWeights;
    } catch (error) {
      logger.error('Error in updateModelWeights:', error);
      throw error;
    }
  }

  async calculateNewWeights(currentWeights, learningRecord) {
    // Implement weight adjustment logic based on feedback
    // This is a simplified example - in production, you'd want more sophisticated logic
    const feedbackScore = this.calculateFeedbackScore(learningRecord.feedback);
    const metricsScore = this.calculateMetricsScore(learningRecord.metrics);

    return {
      ...currentWeights,
      engagement: currentWeights.engagement * (1 + feedbackScore * 0.1),
      relevance: currentWeights.relevance * (1 + metricsScore * 0.1),
      lastUpdated: new Date()
    };
  }

  calculateFeedbackScore(feedback) {
    // Implement feedback scoring logic
    // This is a simplified example
    const positiveKeywords = ['good', 'great', 'excellent', 'helpful'];
    const negativeKeywords = ['bad', 'poor', 'unhelpful', 'irrelevant'];

    let score = 0;
    const feedbackLower = feedback.toLowerCase();

    positiveKeywords.forEach(keyword => {
      if (feedbackLower.includes(keyword)) score += 1;
    });

    negativeKeywords.forEach(keyword => {
      if (feedbackLower.includes(keyword)) score -= 1;
    });

    return score / (positiveKeywords.length + negativeKeywords.length);
  }

  calculateMetricsScore(metrics) {
    // Implement metrics scoring logic
    // This is a simplified example
    const { engagement, reach, clicks } = metrics;
    return (engagement * 0.4 + reach * 0.3 + clicks * 0.3) / 100;
  }

  async getModelWeights() {
    try {
      // Try to get from cache first
      const cachedWeights = await redis.get('model_weights');
      if (cachedWeights) {
        return JSON.parse(cachedWeights);
      }

      // If not in cache, get from database
      const weights = await LearningModel.getLatestWeights();
      
      // Cache the weights
      await this.cacheModelWeights(weights);

      return weights;
    } catch (error) {
      logger.error('Error in getModelWeights:', error);
      throw error;
    }
  }

  async cacheModelWeights(weights) {
    try {
      await redis.setEx('model_weights', this.cacheTTL, JSON.stringify(weights));
    } catch (error) {
      logger.error('Error in cacheModelWeights:', error);
      // Don't throw error here as caching is not critical
    }
  }

  async getModelStatus() {
    try {
      const weights = await this.getModelWeights();
      const trainingStats = await LearningModel.getTrainingStats();

      return {
        status: 'active',
        version: this.modelVersion,
        lastUpdated: weights.lastUpdated,
        trainingStats,
        weights: {
          engagement: weights.engagement,
          relevance: weights.relevance
        }
      };
    } catch (error) {
      logger.error('Error in getModelStatus:', error);
      throw error;
    }
  }
}

module.exports = new LearningService(); 