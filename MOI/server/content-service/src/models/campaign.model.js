const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    maxlength: [100, 'Campaign name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Campaign description cannot exceed 500 characters']
  },
  theme: {
    type: String,
    required: [true, 'Campaign theme is required'],
    trim: true
  },
  platforms: [{
    type: String,
    enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'],
    required: true
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  contentCount: {
    planned: { type: Number, default: 0 },
    generated: { type: Number, default: 0 },
    approved: { type: Number, default: 0 },
    published: { type: Number, default: 0 }
  },
  postingSchedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'weekly'
    },
    timesPerWeek: Number,
    preferredTimes: [{
      day: {
        type: Number,
        min: 0,
        max: 6 // 0 = Sunday, 6 = Saturday
      },
      time: String // HH:MM format
    }],
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  contentGuidelines: {
    tone: {
      type: String,
      enum: ['professional', 'casual', 'creative', 'educational', 'inspirational'],
      default: 'professional'
    },
    style: [String], // funny, serious, informative, etc.
    topics: [String],
    hashtags: [String],
    mentions: [String],
    doNotUse: [String] // words/phrases to avoid
  },
  analytics: {
    totalReach: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    averageEngagementRate: { type: Number, default: 0 },
    topPerformingPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    platformBreakdown: [{
      platform: String,
      posts: Number,
      reach: Number,
      engagement: Number
    }]
  },
  budget: {
    total: Number,
    spent: { type: Number, default: 0 },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
campaignSchema.index({ userId: 1, status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ platforms: 1 });

// Virtuals
campaignSchema.virtual('duration').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

campaignSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
});

campaignSchema.virtual('completionRate').get(function() {
  if (this.contentCount.planned === 0) return 0;
  return (this.contentCount.published / this.contentCount.planned) * 100;
});

// Static methods
campaignSchema.statics.findActive = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
    isArchived: false
  });
};

campaignSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isArchived: false }).sort({ createdAt: -1 });
};

// Instance methods
campaignSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

campaignSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

campaignSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

campaignSchema.methods.updateContentCount = async function() {
  const Content = require('./content.model');
  
  const counts = await Content.aggregate([
    { $match: { campaignId: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Reset counts
  this.contentCount.generated = 0;
  this.contentCount.approved = 0;
  this.contentCount.published = 0;

  counts.forEach(({ _id: status, count }) => {
    switch (status) {
      case 'draft':
      case 'pending_approval':
      case 'approved':
      case 'scheduled':
        this.contentCount.generated += count;
        if (status === 'approved' || status === 'scheduled') {
          this.contentCount.approved += count;
        }
        break;
      case 'published':
        this.contentCount.generated += count;
        this.contentCount.approved += count;
        this.contentCount.published += count;
        break;
    }
  });

  return this.save();
};

module.exports = mongoose.model('Campaign', campaignSchema);
