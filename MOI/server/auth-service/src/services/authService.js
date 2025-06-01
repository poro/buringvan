const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  /**
   * Register a new user
   */
  async registerUser(userData) {
    try {
      const { username, email, password, firstName, lastName } = userData;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return {
          success: false,
          message: 'All fields are required (email, password, firstName, lastName)'
        };
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, ...(username ? [{ username }] : [])]
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return {
            success: false,
            message: 'User with this email already exists'
          };
        }
        if (existingUser.username === username) {
          return {
            success: false,
            message: 'Username already taken'
          };
        }
      }

      // Create new user
      const user = new User({
        username: username || email.split('@')[0],
        email,
        password,
        firstName,
        lastName
      });

      await user.save();
      
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateAuthToken(); // In real app, this would be different
      
      return {
        success: true,
        user: user.toPublicJSON(),
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Login user
   */
  async loginUser(email, password) {
    try {
      const user = await User.findByCredentials(email, password);
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateAuthToken(); // In real app, this would be different
      
      return {
        success: true,
        user: user.toPublicJSON(),
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Check if refresh token exists in user's refreshTokens array
      const tokenExists = user.refreshTokens.some(tokenObj => tokenObj.token === refreshToken);
      if (!tokenExists) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      const newAccessToken = user.generateAuthToken();
      
      return {
        success: true,
        accessToken: newAccessToken
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }
  }

  /**
   * Logout user
   */
  async logoutUser(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Remove the specific refresh token
      const tokenIndex = user.refreshTokens.findIndex(tokenObj => tokenObj.token === refreshToken);
      if (tokenIndex === -1) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      user.refreshTokens.splice(tokenIndex, 1);
      await user.save();

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      return {
        success: true,
        user: user.toPublicJSON()
      };
    } catch (error) {
      return {
        success: false,
        message: 'User not found'
      };
    }
  }

  // Legacy methods for backward compatibility
  /**
   * Register a new user (legacy method)
   */
  async register(userData) {
    return this.registerUser(userData);
  }

  /**
   * Login user (legacy method)
   */
  async login(email, password) {
    return this.loginUser(email, password);
  }

  /**
   * Alias for registerUser for controller compatibility
   */
  async register(userData) {
    const result = await this.registerUser(userData);
    if (result.success) {
      return {
        user: result.user,
        token: result.tokens.accessToken
      };
    } else {
      throw new Error(result.message);
    }
  }

  /**
   * Alias for loginUser for controller compatibility
   */
  async login(email, password) {
    const result = await this.loginUser(email, password);
    if (result.success) {
      return {
        user: result.user,
        token: result.tokens.accessToken
      };
    } else {
      throw new Error(result.message);
    }
  }
}

module.exports = new AuthService();
