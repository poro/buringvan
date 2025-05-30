/**
 * tests/notion.test.js
 * Tests for Notion API integration
 */

// Mock dependencies
jest.mock('@notionhq/client');

const NotionClient = require('./client');
const NotionHelper = require('./helper');
const blocks = require('./blocks');

describe('Notion Client', () => {
  let notionClient;
  
  beforeEach(() => {
    notionClient = new NotionClient('test-api-key');
  });
  
  test('should initialize with API key', () => {
    expect(notionClient.client).toBeDefined();
  });
  
  test('should handle rate limits', async () => {
    // Mock implementation would go here
    expect(notionClient._handleRateLimits).toBeDefined();
  });
  
  test('should test connection', async () => {
    // Mock the client.users.me method
    notionClient._makeRequest = jest.fn().mockResolvedValue({ id: 'test-user' });
    
    const result = await notionClient.testConnection();
    expect(result).toBe(true);
  });
  
  test('should handle connection failure', async () => {
    // Mock the client.users.me method to throw an error
    notionClient._makeRequest = jest.fn().mockRejectedValue(new Error('API Error'));
    
    const result = await notionClient.testConnection();
    expect(result).toBe(false);
  });
});

describe('Notion Helper', () => {
  let notionHelper;
  let mockClient;
  
  beforeEach(() => {
    mockClient = {
      queryDatabase: jest.fn(),
      getBlockChildren: jest.fn()
    };
    notionHelper = new NotionHelper(mockClient);
  });
  
  test('should get all database items with pagination', async () => {
    // Mock first page of results
    mockClient.queryDatabase.mockResolvedValueOnce({
      results: [{ id: 'item1' }, { id: 'item2' }],
      has_more: true,
      next_cursor: 'cursor1'
    });
    
    // Mock second page of results
    mockClient.queryDatabase.mockResolvedValueOnce({
      results: [{ id: 'item3' }],
      has_more: false,
      next_cursor: null
    });
    
    const items = await notionHelper.getAllDatabaseItems('db-id');
    
    expect(items.length).toBe(3);
    expect(mockClient.queryDatabase).toHaveBeenCalledTimes(2);
    expect(items[0].id).toBe('item1');
    expect(items[2].id).toBe('item3');
  });
  
  test('should extract property values correctly', () => {
    const page = {
      properties: {
        Title: {
          title: [{ text: { content: 'Test Title' } }]
        },
        Tags: {
          multi_select: [{ name: 'tag1' }, { name: 'tag2' }]
        },
        Date: {
          date: { start: '2023-01-01' }
        }
      }
    };
    
    expect(notionHelper.getPropertyValue(page, 'Title', 'title')).toBe('Test Title');
    expect(notionHelper.getPropertyValue(page, 'Tags', 'multi_select')).toEqual(['tag1', 'tag2']);
    expect(notionHelper.getPropertyValue(page, 'Date', 'date')).toBe('2023-01-01');
    expect(notionHelper.getPropertyValue(page, 'NonExistent', 'title')).toBeNull();
  });
});

describe('Notion Blocks', () => {
  test('should create text block', () => {
    const block = blocks.createTextBlock('Test content');
    
    expect(block.type).toBe('paragraph');
    expect(block.paragraph.rich_text[0].text.content).toBe('Test content');
  });
  
  test('should create heading block', () => {
    const block = blocks.createHeadingBlock('Test heading', 2);
    
    expect(block.type).toBe('heading_2');
    expect(block.heading_2.rich_text[0].text.content).toBe('Test heading');
  });
  
  test('should create bulleted list item', () => {
    const block = blocks.createBulletedListItem('Test item');
    
    expect(block.type).toBe('bulleted_list_item');
    expect(block.bulleted_list_item.rich_text[0].text.content).toBe('Test item');
  });
  
  test('should create link block', () => {
    const block = blocks.createLinkBlock('https://example.com', 'Example');
    
    expect(block.type).toBe('bookmark');
    expect(block.bookmark.url).toBe('https://example.com');
    expect(block.bookmark.caption[0].text.content).toBe('Example');
  });
});
