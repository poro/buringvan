const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'custom', 'campaign'],
    index: true
  },
  format: {
    type: String,
    required: true,
    enum: ['pdf', 'excel', 'csv', 'json'],
    default: 'pdf'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  scheduledFor: {
    type: Date,
    index: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  filters: {
    platforms: [{
      type: String,
      enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
    }],
    metricTypes: [{
      type: String,
      enum: [
        'impressions',
        'reach',
        'engagement',
        'likes',
        'comments',
        'shares',
        'saves',
        'clicks',
        'views',
        'followers_gained',
        'followers_lost',
        'profile_visits'
      ]
    }],
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    campaigns: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    contentIds: [{
      type: mongoose.Schema.Types.ObjectId
    }]
  },
  template: {
    includeSummary: {
      type: Boolean,
      default: true
    },
    includeCharts: {
      type: Boolean,
      default: true
    },
    includeComparisons: {
      type: Boolean,
      default: true
    },
    includeRecommendations: {
      type: Boolean,
      default: false
    },
    sections: [{
      type: String,
      enum: [
        'overview',
        'platform_performance',
        'content_performance',
        'engagement_analysis',
        'audience_insights',
        'growth_metrics',
        'recommendations'
      ]
    }],
    branding: {
      logo: String,
      colors: {
        primary: String,
        secondary: String
      },
      companyName: String
    }
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fileUrl: {
    type: String
  },
  fileSize: {
    type: Number
  },
  generatedAt: {
    type: Date
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  sharedWith: [{
    email: {
      type: String,
      required: true
    },
    accessLevel: {
      type: String,
      enum: ['view', 'download'],
      default: 'view'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  errorMessage: {
    type: String
  },
  processingTime: {
    type: Number // in milliseconds
  },
  nextRunDate: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
reportSchema.index({ userId: 1, type: 1, createdAt: -1 });
reportSchema.index({ userId: 1, status: 1, scheduledFor: 1 });
reportSchema.index({ isRecurring: 1, nextRunDate: 1, status: 1 });

// Virtual for download URL
reportSchema.virtual('downloadUrl').get(function() {
  if (this.fileUrl) {
    return `${process.env.API_BASE_URL}/api/analytics/reports/${this._id}/download`;
  }
  return null;
});

// Method to calculate next run date for recurring reports
reportSchema.methods.calculateNextRunDate = function() {
  if (!this.isRecurring || !this.recurringPattern.frequency) {
    return null;
  }

  const now = new Date();
  const { frequency, interval, dayOfWeek, dayOfMonth } = this.recurringPattern;
  let nextDate = new Date(now);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      const daysUntilTarget = (dayOfWeek - nextDate.getDay() + 7) % 7;
      nextDate.setDate(nextDate.getDate() + daysUntilTarget + (interval - 1) * 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      if (dayOfMonth) {
        nextDate.setDate(dayOfMonth);
      }
      break;
  }

  return nextDate;
};

// Static method to get pending reports
reportSchema.statics.getPendingReports = function() {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }).sort({ scheduledFor: 1 });
};

// Static method to get user's reports with pagination
reportSchema.statics.getUserReports = function(userId, page = 1, limit = 10, type = null) {
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  if (type) query.type = type;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

module.exports = mongoose.model('Report', reportSchema);
