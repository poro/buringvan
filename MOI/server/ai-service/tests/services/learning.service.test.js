const { expect } = require('chai');
const sinon = require('sinon');
const learningService = require('../../src/services/learning.service');
const { LearningModel, ModelWeights } = require('../../src/models/learning.model');
const redis = require('../../src/config/redis');

// Mock Redis methods
jest.mock('../../src/config/redis', () => ({
  connect: jest.fn().mockResolvedValue(),
  get: jest.fn(),
  setEx: jest.fn(),
  setex: jest.fn(),
  quit: jest.fn().mockResolvedValue(),
  flushall: jest.fn().mockResolvedValue()
}));

// Mock LearningModel.getTrainingStats
LearningModel.getTrainingStats = jest.fn().mockResolvedValue({
  totalSamples: 100,
  accuracy: 0.85
});

describe('Learning Service', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('trainWithFeedback', () => {
    it('should process feedback and update model weights', async () => {
      const feedbackData = {
        contentId: '507f1f77bcf86cd799439011',
        feedback: 'This content was great and very helpful!',
        metrics: {
          engagement: 80,
          reach: 1000,
          clicks: 150
        },
        platform: 'linkedin'
      };

      const createStub = sandbox.stub(LearningModel, 'create').resolves({
        _id: '507f1f77bcf86cd799439012',
        ...feedbackData
      });

      const updateWeightsStub = sandbox.stub(LearningModel, 'updateWeights').resolves({
        engagement: 1.1,
        relevance: 1.05,
        lastUpdated: new Date()
      });

      const result = await learningService.trainWithFeedback(feedbackData);

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Feedback processed successfully');
      expect(result.learningRecord).to.have.property('_id');
      expect(createStub.calledOnce).to.be.true;
      expect(updateWeightsStub.calledOnce).to.be.true;
    });

    it('should handle errors during feedback processing', async () => {
      const feedbackData = {
        contentId: '507f1f77bcf86cd799439011',
        feedback: 'Test feedback',
        metrics: {
          engagement: 50,
          reach: 500,
          clicks: 75
        },
        platform: 'twitter'
      };

      sandbox.stub(LearningModel, 'create').rejects(new Error('Database error'));

      try {
        await learningService.trainWithFeedback(feedbackData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Database error');
      }
    });
  });

  describe('getModelWeights', () => {
    it('should return cached weights if available', async () => {
      const cachedWeights = {
        engagement: 1.2,
        relevance: 1.1,
        lastUpdated: new Date().toISOString()
      };

      sandbox.stub(redis, 'get').resolves(JSON.stringify(cachedWeights));

      const weights = await learningService.getModelWeights();

      expect(weights).to.deep.equal(cachedWeights);
    });

    it('should fetch from database if cache miss', async () => {
      const dbWeights = {
        engagement: 1.2,
        relevance: 1.1,
        lastUpdated: new Date().toISOString()
      };

      sandbox.stub(redis, 'get').resolves(null);
      sandbox.stub(ModelWeights, 'getLatestWeights').resolves(dbWeights);
      sandbox.stub(redis, 'setEx').resolves();

      const weights = await learningService.getModelWeights();
      expect(weights.engagement).to.equal(dbWeights.engagement);
      expect(weights.relevance).to.equal(dbWeights.relevance);
      expect(weights.lastUpdated).to.be.a('string');
    });
  });

  describe('calculateFeedbackScore', () => {
    it('should return positive score for positive feedback', () => {
      const feedback = 'This content was excellent and very helpful!';
      const score = learningService.calculateFeedbackScore(feedback);
      expect(score).to.be.greaterThan(0);
    });

    it('should return negative score for negative feedback', () => {
      const feedback = 'This content was bad and irrelevant';
      const score = learningService.calculateFeedbackScore(feedback);
      expect(score).to.be.lessThan(0);
    });

    it('should return neutral score for mixed feedback', () => {
      const feedback = 'The content was good but could be more helpful';
      const score = learningService.calculateFeedbackScore(feedback);
      expect(score).to.be.a('number');
    });
  });

  describe('calculateMetricsScore', () => {
    it('should calculate correct score from metrics', () => {
      const metrics = {
        engagement: 80,
        reach: 1000,
        clicks: 150
      };

      const score = learningService.calculateMetricsScore(metrics);
      expect(score).to.be.a('number');
      expect(score).to.equal(3.77);
    });

    it('should handle zero metrics', () => {
      const metrics = {
        engagement: 0,
        reach: 0,
        clicks: 0
      };

      const score = learningService.calculateMetricsScore(metrics);
      expect(score).to.equal(0);
    });
  });

  describe('getModelStatus', () => {
    it('should return complete model status', async () => {
      const weights = {
        engagement: 1.2,
        relevance: 1.1,
        lastUpdated: new Date().toISOString()
      };

      const trainingStats = {
        avgEngagement: 1.15,
        avgRelevance: 1.08,
        totalUpdates: 100
      };

      sandbox.stub(learningService, 'getModelWeights').resolves(weights);
      sandbox.stub(ModelWeights, 'getTrainingStats').resolves(trainingStats);

      const status = await learningService.getModelStatus();

      expect(status).to.have.property('status', 'active');
      expect(status).to.have.property('version');
      expect(status).to.have.property('lastUpdated');
      expect(status).to.have.property('trainingStats');
      expect(status).to.have.property('weights');
      expect(status.weights).to.have.property('engagement');
      expect(status.weights).to.have.property('relevance');
    });
  });
}); 