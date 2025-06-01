// MongoDB initialization script for AI-Powered Social Media Management System
// This script creates the necessary databases, collections, and indexes

// Switch to the main database
db = db.getSiblingDB('social_media_ai');

// Create collections with validators and indexes

// Users collection (for auth service)
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 8
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin']
        },
        subscription: {
          bsonType: 'object',
          properties: {
            plan: {
              bsonType: 'string',
              enum: ['free', 'basic', 'pro', 'enterprise']
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'cancelled', 'past_due']
            }
          }
        }
      }
    }
  }
});

// Create indexes for users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'subscription.plan': 1 });
db.users.createIndex({ 'subscription.status': 1 });
db.users.createIndex({ createdAt: 1 });
db.users.createIndex({ lastLogin: 1 });

// Content collection (for content service)
db.createCollection('contents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'type', 'status', 'userId'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 200
        },
        type: {
          bsonType: 'string',
          enum: ['post', 'story', 'reel', 'video']
        },
        status: {
          bsonType: 'string',
          enum: ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published']
        },
        platforms: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
          }
        }
      }
    }
  }
});

// Create indexes for content
db.contents.createIndex({ userId: 1 });
db.contents.createIndex({ status: 1 });
db.contents.createIndex({ platforms: 1 });
db.contents.createIndex({ scheduledDate: 1 });
db.contents.createIndex({ createdAt: 1 });
db.contents.createIndex({ 'aiGenerated': 1 });

// Campaigns collection
db.createCollection('campaigns', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'status', 'userId'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100
        },
        status: {
          bsonType: 'string',
          enum: ['draft', 'active', 'paused', 'completed']
        }
      }
    }
  }
});

// Create indexes for campaigns
db.campaigns.createIndex({ userId: 1 });
db.campaigns.createIndex({ status: 1 });
db.campaigns.createIndex({ startDate: 1 });
db.campaigns.createIndex({ endDate: 1 });

// Social accounts collection (for social service)
db.createCollection('socialaccounts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'platform', 'accountId'],
      properties: {
        platform: {
          bsonType: 'string',
          enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
        },
        status: {
          bsonType: 'string',
          enum: ['connected', 'disconnected', 'expired', 'error']
        }
      }
    }
  }
});

// Create indexes for social accounts
db.socialaccounts.createIndex({ userId: 1 });
db.socialaccounts.createIndex({ platform: 1 });
db.socialaccounts.createIndex({ accountId: 1 });
db.socialaccounts.createIndex({ status: 1 });

// Posted content collection
db.createCollection('postedcontents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['contentId', 'socialAccountId', 'platform', 'status'],
      properties: {
        platform: {
          bsonType: 'string',
          enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
        },
        status: {
          bsonType: 'string',
          enum: ['posted', 'failed', 'deleted']
        }
      }
    }
  }
});

// Create indexes for posted content
db.postedcontents.createIndex({ contentId: 1 });
db.postedcontents.createIndex({ socialAccountId: 1 });
db.postedcontents.createIndex({ platform: 1 });
db.postedcontents.createIndex({ status: 1 });
db.postedcontents.createIndex({ postedAt: 1 });

// Analytics metrics collection (for analytics service)
db.createCollection('metrics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['contentId', 'platform', 'metricType', 'value', 'timestamp'],
      properties: {
        platform: {
          bsonType: 'string',
          enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']
        },
        metricType: {
          bsonType: 'string',
          enum: ['views', 'likes', 'shares', 'comments', 'clicks', 'impressions', 'reach', 'engagement_rate']
        },
        value: {
          bsonType: 'number',
          minimum: 0
        }
      }
    }
  }
});

// Create indexes for metrics
db.metrics.createIndex({ contentId: 1 });
db.metrics.createIndex({ platform: 1 });
db.metrics.createIndex({ metricType: 1 });
db.metrics.createIndex({ timestamp: 1 });
db.metrics.createIndex({ userId: 1 });

// Reports collection
db.createCollection('reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'type', 'period', 'data'],
      properties: {
        type: {
          bsonType: 'string',
          enum: ['performance', 'engagement', 'growth', 'custom']
        },
        period: {
          bsonType: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']
        }
      }
    }
  }
});

// Create indexes for reports
db.reports.createIndex({ userId: 1 });
db.reports.createIndex({ type: 1 });
db.reports.createIndex({ period: 1 });
db.reports.createIndex({ createdAt: 1 });

// Notifications collection (for notification service)
db.createCollection('notifications', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'type', 'channel', 'status'],
      properties: {
        type: {
          bsonType: 'string',
          enum: ['content_approved', 'content_rejected', 'content_published', 'campaign_started', 'campaign_completed', 'system_alert', 'performance_report']
        },
        channel: {
          bsonType: 'string',
          enum: ['in_app', 'email', 'push', 'sms']
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'sent', 'delivered', 'failed', 'read']
        }
      }
    }
  }
});

// Create indexes for notifications
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ channel: 1 });
db.notifications.createIndex({ status: 1 });
db.notifications.createIndex({ createdAt: 1 });
db.notifications.createIndex({ scheduledAt: 1 });

// Notification templates collection
db.createCollection('notificationtemplates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['type', 'channel', 'template'],
      properties: {
        type: {
          bsonType: 'string',
          enum: ['content_approved', 'content_rejected', 'content_published', 'campaign_started', 'campaign_completed', 'system_alert', 'performance_report']
        },
        channel: {
          bsonType: 'string',
          enum: ['in_app', 'email', 'push', 'sms']
        }
      }
    }
  }
});

// Create indexes for notification templates
db.notificationtemplates.createIndex({ type: 1, channel: 1 }, { unique: true });
db.notificationtemplates.createIndex({ isActive: 1 });

print('Database initialization completed successfully!');
print('Created collections: users, contents, campaigns, socialaccounts, postedcontents, metrics, reports, notifications, notificationtemplates');
print('Created indexes for optimal query performance');
print('Applied validation schemas for data integrity');
