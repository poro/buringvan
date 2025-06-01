jest.mock('openai');
jest.mock('redis');

const OpenAI = require('openai');
const Redis = require('redis');

describe('AI Service', () => {
  let mockOpenAI;
  let mockRedis;
  let aiService;
  let Redis;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
    Redis = require('redis');
    mockRedis = {
      connect: jest.fn().mockResolvedValue(),
      get: jest.fn(),
      setEx: jest.fn(),
      disconnect: jest.fn()
    };
    Redis.createClient = jest.fn().mockReturnValue(mockRedis);
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    const OpenAI = require('openai');
    OpenAI.mockImplementation(() => mockOpenAI);
    aiService = require('../../src/services/ai.service');
  });

  describe('generateContent', () => {
    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            text: 'This is AI generated content for LinkedIn',
            hashtags: ['#AI', '#LinkedIn', '#Content'],
            title: 'AI Content Generation'
          })
        }
      }],
      usage: {
        total_tokens: 150
      }
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
      mockRedis.get.mockResolvedValue(null); // No cache hit
      mockRedis.setEx.mockResolvedValue('OK');
    });

    it('should generate content successfully', async () => {
      const prompt = 'test';
      const result = await aiService.generateContent(prompt, { platform: 'linkedin' });
      expect(result.text).toBe('This is AI generated content for LinkedIn');
      expect(result.hashtags).toEqual(['#AI', '#LinkedIn', '#Content']);
    });

    it('should return cached content when available', async () => {
      const cachedContent = {
        text: 'Cached AI content',
        hashtags: [],
        mentions: [],
        generatedAt: '2025-05-26T04:48:39.209Z'
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedContent));

      const result = await aiService.generateContent('test prompt');
      expect(result).toMatchObject({
        text: 'Cached AI content',
        hashtags: [],
        mentions: [],
        generatedAt: '2025-05-26T04:48:39.209Z'
      });
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should handle different platforms', async () => {
      const platforms = ['linkedin', 'twitter', 'instagram'];
      for (const platform of platforms) {
        await aiService.generateContent('test', { platform });
        expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: expect.stringContaining(platform) },
            { role: 'user', content: 'test' }
          ],
          temperature: 0.7,
          max_tokens: 500,
          presence_penalty: 0.6,
          frequency_penalty: 0.3
        });
      }
    });

    it('should handle API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'));
      await expect(aiService.generateContent('test prompt'))
        .rejects.toThrow('Failed to generate content: OpenAI API Error');
    });

    it('should set appropriate cache expiration', async () => {
      await aiService.generateContent('test prompt');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.any(String),
        3600, // 1 hour
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const mockResponse = {
        choices: [{ message: { content: JSON.stringify({ text: 'test' }) } }],
        usage: { total_tokens: 50 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      // Should still work even if Redis fails
      const result = await aiService.generateContent('test prompt');
      expect(result).toBeDefined();
    });

    it('should handle malformed OpenAI responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '' } }],
        usage: { total_tokens: 50 }
      });

      await expect(aiService.generateContent('test prompt'))
        .rejects.toThrow('Invalid response format: No text content found');
    });
  });
});