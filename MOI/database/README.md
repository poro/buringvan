# Database Setup and Management

This directory contains database initialization and seeding scripts for the AI-Powered Social Media Management System.

## Overview

The system uses MongoDB as the primary database with the following collections:

### Core Collections

1. **users** - User accounts and subscription information
2. **contents** - Social media content and posts
3. **campaigns** - Marketing campaigns and content groupings
4. **socialaccounts** - Connected social media accounts
5. **postedcontents** - Published content tracking
6. **metrics** - Analytics and performance data
7. **reports** - Generated reports and insights
8. **notifications** - System notifications
9. **notificationtemplates** - Notification templates
10. **contenttemplates** - AI content generation templates

## Database Initialization

### Automatic Setup (Recommended)

The database will be automatically initialized when you start the services using Docker Compose:

```bash
# From the project root
docker-compose up -d
```

The initialization scripts will run automatically and create:
- Database structure with proper indexes
- Validation schemas for data integrity
- Sample data for development and testing

### Manual Setup

If you need to run the initialization manually:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017

# Run initialization script
load('/path/to/init.js')

# Run seeding script (optional)
load('/path/to/seed.js')
```

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String,
  lastName: String,
  role: String (enum: ['user', 'admin']),
  isEmailVerified: Boolean,
  subscription: {
    plan: String (enum: ['free', 'basic', 'pro', 'enterprise']),
    status: String (enum: ['active', 'inactive', 'cancelled', 'past_due']),
    startDate: Date,
    endDate: Date,
    features: Object
  },
  preferences: Object,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Contents Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (required),
  campaignId: ObjectId (optional),
  title: String (required),
  description: String,
  content: String,
  type: String (enum: ['post', 'story', 'reel', 'video']),
  status: String (enum: ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published']),
  platforms: [String] (enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']),
  scheduledDate: Date,
  media: [Object],
  aiGenerated: Boolean,
  aiPrompt: String,
  approvalNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Social Accounts Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (required),
  platform: String (enum: ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube']),
  accountId: String (required),
  accountName: String,
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  tokenExpiresAt: Date,
  status: String (enum: ['connected', 'disconnected', 'expired', 'error']),
  permissions: [String],
  lastSyncAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Metrics Collection

```javascript
{
  _id: ObjectId,
  contentId: ObjectId (required),
  userId: ObjectId (required),
  platform: String (required),
  metricType: String (enum: ['views', 'likes', 'shares', 'comments', 'clicks', 'impressions', 'reach', 'engagement_rate']),
  value: Number (required),
  timestamp: Date (required),
  metadata: Object,
  createdAt: Date
}
```

## Indexes

The initialization script creates the following indexes for optimal performance:

### Users
- `email` (unique)
- `subscription.plan`
- `subscription.status`
- `createdAt`
- `lastLogin`

### Contents
- `userId`
- `status`
- `platforms`
- `scheduledDate`
- `createdAt`
- `aiGenerated`

### Social Accounts
- `userId`
- `platform`
- `accountId`
- `status`

### Metrics
- `contentId`
- `platform`
- `metricType`
- `timestamp`
- `userId`

### Notifications
- `userId`
- `type`
- `channel`
- `status`
- `createdAt`
- `scheduledAt`

## Sample Data

The seeding script includes:

### Test Users
- **Admin User**: `admin@socialmedia.ai` (password: `admin123`)
  - Role: admin
  - Plan: enterprise
  - Full access to all features

- **Sample User**: `user@example.com` (password: `user123`)
  - Role: user
  - Plan: free
  - Limited features for testing

### Notification Templates
- Content approval/rejection notifications
- Campaign status updates
- Performance reports
- System alerts
- Multi-channel templates (email, push, SMS, in-app)

### Content Templates
- Inspirational quotes
- Industry insights
- Behind-the-scenes content
- Educational tips
- Platform-specific templates

## Data Validation

Each collection includes JSON Schema validation to ensure:
- Required fields are present
- Data types are correct
- Enum values are valid
- String lengths are within limits
- Email formats are valid

## Security Considerations

- Passwords are hashed using bcrypt with salt rounds
- Access tokens are encrypted before storage
- Sensitive data has appropriate field-level security
- Indexes support efficient querying without exposing sensitive data

## Backup and Recovery

### Backup
```bash
# Create backup
mongodump --db social_media_ai --out /backup/$(date +%Y%m%d_%H%M%S)

# Compressed backup
mongodump --db social_media_ai --gzip --archive=/backup/social_media_ai_$(date +%Y%m%d_%H%M%S).gz
```

### Restore
```bash
# Restore from backup
mongorestore --db social_media_ai /backup/20231201_120000/social_media_ai/

# Restore from compressed backup
mongorestore --db social_media_ai --gzip --archive=/backup/social_media_ai_20231201_120000.gz
```

## Monitoring

Monitor database performance using:
- MongoDB Compass for visual monitoring
- Built-in database profiler
- Application-level metrics
- Health check endpoints in each service

## Environment-Specific Configuration

### Development
- Relaxed validation rules
- Sample data included
- Debug logging enabled

### Production
- Strict validation
- No sample data
- Audit logging enabled
- Backup automation
- Read replicas for scaling

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check MongoDB is running
   docker-compose ps mongodb
   
   # View logs
   docker-compose logs mongodb
   ```

2. **Index Creation Failed**
   ```bash
   # Drop and recreate indexes
   db.collection.dropIndexes()
   load('init.js')
   ```

3. **Validation Errors**
   ```bash
   # Check document structure
   db.collection.findOne()
   
   # Validate against schema
   db.runCommand({collMod: "collection", validator: {...}})
   ```

4. **Performance Issues**
   ```bash
   # Check slow queries
   db.setProfilingLevel(2, {slowms: 100})
   db.system.profile.find()
   
   # Analyze query performance
   db.collection.find().explain("executionStats")
   ```

## Migration Scripts

For schema changes and data migrations, create scripts in the `migrations/` directory:

```javascript
// migrations/001_add_user_preferences.js
db.users.updateMany(
  { preferences: { $exists: false } },
  { $set: { preferences: { notifications: { email: true, push: true } } } }
);
```

Run migrations:
```bash
mongosh --eval "load('migrations/001_add_user_preferences.js')"
```
