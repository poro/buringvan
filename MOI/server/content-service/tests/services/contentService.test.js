const contentService = require('../../src/services/content.service');
const Content = require('../../src/models/content.model');
const Campaign = require('../../src/models/campaign.model');
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

describe('Content Service', () => {
  let userId, campaignId;

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
    campaignId = new mongoose.Types.ObjectId();
  });

  describe('createContent', () => {
    const validContentData = {
      title: 'Test Content',
      content: {
        text: 'This is test content'
      },
      platforms: ['linkedin', 'twitter'],
      type: 'post'
    };

    test('should create content successfully', async () => {
      const result = await contentService.createContent(userId, validContentData);

      expect(result._id).toBeDefined();
      expect(result.title).toBe(validContentData.title);
      expect(result.userId.toString()).toBe(userId.toString());
      expect(result.status).toBe('draft');
      expect(result.platforms).toEqual(validContentData.platforms);
    });

    test('should create content with campaign', async () => {
      const campaign = new Campaign({
        userId,
        name: 'Test Campaign',
        description: 'Test campaign description',
        theme: 'Technology and Innovation',
        platforms: ['linkedin'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      await campaign.save();

      const contentWithCampaign = {
        ...validContentData,
        campaignId: campaign._id
      };

      const result = await contentService.createContent(userId, contentWithCampaign);

      expect(result.campaignId.toString()).toBe(campaign._id.toString());
    });

    test('should handle validation errors', async () => {
      const invalidData = {
        title: '', // Invalid empty title
        platforms: [] // Invalid empty platforms
      };

      await expect(contentService.createContent(userId, invalidData))
        .rejects.toThrow('Failed to create content');
    });
  });

  describe('getContentById', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        userId,
        title: 'Test Content',
        platforms: ['linkedin'],
        content: { text: 'Test content' }
      });
      await content.save();
    });

    test('should get content by ID', async () => {
      const result = await contentService.getContentById(content._id, userId);

      expect(result._id.toString()).toBe(content._id.toString());
      expect(result.title).toBe(content.title);
      expect(result.userId.toString()).toBe(userId.toString());
    });

    test('should throw error for non-existent content', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(contentService.getContentById(fakeId, userId))
        .rejects.toThrow('Content not found');
    });

    test('should throw error for different user content', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      
      await expect(contentService.getContentById(content._id, differentUserId))
        .rejects.toThrow('Content not found');
    });
  });

  describe('getUserContent', () => {
    beforeEach(async () => {
      // Create test content
      await Content.create([
        {
          userId,
          title: 'Content 1',
          content: { text: 'Test content 1' },
          platforms: ['linkedin'],
          status: 'draft',
          createdAt: new Date('2025-01-01')
        },
        {
          userId,
          title: 'Content 2',
          content: { text: 'Test content 2' },
          platforms: ['twitter'],
          status: 'approved',
          createdAt: new Date('2025-01-02')
        },
        {
          userId: new mongoose.Types.ObjectId(), // Different user
          title: 'Other User Content',
          content: { text: 'Other user content' },
          platforms: ['linkedin'],
          status: 'draft'
        }
      ]);
    });

    test('should get user content with pagination', async () => {
      const result = await contentService.getUserContent(userId, {
        page: 1,
        limit: 10
      });

      expect(result.content).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    test('should filter content by status', async () => {
      const result = await contentService.getUserContent(userId, {
        status: 'draft'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].status).toBe('draft');
    });

    test('should filter content by platform', async () => {
      const result = await contentService.getUserContent(userId, {
        platform: 'linkedin'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].platforms).toContain('linkedin');
    });

    test('should sort content by creation date', async () => {
      const result = await contentService.getUserContent(userId, {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[0].title).toBe('Content 2'); // More recent
      expect(result.content[1].title).toBe('Content 1');
    });
  });

  describe('updateContent', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        userId,
        title: 'Original Title',
        content: { text: 'Original content' },
        platforms: ['linkedin']
      });
      await content.save();
    });

    test('should update content successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        content: { text: 'Updated content' }
      };

      const result = await contentService.updateContent(content._id, userId, updateData);

      expect(result.title).toBe('Updated Title');
      expect(result.content.text).toBe('Updated content');
      expect(result.updatedAt).toBeDefined();
    });

    test('should throw error for non-existent content', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(contentService.updateContent(fakeId, userId, { title: 'New Title' }))
        .rejects.toThrow('Content not found');
    });
  });

  describe('approveContent', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        userId,
        title: 'Test Content',
        content: { text: 'Test content' },
        platforms: ['linkedin'],
        status: 'pending_approval'
      });
      await content.save();
    });

    test('should approve content successfully', async () => {
      const feedback = {
        rating: 5,
        comments: 'Content looks good!'
      };

      const result = await contentService.approveContent(content._id, userId, feedback);

      expect(result.status).toBe('approved');
      expect(result.userFeedback.rating).toBe(5);
      expect(result.userFeedback.comments).toBe('Content looks good!');
      expect(result.userFeedback.approved).toBe(true);
      expect(result.userFeedback.approvedAt).toBeDefined();
    });

    test('should not approve already approved content', async () => {
      // First approve the content
      await content.approve();

      await expect(contentService.approveContent(content._id, userId))
        .rejects.toThrow('Content is not in a state that can be approved');
    });

    test('should handle non-existent content', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(contentService.approveContent(fakeId, userId))
        .rejects.toThrow('Content not found');
    });
  });

  describe('rejectContent', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        userId,
        title: 'Test Content',
        content: { text: 'Test content' },
        platforms: ['linkedin'],
        status: 'pending_approval'
      });
      await content.save();
    });

    test('should reject content successfully', async () => {
      const reason = 'Content needs revision';
      
      const result = await contentService.rejectContent(content._id, userId, reason);

      expect(result.status).toBe('draft');
      expect(result.userFeedback.approved).toBe(false);
      expect(result.userFeedback.rejectionReason).toBe(reason);
    });
  });

  describe('scheduleContent', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        userId,
        title: 'Test Content',
        content: { text: 'Test content' },
        platforms: ['linkedin'],
        status: 'approved'
      });
      await content.save();
    });

    test('should schedule content successfully', async () => {
      const scheduleDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const timezone = 'America/New_York';
      
      const result = await contentService.scheduleContent(
        content._id, 
        userId, 
        scheduleDate, 
        timezone
      );

      expect(result.status).toBe('scheduled');
      expect(result.scheduledFor).toEqual(scheduleDate);
      expect(result.timezone).toBe(timezone);
    });

    test('should not schedule unapproved content', async () => {
      content.status = 'draft';
      await content.save();

      const scheduleDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await expect(contentService.scheduleContent(content._id, userId, scheduleDate))
        .rejects.toThrow('Content must be approved before scheduling');
    });
  });

  describe('archiveContent', () => {
    let content;

    beforeEach(async () => {
      content = new Content({
        userId,
        title: 'Test Content',
        content: { text: 'Test content' },
        platforms: ['linkedin']
      });
      await content.save();
    });

    test('should archive content successfully', async () => {
      const result = await contentService.archiveContent(content._id, userId);

      expect(result.message).toBe('Content archived successfully');
    });
  });

  describe('getContentByStatus', () => {
    beforeEach(async () => {
      await Content.create([
        {
          userId,
          title: 'Draft Content',
          content: { text: 'Draft content' },
          platforms: ['linkedin'],
          status: 'draft'
        },
        {
          userId,
          title: 'Approved Content',
          content: { text: 'Approved content' },
          platforms: ['twitter'],
          status: 'approved'
        }
      ]);
    });

    test('should get content by status', async () => {
      const draftContent = await contentService.getContentByStatus(userId, 'draft');
      const approvedContent = await contentService.getContentByStatus(userId, 'approved');

      expect(draftContent).toHaveLength(1);
      expect(draftContent[0].status).toBe('draft');
      
      expect(approvedContent).toHaveLength(1);
      expect(approvedContent[0].status).toBe('approved');
    });
  });

  describe('getContentByPlatform', () => {
    beforeEach(async () => {
      await Content.create([
        {
          userId,
          title: 'LinkedIn Content',
          content: { text: 'LinkedIn content' },
          platforms: ['linkedin'],
          status: 'draft'
        },
        {
          userId,
          title: 'Multi-platform Content',
          content: { text: 'Multi-platform content' },
          platforms: ['linkedin', 'twitter'],
          status: 'approved'
        }
      ]);
    });

    test('should get content by platform', async () => {
      const linkedinContent = await contentService.getContentByPlatform('linkedin');
      const twitterContent = await contentService.getContentByPlatform('twitter');

      expect(linkedinContent).toHaveLength(2);
      expect(linkedinContent.every(content => content.platforms.includes('linkedin'))).toBe(true);
      
      expect(twitterContent).toHaveLength(1);
      expect(twitterContent[0].platforms).toContain('twitter');
    });

    test('should filter content by platform and status', async () => {
      const linkedinDraft = await contentService.getContentByPlatform('linkedin', 'draft');

      expect(linkedinDraft).toHaveLength(1);
      expect(linkedinDraft[0].status).toBe('draft');
      expect(linkedinDraft[0].platforms).toContain('linkedin');
    });
  });
});
