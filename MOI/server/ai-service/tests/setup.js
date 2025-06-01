// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Mock OpenAI
jest.mock('openai');

// Global test timeout
jest.setTimeout(10000);
