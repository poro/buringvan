const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube'],
    index: true
  },
  postId: {
    type: String,
    index: true
  },
  metricType: {
    type: String,
    required: true,
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
    ],
    index: true
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  previousValue: {
    type: Number,
    default: 0
  },
  change: {
    type: Number,
    default: 0
  },
  changePercentage: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  hourOfDay: {
    type: Number,
    min: 0,
    max: 23,
    index: true
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
metricSchema.index({ userId: 1, platform: 1, date: -1 });
metricSchema.index({ userId: 1, metricType: 1, date: -1 });
metricSchema.index({ contentId: 1, metricType: 1, date: -1 });
metricSchema.index({ campaignId: 1, metricType: 1, date: -1 });
metricSchema.index({ platform: 1, metricType: 1, date: -1 });

// Pre-save middleware to calculate hour and day
metricSchema.pre('save', function(next) {
  if (this.date) {
    this.hourOfDay = this.date.getHours();
    this.dayOfWeek = this.date.getDay();
  }
  
  // Calculate change and percentage
  if (this.previousValue !== undefined) {
    this.change = this.value - this.previousValue;
    if (this.previousValue > 0) {
      this.changePercentage = (this.change / this.previousValue) * 100;
    }
  }
  
  next();
});

// Static methods for aggregations
metricSchema.statics.getMetricsByDateRange = function(userId, startDate, endDate, platform = null, metricType = null) {
  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (platform) match.platform = platform;
  if (metricType) match.metricType = metricType;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          platform: '$platform',
          metricType: '$metricType',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        maxValue: { $max: '$value' },
        minValue: { $min: '$value' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

metricSchema.statics.getPlatformSummary = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          platform: '$platform',
          metricType: '$metricType'
        },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        maxValue: { $max: '$value' },
        latestValue: { $last: '$value' }
      }
    },
    {
      $group: {
        _id: '$_id.platform',
        metrics: {
          $push: {
            type: '$_id.metricType',
            total: '$totalValue',
            average: '$avgValue',
            max: '$maxValue',
            latest: '$latestValue'
          }
        }
      }
    }
  ]);
};

metricSchema.statics.getEngagementRate = function(userId, contentId = null, platform = null, startDate, endDate) {
  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate, $lte: endDate },
    metricType: { $in: ['engagement', 'impressions'] }
  };
  
  if (contentId) match.contentId = new mongoose.Types.ObjectId(contentId);
  if (platform) match.platform = platform;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          contentId: '$contentId',
          platform: '$platform'
        },
        engagement: {
          $sum: {
            $cond: [{ $eq: ['$metricType', 'engagement'] }, '$value', 0]
          }
        },
        impressions: {
          $sum: {
            $cond: [{ $eq: ['$metricType', 'impressions'] }, '$value', 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        engagement: 1,
        impressions: 1,
        engagementRate: {
          $cond: [
            { $gt: ['$impressions', 0] },
            { $multiply: [{ $divide: ['$engagement', '$impressions'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Metric', metricSchema);
