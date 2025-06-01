const mongoose = require('mongoose');

const postedContentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  socialAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialAccount',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
  },
  platformPostId: {
    type: String,
    required: true
  },
  postUrl: {
    type: String
  },
  content: {
    text: String,
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'gif']
      },
      url: String,
      platformUrl: String,
      duration: Number, // for videos
      dimensions: {
        width: Number,
        height: Number
      }
    }],
    hashtags: [String],
    mentions: [String],
    location: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  scheduling: {
    scheduledAt: Date,
    postedAt: {
      type: Date,
      default: Date.now
    },
    timezone: String
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    engagement: {
      rate: {
        type: Number,
        default: 0
      },
      score: {
        type: Number,
        default: 0
      }
    },
    reach: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['posting', 'posted', 'failed', 'deleted'],
    default: 'posting'
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed,
    occurredAt: Date
  },
  metadata: {
    apiVersion: String,
    postType: String, // native, story, reel, etc.
    originalFormat: String,
    processedFormat: String,
    fileSize: Number,
    duration: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
postedContentSchema.index({ userId: 1, platform: 1 });
postedContentSchema.index({ contentId: 1 });
postedContentSchema.index({ platformPostId: 1, platform: 1 }, { unique: true });
postedContentSchema.index({ 'scheduling.postedAt': -1 });
postedContentSchema.index({ status: 1 });
postedContentSchema.index({ 'analytics.lastUpdated': 1 });

// Virtual for engagement calculation
postedContentSchema.virtual('engagementMetrics').get(function() {
  const total = this.analytics.likes + this.analytics.comments + this.analytics.shares;
  const views = this.analytics.views || this.analytics.impressions || 1;
  
  return {
    total,
    rate: (total / views) * 100,
    likesPercentage: views > 0 ? (this.analytics.likes / views) * 100 : 0,
    commentsPercentage: views > 0 ? (this.analytics.comments / views) * 100 : 0,
    sharesPercentage: views > 0 ? (this.analytics.shares / views) * 100 : 0
  };
});

// Method to update analytics
postedContentSchema.methods.updateAnalytics = function(newAnalytics) {
  Object.assign(this.analytics, newAnalytics, {
    lastUpdated: new Date()
  });
  
  // Calculate engagement rate
  const total = this.analytics.likes + this.analytics.comments + this.analytics.shares;
  const views = this.analytics.views || this.analytics.impressions || 1;
  this.analytics.engagement.rate = (total / views) * 100;
  
  // Calculate engagement score (weighted)
  this.analytics.engagement.score = 
    (this.analytics.likes * 1) + 
    (this.analytics.comments * 3) + 
    (this.analytics.shares * 5) + 
    (this.analytics.clicks * 2);
  
  return this.save();
};

// Method to mark as failed
postedContentSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message || error,
    code: error.code,
    details: error.details,
    occurredAt: new Date()
  };
  return this.save();
};

// Method to mark as posted
postedContentSchema.methods.markAsPosted = function(platformData) {
  this.status = 'posted';
  this.platformPostId = platformData.id;
  this.postUrl = platformData.url;
  this.scheduling.postedAt = new Date();
  this.error = undefined;
  return this.save();
};

// Static method to get analytics summary
postedContentSchema.statics.getAnalyticsSummary = function(userId, platform, dateRange) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: 'posted'
  };
  
  if (platform) {
    matchStage.platform = platform;
  }
  
  if (dateRange) {
    matchStage['scheduling.postedAt'] = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$platform',
        totalPosts: { $sum: 1 },
        totalViews: { $sum: '$analytics.views' },
        totalLikes: { $sum: '$analytics.likes' },
        totalComments: { $sum: '$analytics.comments' },
        totalShares: { $sum: '$analytics.shares' },
        totalClicks: { $sum: '$analytics.clicks' },
        totalReach: { $sum: '$analytics.reach' },
        totalImpressions: { $sum: '$analytics.impressions' },
        avgEngagementRate: { $avg: '$analytics.engagement.rate' },
        avgEngagementScore: { $avg: '$analytics.engagement.score' }
      }
    },
    {
      $project: {
        platform: '$_id',
        _id: 0,
        totalPosts: 1,
        totalViews: 1,
        totalLikes: 1,
        totalComments: 1,
        totalShares: 1,
        totalClicks: 1,
        totalReach: 1,
        totalImpressions: 1,
        avgEngagementRate: { $round: ['$avgEngagementRate', 2] },
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        totalEngagement: {
          $add: ['$totalLikes', '$totalComments', '$totalShares']
        }
      }
    }
  ]);
};

module.exports = mongoose.model('PostedContent', postedContentSchema);
