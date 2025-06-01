const Content = require('../../src/models/content.model');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Content Model', () => {
  const validContentData = {
    userId: new mongoose.Types.ObjectId(),
    title: 'Test Content',
    type: 'post',
    platforms: ['linkedin', 'twitter'],
    content: {
      text: 'This is test content for our social media platforms',
      hashtags: ['#test', '#content'],
      mentions: ['@testuser'],
      links: [{
        url: 'https://example.com',
        title: 'Example Link',
        description: 'Test link description'
      }]
    },
    media: [{
      type: 'image',
      url: 'https://example.com/image.jpg',
      filename: 'test-image.jpg',
      size: 1024000,
      dimensions: {
        width: 1920,
        height: 1080
      },
      altText: 'Test image',
      isProcessed: true
    }],
    status: 'draft',
    aiGenerated: true,
    originalPrompt: 'Create a test content piece',
    aiMetadata: {
      model: 'gpt-4',
      temperature: 0.7,
      tokens: 150,
      generatedAt: new Date(),
      version: '1.0'
    }
  };

  describe('Content Creation', () => {
    it('should create content with valid data', async () => {
      const content = new Content(validContentData);
      const savedContent = await content.save();

      expect(savedContent.title).toBe(validContentData.title);
      expect(savedContent.type).toBe(validContentData.type);
      expect(savedContent.platforms).toEqual(validContentData.platforms);
      expect(savedContent.status).toBe(validContentData.status);
      expect(savedContent.aiGenerated).toBe(validContentData.aiGenerated);
      expect(savedContent._id).toBeDefined();
      expect(savedContent.createdAt).toBeDefined();
      expect(savedContent.updatedAt).toBeDefined();
    });

    it('should set default values correctly', async () => {
      const minimalData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Minimal Test Content',
        platforms: ['linkedin']
      };

      const content = new Content(minimalData);
      const savedContent = await content.save();

      expect(savedContent.status).toBe('draft');
      expect(savedContent.type).toBe('post');
      expect(savedContent.aiGenerated).toBe(false);
      expect(savedContent.analytics.likes).toBe(0);
      expect(savedContent.analytics.shares).toBe(0);
      expect(savedContent.analytics.comments).toBe(0);
      expect(savedContent.analytics.views).toBe(0);
      expect(savedContent.priority).toBe('medium');
      expect(savedContent.timezone).toBe('UTC');
      expect(savedContent.isArchived).toBe(false);
      expect(savedContent.isRecurring).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {};
      const content = new Content(invalidData);

      await expect(content.save()).rejects.toThrow(/validation failed/);
    });

    it('should validate platform enum values', async () => {
      const invalidPlatformData = {
        ...validContentData,
        platforms: ['invalid_platform']
      };

      const content = new Content(invalidPlatformData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const invalidStatusData = {
        ...validContentData,
        status: 'invalid_status'
      };

      const content = new Content(invalidStatusData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should validate content type enum values', async () => {
      const invalidTypeData = {
        ...validContentData,
        type: 'invalid_type'
      };

      const content = new Content(invalidTypeData);
      
      await expect(content.save()).rejects.toThrow();
    });

    it('should validate hashtag format', async () => {
      const invalidHashtagData = {
        ...validContentData,
        content: {
          ...validContentData.content,
          hashtags: ['invalid-hashtag', '#valid']
        }
      };

      const content = new Content(invalidHashtagData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should validate mention format', async () => {
      const invalidMentionData = {
        ...validContentData,
        content: {
          ...validContentData.content,
          mentions: ['invalid-mention', '@valid']
        }
      };

      const content = new Content(invalidMentionData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should validate URL format in links', async () => {
      const invalidUrlData = {
        ...validContentData,
        content: {
          ...validContentData.content,
          links: [{
            url: 'invalid-url',
            title: 'Invalid Link'
          }]
        }
      };

      const content = new Content(invalidUrlData);
      await expect(content.save()).rejects.toThrow();
    });
  });

  describe('Content Virtual Properties', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        ...validContentData,
        analytics: {
          likes: 50,
          comments: 20,
          shares: 30,
          impressions: 1000,
          views: 800
        }
      });
      await content.save();
    });

    it('should calculate engagement rate correctly', () => {
      expect(content.engagementRate).toBe(10); // (100/1000)*100
    });

    it('should calculate total interactions correctly', () => {
      expect(content.totalInteractions).toBe(100); // 50+20+30
    });

    it('should handle zero impressions for engagement rate', async () => {
      content.analytics.impressions = 0;
      await content.save();
      expect(content.engagementRate).toBe(0);
    });
  });

  describe('Content Instance Methods', () => {
    let content;

    beforeEach(async () => {
      content = new Content(validContentData);
      await content.save();
    });

    it('should approve content', async () => {
      await content.approve();
      
      expect(content.status).toBe('approved');
      expect(content.userFeedback.approved).toBe(true);
      expect(content.userFeedback.approvedAt).toBeDefined();
    });

    it('should reject content with reason', async () => {
      const reason = 'Content needs revision';
      await content.reject(reason);
      
      expect(content.status).toBe('draft');
      expect(content.userFeedback.approved).toBe(false);
      expect(content.userFeedback.rejectionReason).toBe(reason);
    });

    it('should schedule content', async () => {
      const scheduleDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const timezone = 'America/New_York';
      
      await content.schedule(scheduleDate, timezone);
      
      expect(content.status).toBe('scheduled');
      expect(content.scheduledFor).toEqual(scheduleDate);
      expect(content.timezone).toBe(timezone);
    });

    it('should archive content', async () => {
      await content.archive();
      
      expect(content.isArchived).toBe(true);
      expect(content.archivedAt).toBeDefined();
    });
  });

  describe('Content Static Methods', () => {
    let userId1, userId2;

    beforeEach(async () => {
      // Clear existing data
      await Content.deleteMany({});

      userId1 = new mongoose.Types.ObjectId();
      userId2 = new mongoose.Types.ObjectId();

      // Create test content
      const testContents = [
        {
          userId: userId1,
          title: 'Draft Content 1',
          platforms: ['linkedin'],
          status: 'draft',
          aiGenerated: false
        },
        {
          userId: userId1,
          title: 'Published Content 1',
          platforms: ['twitter'],
          status: 'published',
          aiGenerated: true
        },
        {
          userId: userId2,
          title: 'Draft Content 2',
          platforms: ['linkedin', 'twitter'],
          status: 'draft',
          aiGenerated: false
        },
        {
          userId: userId1,
          title: 'Scheduled Content',
          platforms: ['instagram'],
          status: 'scheduled',
          scheduledFor: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          aiGenerated: false
        }
      ];

      await Content.insertMany(testContents);
    });

    it('should find content by user', async () => {
      const results = await Content.findByUser(userId1);

      expect(results).toHaveLength(3);
      expect(results.every(content => content.userId.equals(userId1))).toBe(true);
    });

    it('should find content by user and status', async () => {
      const results = await Content.findByUser(userId1, 'draft');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Draft Content 1');
    });

    it('should find scheduled content ready for publishing', async () => {
      const results = await Content.findScheduled();

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Scheduled Content');
    });

    it('should find content by platform', async () => {
      const results = await Content.findByPlatform('linkedin');

      expect(results).toHaveLength(2);
      expect(results.every(content => content.platforms.includes('linkedin'))).toBe(true);
    });

    it('should find content by platform and status', async () => {
      const results = await Content.findByPlatform('linkedin', 'draft');

      expect(results).toHaveLength(2);
      expect(results.every(content => 
        content.platforms.includes('linkedin') && content.status === 'draft'
      )).toBe(true);
    });
  });

  describe('Content Pre-save Middleware', () => {
    it('should update engagement score on save', async () => {
      const content = new Content({
        ...validContentData,
        analytics: {
          likes: 10,
          comments: 5,
          shares: 3
        }
      });

      await content.save();
      expect(content.analytics.engagement).toBe(18); // 10+5+3
    });

    it('should set publishedAt when status changes to published', async () => {
      const content = new Content(validContentData);
      await content.save();

      expect(content.publishedAt).toBeUndefined();

      content.status = 'published';
      await content.save();

      expect(content.publishedAt).toBeDefined();
    });

    it('should set archivedAt when archived', async () => {
      const content = new Content(validContentData);
      await content.save();

      expect(content.archivedAt).toBeUndefined();

      content.isArchived = true;
      await content.save();

      expect(content.archivedAt).toBeDefined();
    });
  });

  describe('Content Validation Edge Cases', () => {
    it('should enforce title length limit', async () => {
      const longTitleData = {
        ...validContentData,
        title: 'a'.repeat(201) // Exceeds 200 character limit
      };

      const content = new Content(longTitleData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should enforce content text length limit', async () => {
      const longContentData = {
        ...validContentData,
        content: {
          text: 'a'.repeat(5001) // Exceeds 5000 character limit
        }
      };

      const content = new Content(longContentData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should enforce alt text length limit', async () => {
      const longAltTextData = {
        ...validContentData,
        media: [{
          type: 'image',
          url: 'https://example.com/image.jpg',
          altText: 'a'.repeat(501) // Exceeds 500 character limit
        }]
      };

      const content = new Content(longAltTextData);
      await expect(content.save()).rejects.toThrow();
    });

    it('should validate user feedback rating range', async () => {
      const invalidRatingData = {
        ...validContentData,
        userFeedback: {
          rating: 6 // Exceeds max of 5
        }
      };

      const content = new Content(invalidRatingData);
      await expect(content.save()).rejects.toThrow();
    });
  });
});
