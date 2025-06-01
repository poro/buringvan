const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const crypto = require('crypto');

class AuthService {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  // Register new user
  async register(userData) {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create new user
    const user = new User({
      email,
      password,
      name
    });

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    // Generate JWT token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        subscription: user.subscription,
        preferences: user.preferences
      },
      token,
      verificationToken
    };
  }

  // Login user
  async login(email, password) {
    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        subscription: user.subscription,
        preferences: user.preferences,
        socialAccounts: user.socialAccounts
      },
      token
    };
  }

  // Get user by ID
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      subscription: user.subscription,
      preferences: user.preferences,
      socialAccounts: user.socialAccounts,
      lastLogin: user.lastLogin
    };
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const allowedUpdates = ['name', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      subscription: user.subscription,
      preferences: user.preferences,
      socialAccounts: user.socialAccounts
    };
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  // Request password reset
  async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('No user found with this email address');
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    return { resetToken };
  }

  // Reset password
  async resetPassword(token, newPassword) {
    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate new JWT token
    const jwtToken = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: jwtToken
    };
  }

  // Verify email
  async verifyEmail(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return { message: 'Email verified successfully' };
  }

  // Add social account
  async addSocialAccount(userId, accountData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if account already exists
    const existingAccount = user.socialAccounts.find(
      account => account.platform === accountData.platform && 
                account.accountId === accountData.accountId
    );

    if (existingAccount) {
      // Update existing account
      existingAccount.accessToken = accountData.accessToken;
      existingAccount.refreshToken = accountData.refreshToken;
      existingAccount.tokenExpires = accountData.tokenExpires;
      existingAccount.isActive = true;
      existingAccount.lastSync = new Date();
    } else {
      // Add new account
      user.socialAccounts.push({
        platform: accountData.platform,
        accountId: accountData.accountId,
        username: accountData.username,
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        tokenExpires: accountData.tokenExpires,
        permissions: accountData.permissions || []
      });
    }

    await user.save();
    return { message: 'Social account added successfully' };
  }

  // Remove social account
  async removeSocialAccount(userId, platform, accountId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.socialAccounts = user.socialAccounts.filter(
      account => !(account.platform === platform && account.accountId === accountId)
    );

    await user.save();
    return { message: 'Social account removed successfully' };
  }

  // Deactivate user account
  async deactivateAccount(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'Account deactivated successfully' };
  }
}

module.exports = new AuthService();
