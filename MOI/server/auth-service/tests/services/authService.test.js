const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Auth Service', () => {
  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await authService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id');
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // First registration
      await authService.registerUser(userData);

      // Second registration with same email
      const result = await authService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const incompleteUserData = {
        email: 'test@example.com',
        password: 'password123',
        // Missing firstName and lastName
      };

      const result = await authService.registerUser(incompleteUserData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('required');
    });
  });

  describe('loginUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await testUser.save();
    });

    it('should login user with valid credentials', async () => {
      const result = await authService.loginUser('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should not login user with invalid email', async () => {
      const result = await authService.loginUser('wrong@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });

    it('should not login user with invalid password', async () => {
      const result = await authService.loginUser('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });

    it('should not login inactive user', async () => {
      testUser.status = 'inactive';
      await testUser.save();

      const result = await authService.loginUser('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Account is not active');
    });
  });

  describe('refreshToken', () => {
    let testUser, refreshToken;

    beforeEach(async () => {
      testUser = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await testUser.save();

      const tokens = testUser.generateAuthTokens();
      refreshToken = tokens.refreshToken;
      
      // Add refresh token to user
      testUser.refreshTokens.push({ token: refreshToken });
      await testUser.save();
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('should not refresh with invalid refresh token', async () => {
      const result = await authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid refresh token');
    });

    it('should not refresh with expired refresh token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1h' }
      );

      const result = await authService.refreshToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid refresh token');
    });
  });

  describe('logoutUser', () => {
    let testUser, refreshToken;

    beforeEach(async () => {
      testUser = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await testUser.save();

      const tokens = testUser.generateAuthTokens();
      refreshToken = tokens.refreshToken;
      
      testUser.refreshTokens.push({ token: refreshToken });
      await testUser.save();
    });

    it('should logout user and remove refresh token', async () => {
      const result = await authService.logoutUser(testUser._id, refreshToken);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Logged out successfully');

      // Verify refresh token is removed
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.refreshTokens).toHaveLength(0);
    });

    it('should handle logout with invalid refresh token', async () => {
      const result = await authService.logoutUser(testUser._id, 'invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid refresh token');
    });
  });

  describe('getUserById', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await testUser.save();
    });

    it('should get user by valid ID', async () => {
      const result = await authService.getUserById(testUser._id);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should not get user with invalid ID', async () => {
      const result = await authService.getUserById('invalid-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('User not found');
    });
  });
});
