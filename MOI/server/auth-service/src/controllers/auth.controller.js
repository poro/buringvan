const authService = require('../services/authService');

class AuthController {
  // Register a new user
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const result = await authService.register({ email, password, firstName, lastName });
      
      // Set JWT cookie
      res.cookie('jwt', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        user: result.user,
        tokens: {
          accessToken: result.token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Login user
  async login(req, res) {
    // Development mode backdoor
    if (process.env.NODE_ENV === 'development') {
      // Return a fake user and token
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: 'dev-user-id',
            email: 'dev@example.com',
            firstName: 'Dev',
            lastName: 'User',
            role: 'admin',
            isEmailVerified: true,
            subscription: { status: 'active', plan: 'premium' }
          },
          token: 'dev-access-token',
          refreshToken: 'dev-refresh-token'
        }
      });
    }
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      // Set JWT cookie
      res.cookie('jwt', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      // Clear JWT cookie
      res.clearCookie('jwt');
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const result = await authService.getUserById(req.user._id);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }
      
      res.status(200).json({
        success: true,
        user: result.user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      
      const user = await authService.updateProfile(userId, updateData);
      
      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          user
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      
      const result = await authService.requestPasswordReset(email);
      
      // In production, send email with reset link
      // For now, we'll return the token (remove this in production)
      
      res.status(200).json({
        status: 'success',
        message: 'Password reset link sent to your email',
        ...(process.env.NODE_ENV === 'development' && { resetToken: result.resetToken })
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      
      const result = await authService.resetPassword(token, newPassword);
      
      // Set JWT cookie
      res.cookie('jwt', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        status: 'success',
        message: 'Password reset successfully',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      const result = await authService.verifyEmail(token);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Add social account
  async addSocialAccount(req, res) {
    try {
      const userId = req.user._id;
      const accountData = req.body;
      
      const result = await authService.addSocialAccount(userId, accountData);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Add social account error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Remove social account
  async removeSocialAccount(req, res) {
    try {
      const userId = req.user._id;
      const { platform, accountId } = req.params;
      
      const result = await authService.removeSocialAccount(userId, platform, accountId);
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Remove social account error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Deactivate account
  async deactivateAccount(req, res) {
    try {
      const userId = req.user._id;
      
      const result = await authService.deactivateAccount(userId);
      
      // Clear JWT cookie
      res.clearCookie('jwt');
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Check authentication status
  async checkAuth(req, res) {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          isAuthenticated: true,
          user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            isEmailVerified: req.user.isEmailVerified,
            subscription: req.user.subscription
          }
        }
      });
    } catch (error) {
      console.error('Check auth error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error checking authentication status'
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const result = await authService.refreshToken(refreshToken);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      res.status(200).json({
        success: true,
        accessToken: result.accessToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  // Google OAuth callback
  async googleCallback(req, res) {
    try {
      // User is authenticated via passport middleware
      const user = req.user;
      
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=authentication_failed`);
      }

      // Generate JWT tokens
      const tokens = user.generateAuthTokens();
      
      // Set JWT cookie
      res.cookie('jwt', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend with success
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?auth=success`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=authentication_failed`);
    }
  }
}

module.exports = new AuthController();
