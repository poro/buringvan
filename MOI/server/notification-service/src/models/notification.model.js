const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'content_approved',
      'content_rejected', 
      'content_published',
      'content_failed',
      'campaign_completed',
      'campaign_started',
      'analytics_report',
      'account_connected',
      'account_disconnected',
      'subscription_updated',
      'subscription_expired',
      'quota_warning',
      'quota_exceeded',
      'system_announcement',
      'security_alert'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  scheduledAt: {
    type: Date,
    index: true
  },
  sentAt: {
    type: Date,
    index: true
  },
  deliveredAt: {
    type: Date
  },
  readAt: {
    type: Date,
    index: true
  },
  clickedAt: {
    type: Date
  },
  deliveryAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lastAttemptAt: {
    type: Date
  },
  errorMessage: {
    type: String,
    maxlength: 500
  },
  metadata: {
    emailId: String,
    pushTokens: [String],
    smsId: String,
    campaignId: String,
    contentId: String,
    reportId: String,
    deviceInfo: {
      platform: String,
      version: String,
      deviceId: String
    }
  },
  preferences: {
    allowEmail: {
      type: Boolean,
      default: true
    },
    allowPush: {
      type: Boolean,
      default: true
    },
    allowSms: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledAt: 1 });
notificationSchema.index({ status: 1, priority: 1, createdAt: 1 });

// Virtual for read status
notificationSchema.virtual('isRead').get(function() {
  return !!this.readAt;
});

// Virtual for delivery status
notificationSchema.virtual('isDelivered').get(function() {
  return !!this.deliveredAt;
});

// Virtual for clicked status
notificationSchema.virtual('isClicked').get(function() {
  return !!this.clickedAt;
});

// Methods
notificationSchema.methods.markAsRead = function() {
  if (!this.readAt) {
    this.readAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.markAsClicked = function() {
  if (!this.clickedAt) {
    this.clickedAt = new Date();
  }
  if (!this.readAt) {
    this.readAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.lastAttemptAt = new Date();
  this.deliveryAttempts += 1;
  return this.save();
};

// Static methods
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    readAt: { $exists: false },
    status: { $in: ['sent', 'delivered'] }
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      userId,
      readAt: { $exists: false },
      status: { $in: ['sent', 'delivered'] }
    },
    {
      $set: { readAt: new Date() }
    }
  );
};

notificationSchema.statics.getRecentNotifications = function(userId, limit = 20) {
  return this.find({
    userId,
    status: { $in: ['sent', 'delivered'] }
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

notificationSchema.statics.cleanupOldNotifications = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['sent', 'delivered', 'failed'] }
  });
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set sentAt when status changes to sent
  if (this.isModified('status') && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  
  // Validate channels based on user preferences
  if (this.isNew && this.preferences) {
    this.channels = this.channels.filter(channel => {
      switch (channel) {
        case 'email':
          return this.preferences.allowEmail;
        case 'push':
          return this.preferences.allowPush;
        case 'sms':
          return this.preferences.allowSms;
        case 'in_app':
          return true; // Always allow in-app notifications
        default:
          return false;
      }
    });
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
