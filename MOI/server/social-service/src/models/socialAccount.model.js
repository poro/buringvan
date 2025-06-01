const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'],
    index: true
  },
  platformId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  profileImage: {
    type: String
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  tokenExpiry: {
    type: Date
  },
  permissions: [{
    type: String
  }],
  accountMetrics: {
    followers: {
      type: Number,
      default: 0
    },
    following: {
      type: Number,
      default: 0
    },
    posts: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    autoPost: {
      type: Boolean,
      default: false
    },
    postTiming: {
      timezone: {
        type: String,
        default: 'UTC'
      },
      preferredTimes: [{
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        time: {
          type: String // Format: "HH:MM"
        }
      }]
    },
    contentFilters: {
      hashtags: {
        required: [String],
        forbidden: [String]
      },
      contentTypes: [{
        type: String,
        enum: ['text', 'image', 'video', 'carousel', 'story']
      }],
      autoHashtags: {
        type: Boolean,
        default: true
      }
    }
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'error'],
    default: 'active'
  },
  errorDetails: {
    lastError: String,
    errorCount: {
      type: Number,
      default: 0
    },
    lastErrorAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
socialAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });
socialAccountSchema.index({ platformId: 1, platform: 1 });
socialAccountSchema.index({ status: 1 });
socialAccountSchema.index({ tokenExpiry: 1 });

// Virtual for platform-specific URL
socialAccountSchema.virtual('profileUrl').get(function() {
  switch (this.platform) {
    case 'linkedin':
      return `https://linkedin.com/in/${this.username}`;
    case 'twitter':
      return `https://twitter.com/${this.username}`;
    case 'instagram':
      return `https://instagram.com/${this.username}`;
    case 'tiktok':
      return `https://tiktok.com/@${this.username}`;
    case 'youtube':
      return `https://youtube.com/@${this.username}`;
    default:
      return null;
  }
});

// Method to check if token needs refresh
socialAccountSchema.methods.needsTokenRefresh = function() {
  if (!this.tokenExpiry) return false;
  const now = new Date();
  const refreshThreshold = new Date(this.tokenExpiry.getTime() - (30 * 60 * 1000)); // 30 minutes before expiry
  return now >= refreshThreshold;
};

// Method to update account metrics
socialAccountSchema.methods.updateMetrics = function(metrics) {
  this.accountMetrics = {
    ...this.accountMetrics,
    ...metrics,
    lastUpdated: new Date()
  };
  return this.save();
};

// Method to log error
socialAccountSchema.methods.logError = function(error) {
  this.errorDetails.lastError = error.message || error;
  this.errorDetails.errorCount += 1;
  this.errorDetails.lastErrorAt = new Date();
  
  // Update status based on error count
  if (this.errorDetails.errorCount >= 5) {
    this.status = 'error';
  }
  
  return this.save();
};

// Method to clear errors
socialAccountSchema.methods.clearErrors = function() {
  this.errorDetails.lastError = undefined;
  this.errorDetails.errorCount = 0;
  this.errorDetails.lastErrorAt = undefined;
  this.status = 'active';
  return this.save();
};

// Pre-save middleware to encrypt tokens
socialAccountSchema.pre('save', function(next) {
  // In production, you should encrypt the access token and refresh token
  // For now, we'll just ensure they exist
  if (this.isModified('accessToken') && !this.accessToken) {
    return next(new Error('Access token is required'));
  }
  next();
});

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
