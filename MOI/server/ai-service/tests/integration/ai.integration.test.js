// Set test environment before any imports
process.env.NODE_ENV = 'test';

// Mock Redis module first
jest.mock('redis', () => {
  const mockRedis = {
    connect: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    setEx: jest.fn(),
    flushall: jest.fn().mockResolvedValue(),
    quit: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
    on: jest.fn()
  };
  return {
    createClient: jest.fn().mockReturnValue(mockRedis)
  };
});

const request = require('supertest');
const mongoose = require('mongoose');
const Redis = require('redis');
const app = require('../../src/app');
const { LearningModel, ModelWeights } = require('../../src/models/learning.model');
const redis = require('../../src/config/redis');

// Get the mock Redis instance
const mockRedis = Redis.createClient();

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(),
  connection: {
    close: jest.fn().mockResolvedValue(),
    on: jest.fn()
  },
  Types: {
    ObjectId: jest.fn(() => '507f1f77bcf86cd799439011')
  }
}));

// Mock LearningModel and ModelWeights
jest.mock('../../src/models/learning.model', () => ({
  LearningModel: {
    deleteMany: jest.fn().mockResolvedValue(),
    create: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' }),
    findById: jest.fn().mockResolvedValue({ feedback: 'This content was excellent and very helpful!' }),
    findOne: jest.fn().mockResolvedValue({ engagement: 1.2 })
  },
  ModelWeights: {
    deleteMany: jest.fn().mockResolvedValue(),
    findOne: jest.fn().mockResolvedValue({ engagement: 1.2 })
  }
}));

describe('AI Service Integration Tests', () => {
  let server;
  const authToken = 'test-token';

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-service-test');
    
    // Start server on random port
    server = app.listen(0);
  });

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset Redis mock
    mockRedis.get.mockReset();
    mockRedis.setEx.mockReset();
    mockRedis.flushall.mockReset();
    
    // Mock successful Redis operations
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setEx.mockResolvedValue('OK');
    
    // Clear database
    await LearningModel.deleteMany({});
    await ModelWeights.deleteMany({});
    await redis.flushall();
  });

  afterAll(async () => {
    // Close server and database connection
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
    await mockRedis.quit();
  });

  describe('POST /api/ai/train/feedback', () => {
    it('should process feedback and update model weights', async () => {
      const feedbackData = {
        contentId: new mongoose.Types.ObjectId(),
        feedback: 'This content was excellent and very helpful!',
        metrics: {
          engagement: 85,
          reach: 1200,
          clicks: 180
        },
        platform: 'linkedin'
      };

      const response = await request(app)
        .post('/api/ai/train/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(feedbackData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.learningRecord).toHaveProperty('_id');

      const learningRecord = await LearningModel.findById(response.body.learningRecord._id);
      expect(learningRecord).toBeTruthy();
      expect(learningRecord.feedback).toBe(feedbackData.feedback);

      const weights = await ModelWeights.findOne().sort({ lastUpdated: -1 });
      expect(weights).toBeTruthy();
      expect(weights.engagement).toBeGreaterThan(1.0);
    });

    it('should handle invalid feedback data', async () => {
      const invalidData = {
        contentId: 'invalid-id',
        feedback: '',
        metrics: {
          engagement: -1,
          reach: 0,
          clicks: 0
        },
        platform: 'invalid-platform'
      };

      const response = await request(app)
        .post('/api/ai/train/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/ai/model/status', () => {
    it('should return model status with weights and stats', async () => {
      await LearningModel.create({
        contentId: new mongoose.Types.ObjectId(),
        feedback: 'Great content!',
        metrics: { engagement: 80, reach: 1000, clicks: 150 },
        platform: 'twitter'
      });

      const response = await request(app)
        .get('/api/ai/model/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('weights');
      expect(response.body).toHaveProperty('trainingStats');
      expect(response.body.weights).toHaveProperty('engagement');
      expect(response.body.weights).toHaveProperty('relevance');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/ai/model/status');

      expect(response.status).toBe(401);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache model weights and serve from cache', async () => {
      const response1 = await request(app)
        .get('/api/ai/model/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(200);

      const cachedWeights = await redis.get('model_weights');
      expect(cachedWeights).toBeTruthy();

      const response2 = await request(app)
        .get('/api/ai/model/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/ai/model/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();

      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ai-service-test');
    });

    it('should handle Redis connection errors', async () => {
      await mockRedis.quit();

      const response = await request(app)
        .get('/api/ai/model/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'active');

      await mockRedis.connect();
    });
  });
}); 