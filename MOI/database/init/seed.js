// Seed data for AI-Powered Social Media Management System
// This script inserts initial data for development and testing

// Switch to the main database
db = db.getSiblingDB('social_media_ai');

// Insert notification templates
print('Inserting notification templates...');

const notificationTemplates = [
  // Content Approved Templates
  {
    type: 'content_approved',
    channel: 'in_app',
    template: {
      title: 'Content Approved',
      body: 'Your content "{{title}}" has been approved and is ready for scheduling.',
      action: {
        type: 'navigate',
        url: '/content/{{contentId}}'
      }
    },
    isActive: true
  },
  {
    type: 'content_approved',
    channel: 'email',
    template: {
      subject: 'Content Approved: {{title}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Content Approved ✅</h2>
          <p>Great news! Your content has been approved and is ready for publishing.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>{{title}}</h3>
            <p>{{description}}</p>
            <p><strong>Platforms:</strong> {{platforms}}</p>
          </div>
          <a href="{{baseUrl}}/content/{{contentId}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Content</a>
        </div>
      `
    },
    isActive: true
  },
  
  // Content Rejected Templates
  {
    type: 'content_rejected',
    channel: 'in_app',
    template: {
      title: 'Content Needs Revision',
      body: 'Your content "{{title}}" requires some changes. Check the feedback and resubmit.',
      action: {
        type: 'navigate',
        url: '/content/{{contentId}}'
      }
    },
    isActive: true
  },
  {
    type: 'content_rejected',
    channel: 'email',
    template: {
      subject: 'Content Revision Required: {{title}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">Content Revision Required 📝</h2>
          <p>Your content needs some adjustments before it can be published.</p>
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
            <h3>{{title}}</h3>
            <p><strong>Feedback:</strong> {{feedback}}</p>
            <p><strong>Suggested Changes:</strong> {{suggestions}}</p>
          </div>
          <a href="{{baseUrl}}/content/{{contentId}}" style="background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review & Edit</a>
        </div>
      `
    },
    isActive: true
  },

  // Content Published Templates
  {
    type: 'content_published',
    channel: 'in_app',
    template: {
      title: 'Content Published',
      body: 'Your content "{{title}}" has been successfully published to {{platforms}}.',
      action: {
        type: 'navigate',
        url: '/analytics/content/{{contentId}}'
      }
    },
    isActive: true
  },
  {
    type: 'content_published',
    channel: 'push',
    template: {
      title: 'Content Published Successfully! 🚀',
      body: '"{{title}}" is now live on {{platforms}}',
      data: {
        contentId: '{{contentId}}',
        platforms: '{{platforms}}'
      }
    },
    isActive: true
  },

  // Campaign Templates
  {
    type: 'campaign_started',
    channel: 'in_app',
    template: {
      title: 'Campaign Started',
      body: 'Your campaign "{{campaignName}}" has started and is now active.',
      action: {
        type: 'navigate',
        url: '/campaigns/{{campaignId}}'
      }
    },
    isActive: true
  },
  {
    type: 'campaign_completed',
    channel: 'email',
    template: {
      subject: 'Campaign Completed: {{campaignName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Campaign Completed Successfully! 🎉</h2>
          <p>Your campaign has finished running. Here's a quick summary:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>{{campaignName}}</h3>
            <p><strong>Duration:</strong> {{duration}} days</p>
            <p><strong>Content Published:</strong> {{contentCount}} posts</p>
            <p><strong>Total Engagement:</strong> {{totalEngagement}}</p>
          </div>
          <a href="{{baseUrl}}/campaigns/{{campaignId}}/report" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Report</a>
        </div>
      `
    },
    isActive: true
  },

  // Performance Report Templates
  {
    type: 'performance_report',
    channel: 'email',
    template: {
      subject: 'Weekly Performance Report - {{dateRange}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">Your Weekly Social Media Report 📊</h2>
          <p>Here's how your content performed this week:</p>
          
          <div style="display: flex; gap: 20px; margin: 20px 0;">
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; flex: 1; text-align: center;">
              <h3 style="margin: 0; color: #1976d2;">{{totalPosts}}</h3>
              <p style="margin: 5px 0; color: #666;">Posts Published</p>
            </div>
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; flex: 1; text-align: center;">
              <h3 style="margin: 0; color: #388e3c;">{{totalEngagement}}</h3>
              <p style="margin: 5px 0; color: #666;">Total Engagement</p>
            </div>
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; flex: 1; text-align: center;">
              <h3 style="margin: 0; color: #f57c00;">{{avgEngagementRate}}%</h3>
              <p style="margin: 5px 0; color: #666;">Avg. Engagement Rate</p>
            </div>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Top Performing Content:</h4>
            <ol>
              {{#each topContent}}
              <li><strong>{{title}}</strong> - {{engagement}} engagement</li>
              {{/each}}
            </ol>
          </div>

          <a href="{{baseUrl}}/analytics" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Detailed Analytics</a>
        </div>
      `
    },
    isActive: true
  },

  // System Alert Templates
  {
    type: 'system_alert',
    channel: 'in_app',
    template: {
      title: 'System Alert',
      body: '{{message}}',
      priority: 'high'
    },
    isActive: true
  },
  {
    type: 'system_alert',
    channel: 'email',
    template: {
      subject: 'System Alert: {{alertType}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">System Alert ⚠️</h2>
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p><strong>Alert Type:</strong> {{alertType}}</p>
            <p><strong>Message:</strong> {{message}}</p>
            <p><strong>Time:</strong> {{timestamp}}</p>
          </div>
          <p>Please log in to your account to review and take any necessary actions.</p>
          <a href="{{baseUrl}}/dashboard" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </div>
      `
    },
    isActive: true
  }
];

db.notificationtemplates.insertMany(notificationTemplates);
print(`Inserted ${notificationTemplates.length} notification templates`);

// Insert sample admin user
print('Creating sample admin user...');

const bcrypt = require('bcrypt');
const adminPassword = '$2b$10$rHhVzzr9OpNECBZoNR2ov.Tx3Ttz1GVqBF6B5S7KZWc8pZ6Z.QQKy'; // 'admin123'

const adminUser = {
  email: 'admin@socialmedia.ai',
  password: adminPassword,
  firstName: 'System',
  lastName: 'Administrator',
  role: 'admin',
  isEmailVerified: true,
  subscription: {
    plan: 'enterprise',
    status: 'active',
    startDate: new Date(),
    features: {
      maxSocialAccounts: -1, // unlimited
      maxContentPerMonth: -1, // unlimited
      aiContentGeneration: true,
      advancedAnalytics: true,
      teamCollaboration: true,
      customBranding: true
    }
  },
  preferences: {
    notifications: {
      email: true,
      push: true,
      sms: false,
      inApp: true
    },
    timezone: 'UTC',
    language: 'en'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

db.users.insertOne(adminUser);
print('Created admin user: admin@socialmedia.ai (password: admin123)');

// Insert sample free user
print('Creating sample free user...');

const userPassword = '$2b$10$X1fG8Bx9YrZUJB2QvNOhR.0RcP1Fb.aYqT9KhPX3Wa.7rJqVn1yXK'; // 'user123'

const sampleUser = {
  email: 'user@example.com',
  password: userPassword,
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  isEmailVerified: true,
  subscription: {
    plan: 'free',
    status: 'active',
    startDate: new Date(),
    features: {
      maxSocialAccounts: 3,
      maxContentPerMonth: 10,
      aiContentGeneration: true,
      advancedAnalytics: false,
      teamCollaboration: false,
      customBranding: false
    }
  },
  preferences: {
    notifications: {
      email: true,
      push: true,
      sms: false,
      inApp: true
    },
    timezone: 'America/New_York',
    language: 'en'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

db.users.insertOne(sampleUser);
print('Created sample user: user@example.com (password: user123)');

// Insert sample content templates for AI generation
print('Creating sample content templates...');

const contentTemplates = [
  {
    type: 'inspirational_quote',
    platforms: ['linkedin', 'twitter', 'instagram'],
    template: {
      structure: 'quote_with_reflection',
      elements: ['motivational_quote', 'personal_reflection', 'call_to_action'],
      hashtags: ['#Motivation', '#Success', '#Growth', '#Leadership']
    },
    isActive: true,
    createdAt: new Date()
  },
  {
    type: 'industry_insight',
    platforms: ['linkedin', 'twitter'],
    template: {
      structure: 'insight_with_data',
      elements: ['industry_statistic', 'analysis', 'prediction', 'call_to_action'],
      hashtags: ['#Industry', '#TechTrends', '#Business', '#Innovation']
    },
    isActive: true,
    createdAt: new Date()
  },
  {
    type: 'behind_the_scenes',
    platforms: ['instagram', 'tiktok'],
    template: {
      structure: 'story_based',
      elements: ['scene_description', 'process_explanation', 'team_highlight'],
      hashtags: ['#BehindTheScenes', '#TeamWork', '#Process', '#Authentic']
    },
    isActive: true,
    createdAt: new Date()
  },
  {
    type: 'educational_tip',
    platforms: ['linkedin', 'twitter', 'youtube'],
    template: {
      structure: 'tip_with_explanation',
      elements: ['problem_statement', 'solution_steps', 'pro_tip', 'resources'],
      hashtags: ['#Education', '#Tips', '#Learning', '#HowTo']
    },
    isActive: true,
    createdAt: new Date()
  }
];

db.createCollection('contenttemplates');
db.contenttemplates.insertMany(contentTemplates);
print(`Inserted ${contentTemplates.length} content templates for AI generation`);

// Create indexes for content templates
db.contenttemplates.createIndex({ type: 1 });
db.contenttemplates.createIndex({ platforms: 1 });
db.contenttemplates.createIndex({ isActive: 1 });

print('Database seeding completed successfully!');
print('Sample data includes:');
print('- Admin user: admin@socialmedia.ai (password: admin123)');
print('- Sample user: user@example.com (password: user123)');
print('- Notification templates for all channels');
print('- Content templates for AI generation');
print('Ready for development and testing!');
