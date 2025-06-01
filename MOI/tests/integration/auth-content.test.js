const request = require('supertest');
const authApp = require('../../server/auth-service/src/app');
const contentApp = require('../../server/content-service/src/app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

describe('Auth-Content Integration', () => {
  let mongod;
  let authToken;
  let userId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    // Clear database
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Register and login user
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    };

    const registerResponse = await request(authApp)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  });

  describe('Authenticated Content Operations', () => {
    it('should create content with valid auth token', async () => {
      const contentData = {
        title: 'Test Content',
        content: 'This is test content',
        platforms: ['linkedin'],
        contentType: 'text'
      };

      const response = await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.content.title).toBe(contentData.title);
      expect(response.body.content.userId).toBe(userId);
    });

    it('should reject content creation without auth token', async () => {
      const contentData = {
        title: 'Test Content',
        content: 'This is test content',
        platforms: ['linkedin']
      };

      const response = await request(contentApp)
        .post('/api/content')
        .send(contentData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject content creation with invalid auth token', async () => {
      const contentData = {
        title: 'Test Content',
        content: 'This is test content',
        platforms: ['linkedin']
      };

      const response = await request(contentApp)
        .post('/api/content')
        .set('Authorization', 'Bearer invalid-token')
        .send(contentData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should get user content with valid auth token', async () => {
      // First create some content
      await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Content 1',
          content: 'Test content 1',
          platforms: ['linkedin']
        });

      await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Content 2',
          content: 'Test content 2',
          platforms: ['twitter']
        });

      // Get user content
      const response = await request(contentApp)
        .get('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.content).toHaveLength(2);
      expect(response.body.content[0].userId).toBe(userId);
      expect(response.body.content[1].userId).toBe(userId);
    });

    it('should only return content belonging to authenticated user', async () => {
      // Create second user
      const secondUserData = {
        email: 'user2@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const secondUserResponse = await request(authApp)
        .post('/api/auth/register')
        .send(secondUserData);

      const secondUserToken = secondUserResponse.body.tokens.accessToken;

      // Create content for first user
      await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'User 1 Content',
          content: 'Content by user 1',
          platforms: ['linkedin']
        });

      // Create content for second user
      await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          title: 'User 2 Content',
          content: 'Content by user 2',
          platforms: ['twitter']
        });

      // Get content for first user
      const firstUserContent = await request(contentApp)
        .get('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get content for second user
      const secondUserContent = await request(contentApp)
        .get('/api/content')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(firstUserContent.body.content).toHaveLength(1);
      expect(secondUserContent.body.content).toHaveLength(1);
      expect(firstUserContent.body.content[0].title).toBe('User 1 Content');
      expect(secondUserContent.body.content[0].title).toBe('User 2 Content');
    });
  });

  describe('Token Refresh Integration', () => {
    it('should accept new access token after refresh', async () => {
      // Register user and get refresh token
      const userData = {
        email: 'refresh@example.com',
        password: 'password123',
        firstName: 'Refresh',
        lastName: 'User'
      };

      const registerResponse = await request(authApp)
        .post('/api/auth/register')
        .send(userData);

      const refreshToken = registerResponse.body.tokens.refreshToken;

      // Refresh access token
      const refreshResponse = await request(authApp)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshResponse.body.accessToken;

      // Use new access token for content creation
      const contentData = {
        title: 'Content with refreshed token',
        content: 'This content uses refreshed token',
        platforms: ['linkedin']
      };

      const contentResponse = await request(contentApp)
        .post('/api/content')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(contentData)
        .expect(201);

      expect(contentResponse.body.success).toBe(true);
      expect(contentResponse.body.content.title).toBe(contentData.title);
    });
  });
});
