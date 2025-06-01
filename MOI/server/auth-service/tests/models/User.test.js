const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.isEmailVerified).toBe(false);
      expect(savedUser.role).toBe('user');
      expect(savedUser.status).toBe('active');
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = new User(userData);
      await user.save();

      const isValidPassword = await bcrypt.compare('password123', user.password);
      expect(isValidPassword).toBe(true);
    });

    it('should not create user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should not create user with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should not create user with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await user.save();
    });

    it('should compare password correctly', async () => {
      const isValid = await user.comparePassword('password123');
      expect(isValid).toBe(true);

      const isInvalid = await user.comparePassword('wrongpassword');
      expect(isInvalid).toBe(false);
    });

    it('should generate auth tokens', () => {
      const tokens = user.generateAuthTokens();
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should convert to JSON without sensitive fields', () => {
      const userJSON = user.toJSON();
      
      expect(userJSON).not.toHaveProperty('password');
      expect(userJSON).not.toHaveProperty('refreshTokens');
      expect(userJSON).toHaveProperty('id');
      expect(userJSON).toHaveProperty('email');
      expect(userJSON).toHaveProperty('firstName');
      expect(userJSON).toHaveProperty('lastName');
    });
  });

  describe('User Validation', () => {
    it('should require email', async () => {
      const user = new User({
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow('email');
    });

    it('should require password', async () => {
      const user = new User({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow('password');
    });

    it('should require firstName', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        lastName: 'Doe',
      });

      await expect(user.save()).rejects.toThrow('firstName');
    });

    it('should require lastName', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
      });

      await expect(user.save()).rejects.toThrow('lastName');
    });
  });
});
