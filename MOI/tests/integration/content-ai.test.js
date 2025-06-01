const request = require('supertest');
const contentApp = require('../../server/content-service/src/app');
const aiApp = require('../../server/ai-service/src/app');
const nock = require('nock');
const jwt = require('jsonwebtoken');

describe('Content-AI Integration', () => {
  let authToken;
  let userId;

  beforeEach(() => {
    // Create mock auth token
    userId = 'test-user-id';
    authToken = jwt.sign(
      { userId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Clear all nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('AI Content Generation Integration', () => {
    it('should generate content using AI service', async () => {
      // Mock AI service response
      const mockAIResponse = {
        success: true,
        content: {
          title: 'AI Generated: Future of Technology',
          content: 'The future of technology is bright with AI innovations leading the way.',
          hashtags: ['#AI', '#Technology', '#Innovation'],
          platforms: ['linkedin']
        }
      };

      nock(process.env.AI_SERVICE_URL || 'http://localhost:3004')
        .post('/api/ai/generate-content')
        .reply(200, mockAIResponse);

      const generateRequest = {
        prompt: 'Generate content about the future of technology',
        platforms: ['linkedin'],
        tone: 'professional',
        audience: 'business'
      };

      const response = await request(contentApp)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.content.title).toBe('AI Generated: Future of Technology');
      expect(response.body.content.aiGenerated).toBe(true);
      expect(response.body.content.userId).toBe(userId);
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock AI service error
      nock(process.env.AI_SERVICE_URL || 'http://localhost:3004')
        .post('/api/ai/generate-content')
        .reply(500, { success: false, message: 'AI service error' });

      const generateRequest = {
        prompt: 'Generate content',
        platforms: ['linkedin']
      };

      const response = await request(contentApp)
        .post('/api/content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(generateRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('AI content generation failed');
    });

    it('should optimize existing content using AI', async () => {
      // First create content
      const contentData = {
        title: 'Original Content',
        content: 'This is original content that needs optimization',
        platforms: ['linkedin']
      };

      const createResponse = await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentData)
        .expect(201);

      const contentId = createResponse.body.content.id;

      // Mock AI optimization response
      const mockOptimizeResponse = {
        success: true,
        optimizedContent: {
          title: 'Optimized: Revolutionary Content Strategies',
          content: 'This is optimized content with enhanced engagement potential and clear call-to-action.',
          hashtags: ['#ContentStrategy', '#Optimization'],
          improvements: [
            'Enhanced title for better engagement',
            'Added compelling call-to-action',
            'Improved readability and flow'
          ]
        }
      };

      nock(process.env.AI_SERVICE_URL || 'http://localhost:3004')
        .post('/api/ai/optimize-content')
        .reply(200, mockOptimizeResponse);

      const optimizeRequest = {
        focus: 'engagement',
        platform: 'linkedin'
      };

      const response = await request(contentApp)
        .post(`/api/content/${contentId}/optimize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(optimizeRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.optimizedContent.title).toContain('Optimized');
      expect(response.body.optimizedContent.improvements).toBeDefined();
    });
  });

  describe('AI Hashtag Generation', () => {
    it('should generate hashtags for content', async () => {
      const mockHashtagResponse = {
        success: true,
        hashtags: ['#Technology', '#Innovation', '#AI', '#Future', '#Business'],
        categorized: {
          trending: ['#AI', '#Technology'],
          niche: ['#Innovation'],
          broad: ['#Business', '#Future']
        }
      };

      nock(process.env.AI_SERVICE_URL || 'http://localhost:3004')
        .post('/api/ai/generate-hashtags')
        .reply(200, mockHashtagResponse);

      const hashtagRequest = {
        content: 'Exploring the future of artificial intelligence in business',
        platform: 'linkedin'
      };

      const response = await request(aiApp)
        .post('/api/ai/generate-hashtags')
        .set('Authorization', `Bearer ${authToken}`)
        .send(hashtagRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hashtags).toHaveLength(5);
      expect(response.body.categorized.trending).toContain('#AI');
    });
  });

  describe('Performance Analysis Integration', () => {
    it('should analyze content performance using AI', async () => {
      // Create content with metrics
      const contentData = {
        title: 'Performance Test Content',
        content: 'Content for performance analysis',
        platforms: ['linkedin'],
        engagementMetrics: {
          likes: 150,
          shares: 25,
          comments: 10,
          views: 1000
        }
      };

      const createResponse = await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentData)
        .expect(201);

      const contentId = createResponse.body.content.id;

      // Mock AI analysis response
      const mockAnalysisResponse = {
        success: true,
        analysis: {
          performanceScore: 8.5,
          insights: [
            'High engagement rate indicates strong audience connection',
            'Content length is optimal for LinkedIn',
            'Professional tone resonates well with business audience'
          ],
          recommendations: [
            'Post similar content during peak hours',
            'Consider creating a series on this topic',
            'Add more visual elements for better performance'
          ],
          benchmarks: {
            industry: 'above average',
            historical: 'significant improvement'
          }
        }
      };

      nock(process.env.AI_SERVICE_URL || 'http://localhost:3004')
        .post('/api/ai/analyze-performance')
        .reply(200, mockAnalysisResponse);

      const response = await request(contentApp)
        .get(`/api/content/${contentId}/analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analysis.performanceScore).toBe(8.5);
      expect(response.body.analysis.insights).toHaveLength(3);
      expect(response.body.analysis.recommendations).toHaveLength(3);
    });
  });

  describe('Learning Integration', () => {
    it('should provide learning insights based on user content history', async () => {
      // Create multiple content pieces to build history
      const contentPieces = [
        {
          title: 'Business Content 1',
          content: 'Professional business content',
          platforms: ['linkedin'],
          status: 'published',
          engagementMetrics: { likes: 100, shares: 20 }
        },
        {
          title: 'Tech Content 1',
          content: 'Technical content about AI',
          platforms: ['linkedin'],
          status: 'published',
          engagementMetrics: { likes: 80, shares: 15 }
        },
        {
          title: 'Casual Content 1',
          content: 'Casual social content',
          platforms: ['twitter'],
          status: 'rejected'
        }
      ];

      // Create content pieces
      for (const content of contentPieces) {
        await request(contentApp)
          .post('/api/content')
          .set('Authorization', `Bearer ${authToken}`)
          .send(content);
      }

      // Mock AI learning insights response
      const mockLearningResponse = {
        success: true,
        insights: {
          patterns: [
            'Business-focused content performs 25% better than casual content',
            'LinkedIn generates higher engagement than Twitter',
            'Professional tone increases approval rates by 40%'
          ],
          preferences: {
            preferredTopics: ['business', 'technology'],
            preferredTone: 'professional',
            optimalLength: '150-300 words',
            bestPerformingPlatforms: ['linkedin']
          },
          recommendations: [
            'Focus on business and technology topics',
            'Maintain professional tone for better approval rates',
            'Prioritize LinkedIn for content distribution'
          ]
        }
      };

      nock(process.env.AI_SERVICE_URL || 'http://localhost:3004')
        .post('/api/ai/learning-insights')
        .reply(200, mockLearningResponse);

      const response = await request(contentApp)
        .get('/api/content/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.insights.patterns).toHaveLength(3);
      expect(response.body.insights.preferences.preferredTopics).toContain('business');
      expect(response.body.insights.recommendations).toHaveLength(3);
    });
  });
});
