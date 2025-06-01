const Content = require('../../src/models/content.model');

describe('Content Model - Basic Database Tests', () => {
  const validContentData = {
    userId: '507f1f77bcf86cd799439011',
    title: 'Test Content',
    type: 'post',
    platforms: ['instagram'],
    content: {
      text: 'This is test content'
    }
  };

  it('should create a content instance with required fields', () => {
    const content = new Content(validContentData);
    
    expect(content.userId.toString()).toBe('507f1f77bcf86cd799439011');
    expect(content.title).toBe('Test Content');
    expect(content.type).toBe('post');
    expect(content.platforms).toContain('instagram');
    expect(content.content.text).toBe('This is test content');
    expect(content.status).toBe('draft'); // Default value
  });

  it('should validate required fields', () => {
    const content = new Content();
    const validationError = content.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError.errors.userId).toBeDefined();
    expect(validationError.errors.platforms).toBeDefined();
  });

  it('should have correct default values', () => {
    const content = new Content({
      userId: '507f1f77bcf86cd799439011',
      platforms: ['instagram'],
      content: { text: 'Test' }
    });

    expect(content.status).toBe('draft');
    expect(content.type).toBe('post');
    expect(content.aiGenerated).toBe(false);
    expect(content.isArchived).toBe(false);
    expect(content.analytics.likes).toBe(0);
    expect(content.analytics.shares).toBe(0);
    expect(content.analytics.comments).toBe(0);
    expect(content.analytics.views).toBe(0);
  });

  it('should validate platform enum values', () => {
    const content = new Content({
      ...validContentData,
      platforms: ['invalid_platform']
    });

    const validationError = content.validateSync();
    expect(validationError).toBeDefined();
  });

  it('should validate status enum values', () => {
    const content = new Content({
      ...validContentData,
      status: 'invalid_status'
    });

    const validationError = content.validateSync();
    expect(validationError).toBeDefined();
  });

  it('should calculate virtual properties correctly', () => {
    const content = new Content({
      ...validContentData,
      analytics: {
        likes: 50,
        comments: 20,
        shares: 30,
        impressions: 1000,
        views: 800
      }
    });

    expect(content.engagementRate).toBe(10); // (100/1000)*100
    expect(content.totalInteractions).toBe(100); // 50+20+30
  });

  it('should handle zero impressions for engagement rate', () => {
    const content = new Content({
      ...validContentData,
      analytics: {
        likes: 50,
        comments: 20,
        shares: 30,
        impressions: 0,
        views: 800
      }
    });

    expect(content.engagementRate).toBe(0);
  });
});
