describe('Content Model Tests', () => {
  test('should define Content model', () => {
    const Content = require('../../src/models/content.model');
    expect(Content).toBeDefined();
  });

  test('should create new Content instance', () => {
    const Content = require('../../src/models/content.model');
    const mongoose = require('mongoose');
    
    const validContentData = {
      userId: new mongoose.Types.ObjectId(),
      title: 'Test Content',
      platforms: ['linkedin']
    };

    const content = new Content(validContentData);
    expect(content.title).toBe('Test Content');
    expect(content.platforms).toEqual(['linkedin']);
  });
});
