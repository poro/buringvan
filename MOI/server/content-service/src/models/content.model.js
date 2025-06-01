const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['post', 'story', 'reel', 'short', 'carousel'],
    default: 'post',
    required: true
  },
  platforms: {
    type: [{
      type: String,
      enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
    }],
    required: [true, 'At least one platform is required'],
    validate: {
      validator: function(platforms) {
        return platforms && platforms.length > 0;
      },
      message: 'At least one platform must be specified'
    }
  },
  content: {
    text: {
      type: String,
      maxlength: [5000, 'Content text cannot exceed 5000 characters']
    },
    hashtags: [{
      type: String,
      trim: true,
      validate: {
        validator: function(hashtag) {
          return /^#[a-zA-Z0-9_]+$/.test(hashtag);
        },
        message: 'Invalid hashtag format'
      }
    }],
    mentions: [{
      type: String,
      trim: true,
      validate: {
        validator: function(mention) {
          return /^@[a-zA-Z0-9_]+$/.test(mention);
        },
        message: 'Invalid mention format'
      }
    }],
    links: [{
      url: {
        type: String,
        validate: {
          validator: function(url) {
            return /^https?:\/\/.+/.test(url);
          },
          message: 'Invalid URL format'
        }
      },
      title: String,
      description: String
    }]
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    size: Number,
    duration: Number, // for videos
    dimensions: {
      width: Number,
      height: Number
    },
    altText: {
      type: String,
      maxlength: [500, 'Alt text cannot exceed 500 characters']
    },
    thumbnail: String, // for videos
    isProcessed: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived'],
    default: 'draft',
    index: true
  },
  scheduledFor: {
    type: Date,
    index: true
  },
  publishedAt: Date,
  timezone: {
    type: String,
    default: 'UTC'
  },
  aiGenerated: {
    type: Boolean,
    default: false,
    index: true
  },
  originalPrompt: {
    type: String,
    maxlength: [1000, 'Original prompt cannot exceed 1000 characters']
  },
  aiMetadata: {
    model: String,
    temperature: Number,
    tokens: Number,
    generatedAt: Date,
    version: String
  },
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      maxlength: [1000, 'Feedback comments cannot exceed 1000 characters']
    },
    approved: Boolean,
    approvedAt: Date,
    editsMade: [{
      field: String,
      oldValue: String,
      newValue: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    rejectionReason: String
  },
  analytics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    lastSyncedAt: Date
  },
  publishResults: [{
    platform: {
      type: String,
      enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
    },
    postId: String,
    url: String,
    publishedAt: Date,
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending'
    },
    error: String,
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryAt: Date
  }],
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: Number, // every N days/weeks/months
    daysOfWeek: [Number], // 0-6 for Sunday-Saturday
    endDate: Date
  },
  parentContentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  variations: [{
    platform: String,
    content: {
      text: String,
      hashtags: [String],
      mentions: [String]
    },
    media: [mongoose.Schema.Types.Mixed]
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
contentSchema.index({ userId: 1, status: 1 });
contentSchema.index({ scheduledFor: 1, status: 1 });
contentSchema.index({ createdAt: -1 });
contentSchema.index({ platforms: 1 });
contentSchema.index({ 'analytics.engagement': -1 });
contentSchema.index({ tags: 1 });

// Add virtual properties
contentSchema.virtual('engagementRate').get(function() {
  if (!this.analytics?.impressions) return 0;
  const totalInteractions = (this.analytics.likes || 0) + 
                          (this.analytics.comments || 0) + 
                          (this.analytics.shares || 0);
  return (totalInteractions / this.analytics.impressions) * 100;
});

contentSchema.virtual('totalInteractions').get(function() {
  return (this.analytics?.likes || 0) + 
         (this.analytics?.comments || 0) + 
         (this.analytics?.shares || 0);
});

// Pre-save middleware
contentSchema.pre('save', function(next) {
  // Update engagement score
  this.analytics.engagement = this.analytics.likes + this.analytics.comments + this.analytics.shares;
  
  // Set published timestamp if status changed to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Set archived timestamp if archived
  if (this.isModified('isArchived') && this.isArchived && !this.archivedAt) {
    this.archivedAt = new Date();
  }

  next();
});

// Static methods
contentSchema.statics.findByUser = function(userId, status = null) {
  const query = { userId, isArchived: false };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

contentSchema.statics.findScheduled = function() {
  return this.find({
    status: 'scheduled',
    scheduledFor: { $lte: new Date() },
    isArchived: false
  });
};

contentSchema.statics.findByPlatform = function(platform, status = null) {
  const query = { platforms: platform, isArchived: false };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// Instance methods
contentSchema.methods.approve = function() {
  this.status = 'approved';
  this.userFeedback.approved = true;
  this.userFeedback.approvedAt = new Date();
  return this.save();
};

contentSchema.methods.reject = function(reason) {
  this.status = 'draft';
  this.userFeedback.approved = false;
  this.userFeedback.rejectionReason = reason;
  return this.save();
};

contentSchema.methods.schedule = function(date, timezone = 'UTC') {
  this.status = 'scheduled';
  this.scheduledFor = date;
  this.timezone = timezone;
  return this.save();
};

contentSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Content', contentSchema);
